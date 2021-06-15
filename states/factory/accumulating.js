const { FRESH_BLOCK } = require('../../helpers/constants').getlogs
const LogsStateModel = require('../../models/LogsStateModel')

module.exports = ({key, filter, genesis, applyLogs}) => {

    const getNextFrom = (state) => {
        if (!state) {
            return genesis
        }
        if (state.block) {
            return state.block + 1
        }
        return undefined    // use FRESH_BLOCK
    }

    return {
        key,

        getRequests: async (maxRange) => {
            const state = await LogsStateModel.findOne({ key }).lean();
            const from = getNextFrom(state) || FRESH_BLOCK

            return {
                topics: filter.topics,
                from,
            }
        },

        processLogs: async ({ logs, fromBlock, toBlock, freshBlock }) => {
            try {
                const state = await LogsStateModel.findOne({ key }).lean();
                console.log('processLogs', {state})

                const { value: oldValue, block: oldBlock } = {...state}
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
                    (filter.address && log.address === filter.address) &&
                    !filter.topics.some((topic, i) => topic && log.topics[i] !== topic)
                )

                // APPLY LOGS TO OLD VALUE
                const value = await applyLogs(oldValue, logs)

                // up to head
                if (!freshBlock) {
                    if (!value) {
                        return // no change
                    }
                    var block = toBlock
                }

                return LogsStateModel.updateOne(
                    { key },
                    { value, block },
                    { upsert: true },
                );
            } catch (err) {
                if (!freshBlock) {
                    console.error(`ERROR in ${key}.processLogs, skip!`, err)
                    return
                }
                const block = freshBlock-1
                console.error(`ERROR in ${key}.processLogs, tracking last synced block ${block}`, err)
                return LogsStateModel.updateOne(
                    { key },
                    { block },
                    { upsert: true },
                );
            }
        }
    }
}
