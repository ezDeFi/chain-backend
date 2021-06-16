const LogsStateModel = require('../../models/LogsStateModel')

module.exports = ({key, filter, genesis, applyLogs}) => {
    const { address, topics } = filter

    const getNextFrom = (state) => {
        if (!state || !state.value) {
            return genesis
        }
        if (state.range) {
            return state.range + 1
        }
        return
    }

    return {
        key,

        getRequests: async (maxRange, freshBlock) => {
            const state = await LogsStateModel.findOne({ key }).lean();
            const from = getNextFrom(state) || freshBlock
            return { address, topics, from }
        },

        processLogs: async ({ logs, fromBlock, toBlock, freshBlock }) => {
            const state = await LogsStateModel.findOne({ key }).lean() || {}
            // console.log('processLogs', {state, logs, fromBlock, toBlock, freshBlock})
            const oldState = {
                value: state.value,
                range: state.range,
            }
            const newState = {...oldState}
            try {
                if (freshBlock) {
                    // write ahead log for failed head update
                    newState.range = freshBlock - 1
                }

                if (!!oldState.range && oldState.range+1 < fromBlock) {
                    // throw new Error(`FATAL: ${key} missing block range: ${state.range}-${fromBlock}`)
                    return  // out of range
                }

                const from = getNextFrom(oldState) || freshBlock

                if (from == null) {  // ignore past crawling when we're up to head
                    return
                }
                if (from > fromBlock) {
                    return  // ignore head logs when we're out-dated
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
                if (!freshBlock) {
                    console.error(`ERROR in ${key}.processLogs, skip!`, err)
                } else {
                    console.error(`ERROR in ${key}.processLogs, tracking last synced block ${freshBlock-1}`, err)
                }
            } finally {
                if (JSON.stringify(newState.value) == JSON.stringify(oldState.value)) {
                    delete newState.value
                }

                if (freshBlock && newState.range === toBlock) {
                    newState.range = null
                }

                if (JSON.stringify(newState.range) == JSON.stringify(oldState.range)) {
                    delete newState.range
                }

                if (!Object.keys(newState).length) {
                    return
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
