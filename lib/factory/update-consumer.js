const { filterLogs } = require('../ethers-log-filter')
const { diff } = require('jsondiffpatch')

function updateConsumer({key, filter, applyLogs, mongoose}) {
    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    let LogsStateModel = mongoose.model('LogsState')
    const processLogs = async ({ request, logs, fromBlock, toBlock, lastHead, head }) => {
        // TODO: handle synchronization

        // filter by input request
        logs = filterLogs(logs, request)

        const state = await LogsStateModel.findOne({ key }).lean() || {
            value: null,
            range: null,
        };
        // console.log('processLogs', {state, logs, fromBlock, toBlock, freshBlock})
        const oldState = {
            value: state.value,
            range: state.range,
        }
        const newState = {...oldState}
        try {
            // write ahead log for failed head update
            if (head && !state.range) {
                newState.range = lastHead
            }

            if (!state.range) {
                if (head) {
                    // write ahead log for failed head update
                    newState.range = lastHead
                } else {
                    throw new Error(`wrong logs range: need ${lastHead+1}, has ${fromBlock}`)
                }
            } else {
                if (newState.range+1 < fromBlock) {
                    throw new Error(`missing range ${newState.range+1}-${fromBlock}`)
                }
            }

            // if (Math.random() < 0.5) {
            //     throw new Error(`${key} is SCREWED`)
            // }

            // APPLY LOGS TO OLD VALUE
            newState.value = await applyLogs(oldState.value, logs)
            newState.range = toBlock

        } catch (err) {
            if (head) {
                console.error(`ERROR in ${key}.processLogs, tracking last synced block ${lastHead}`, err)
            } else {
                console.error(`ERROR in ${key}.processLogs, skip!`, err)
            }
        } finally {
            if (head && newState.range === toBlock) {
                newState.range = null
            }

            if (JSON.stringify(newState) == JSON.stringify(oldState)) {
                return // no data change
            }

            const delta = diff(oldState.value, newState.value)
            if (delta) {
                const changes = Object.keys(delta).length
                console.log(`update:${key} update db`, {changes})
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

        getRequests: async ({maxRange, lastHead, head}) => {
            const { address, topics } = filter
            const state = await LogsStateModel.findOne({ key }).lean() || {
                value: null,
                range: null,
            }
            const from = Math.max(state.range || lastHead, head ? head - maxRange : 0) + 1
            return { key, address, topics, from, processLogs }
        },
    }
}

module.exports = updateConsumer
