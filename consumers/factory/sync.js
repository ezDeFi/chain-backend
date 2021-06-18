const { filterLogs } = require('../../helpers/logs')

// Descriptions
//  * Create a new consumer.
//
// Output {Object}
//  * key {String}
//  * getRequests {Function}
function syncConsumerFactory({key, filter, genesis, applyLogs, rangeLimit, mongodb}) {
    let logStateCollection = mongodb.logStateCollection

    async function processLogs({ request, logs, fromBlock, toBlock, lastHead, head }) {
        // TODO: handle synchronization

        let matchedLogs = filterLogs(logs, request)

        const state = await logStateCollection.findOne({key}) || {
            range: {
                lo: lastHead+1,
                hi: lastHead,
            }
        }
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
            newState.value = await applyLogs(oldState.value, matchedLogs)
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

            console.error(`sync:${key} update db`, newState)

            await logStateCollection.updateOne(
                { key },
                { $set: newState},
                { upsert: true },
            )
        }
    }

    // Output {Array<Object>}
    //  * [].key {String}
    //  * [].address {Array<String> || String}
    //  * [].topics {Array[4]}
    //  * [].from {Number}
    //  * [].to {Number}
    //  * [].processLogs {Function}
    async function getRequests({maxRange, lastHead}) {
        const { address, topics } = filter

        const state = await logStateCollection.findOne({key}) || {
            value: null,
            range: {
                lo: lastHead+1,
                hi: lastHead,
            }
        }

        const hi = state.range.hi || lastHead
        const from = hi + 1
        const requests = [{ key, address, topics, from, processLogs }]

        // crawl back is needed only when there's no value found in fresh blocks
        if (state.value == null) {
            maxRange = Math.min(maxRange, rangeLimit || Number.MAX_SAFE_INTEGER)
            const to = state.range.lo - 1
            const from = Math.max(to - maxRange, genesis || 0)
            if (from <= to) {
                requests.push({ key, address, topics, from, to, processLogs })
            }
        }

        return requests
    }

    return {
        key,
        getRequests
    }
}

module.exports = syncConsumerFactory
