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
                address: filter.address,
                topics: filter.topics,
                from,
            }
        },

        processLogs: async ({ logs, fromBlock, toBlock, freshBlock }) => {
            try {
                const state = await LogsStateModel.findOne({ key }).lean();
                // console.log('processLogs', {state, logs, fromBlock, toBlock, freshBlock})

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
                    (!filter.address || log.address === filter.address) &&
                    !filter.topics.some((topic, i) => topic && log.topics[i] !== topic)
                )

                // APPLY LOGS TO OLD VALUE
                const value = await applyLogs(oldValue, logs)

                const newState = {}

                if (!freshBlock) {
                    // always update state block in past sync
                    newState.block = toBlock
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
