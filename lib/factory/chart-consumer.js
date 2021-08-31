const { diff } = require('jsondiffpatch')

// Input
//  * config {Object}
//  * config.key {String}
//  * config.filter {ethers.Contract.Filter}
//  * config.genesis {String} A number as string.
//  * config.applyLogs {applyLogsFunction}
//  * config.rangeLimit {Number}
//  * config.mongoose {ChainBackendMongoose}
//
// Output {Consumer}
function chartConsumer({key, filter, genesis, applyLogs, mongoose}) {
    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    const LogsStateModel = mongoose.model('LogsState')
    const size = 20

    const processLogs = async ({ logs, fromBlock, toBlock, lastHead, head }) => {

        const state = await LogsStateModel.findOne({ key }).lean() || {
            range: {
                lo: lastHead+1,
                hi: lastHead,
            }
        }
        // console.log('processLogs', {state, logs, fromBlock, toBlock, lastHead})
        const oldState = {
            value: state.value,
            range: {...state.range},
        }
        const newState = {
            value: oldState.value,
            range: {...oldState.range},
        }
        try {
            if (head) {
                if (!newState.range.hi) {
                    // write ahead log for failed head update
                    newState.range.hi = lastHead
                }

                if (newState.range.hi+1 < fromBlock) {
                    throw new Error(`missing head range ${newState.range.hi+1}-${fromBlock}`)
                }
            } else {
                if (toBlock < newState.range.lo-1) {
                    throw new Error(`missing past range ${toBlock}-${newState.range.lo-1}`)
                }
            }

            // if (Math.random() < 0.5) {
            //     throw new Error(`${key} is SCREWED`)
            // }

            // APPLY LOGS TO OLD VALUE
            newState.value = await applyLogs(oldState.value, logs)
            newState.range.lo = Math.min(state.range.lo, fromBlock)
            newState.range.hi = Math.max(state.range.hi || lastHead, toBlock)
        } catch (err) {
            if (head) {
                console.error(`ERROR in ${key}.processLogs, tracking last synced block ${lastHead}`, err)
            } else {
                console.error(`ERROR in ${key}.processLogs, skip!`, err)
            }
        } finally {
            if (head && newState.range.hi === toBlock) {
                newState.range.hi = null
            }

            if (JSON.stringify(newState) == JSON.stringify(oldState)) {
                return  // no change
            }

            const delta = diff(oldState.value, newState.value)
            if (delta) {
                const changes = Object.keys(delta).length
                console.log(`sync:${key} update db`, {changes})
            }
            return LogsStateModel.updateOne(
                { key },
                newState,
                { upsert: true },
            );
        }
    }

    return {
        key,
        processLogs,
        getRequests: async ({maxRange, lastHead}) => {
            const { address, topics } = filter

            const state = await LogsStateModel.findOne({ key }).lean() || {
                value: null,
                range: {
                    lo: lastHead-(lastHead%size),
                    hi: lastHead-(lastHead%size)-1,
                }
            }

            const hi = state.range.hi
            const from = hi + 1

            // assert(from === from-from%size)
            // assert(lo === lo-lo%size)

            // crawl forward when there's a full candle
            if (from+size-1 <= lastHead) {
                return [{ key, address, topics, from, to:from+size-1 }]
            }

            // crawl back is needed only when range.lo has not reached genesis
            if ((genesis || 0) < state.range.lo) {
                maxRange -= maxRange % size
                const to = state.range.lo - 1
                const from = Math.max(to-maxRange+1, genesis ? genesis-(genesis%size) : 0)
                if (from <= to) {
                    return[{ key, address, topics, from, to }]
                }
            }

            return []   // no requests
        },
    }
}

module.exports = chartConsumer
