const LogsStateModel = require('../../models/LogsStateModel')

module.exports = ({key, filter, genesis, applyLogs}) => {
    const { address, topics } = filter

    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    return {
        key,

        getRequests: async (maxRange, lastHead) => {
            const state = await LogsStateModel.findOne({ key }).lean() || {
                value: null,
                range: genesis-1,
            }
            const from = (state.range || lastHead) + 1
            return { address, topics, from }
        },

        processLogs: async ({ logs, fromBlock, toBlock, lastHead }) => {
            // TODO: also check isHead = freshBlock && toBlock < freshBlock 
            const state = await LogsStateModel.findOne({ key }).lean() || {
                value: null,
                range: genesis-1,
            };
            // console.log('processLogs', {state, logs, fromBlock, toBlock, freshBlock})
            const oldState = {
                value: state.value,
                range: state.range,
            }
            const newState = {...oldState}
            try {
                if (lastHead) {
                    // write ahead log for failed head update
                    if (!state.range) {
                        newState.range = lastHead
                    }
                } else if (!state.range) {
                    return // ignore head logs when we're out-dated
                }

                const from = (state.range || lastHead) + 1
                if (from < fromBlock) {
                    return  // out of range
                }

                if (!!address) {
                    if (Array.isArray(address)) {
                        logs = logs.filter(log => address.includes(log.address))
                    } else {
                        logs = logs.filter(log => address === log.address)
                    }
                }

                logs = logs
                    .filter(log => from <= log.blockNumber)
                    .filter(log => !topics.some((topic, i) => topic && log.topics[i] !== topic))

                // APPLY LOGS TO OLD VALUE
                newState.value = await applyLogs(oldState.value, logs)
                newState.range = toBlock

            } catch (err) {
                if (!lastHead) {
                    console.error(`ERROR in ${key}.processLogs, skip!`, err)
                } else {
                    console.error(`ERROR in ${key}.processLogs, tracking last synced block ${lastHead}`, err)
                }
            } finally {
                if (lastHead && newState.range === toBlock) {
                    newState.range = null
                }

                if (JSON.stringify(newState) == JSON.stringify(oldState)) {
                    return // no data change
                }

                console.error(`accumulating:${key} update db`, newState)
                return LogsStateModel.updateOne(
                    { key },
                    newState,
                    { upsert: true },
                );
            }
        }
    }
}
