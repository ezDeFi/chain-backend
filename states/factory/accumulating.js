const LogsStateModel = require('../../models/LogsStateModel')

module.exports = ({key, filter, genesis, applyLogs}) => {
    const { address, topics } = filter

    const getNextFrom = (state) => {
        if (!state) {
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
            try {
                const state = await LogsStateModel.findOne({ key }).lean();
                // console.log('processLogs', {state, logs, fromBlock, toBlock, freshBlock})

                const { value: oldValue, range: oldBlock } = {...state}
                if (!!oldBlock && oldBlock+1 < fromBlock) {
                    throw new Error(`FATAL: ${key} missing block range: ${oldBlock}-${fromBlock}`)
                }

                const from = getNextFrom(state) || freshBlock

                if (from == null) {  // ignore past crawling when we're up to head
                    return
                }
                if (from > fromBlock) {
                    return  // ignore head logs when we're out-dated
                }

                logs = logs.filter(log => 
                    from <= log.blockNumber &&
                    (!filter.address || log.address === filter.address) &&
                    !filter.topics.some((topic, i) => topic && log.topics[i] !== topic)
                )

                console.error('==============', {oldValue, logs})

                // APPLY LOGS TO OLD VALUE
                const value = await applyLogs(oldValue, logs)

                const newState = {}

                if (!freshBlock) {
                    // always update state block in past sync
                    newState.range = toBlock
                } else if (oldBlock) {
                    newState.range = undefined
                }

                if (JSON.stringify(value) != JSON.stringify(oldValue)) {
                    newState.value = value
                }

                if (Object.keys(newState).length == 0) {
                    // nothing to update
                    return
                }

                return LogsStateModel.updateOne(
                    { key },
                    newState,
                    { upsert: true },
                );
            } catch (err) {
                if (!freshBlock) {
                    console.error(`ERROR in ${key}.processLogs, skip!`, err)
                    return
                }
                const range = freshBlock-1
                console.error(`ERROR in ${key}.processLogs, tracking last synced block ${range}`, err)
                return LogsStateModel.updateOne(
                    { key },
                    { range },
                    { upsert: true },
                );
            }
        }
    }
}
