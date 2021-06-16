const LogsStateModel = require('../../models/LogsStateModel')

module.exports = ({key, filter, genesis, applyLogs, rangeLimit}) => {
    const { address, topics } = filter

    return {
        key,

        getRequests: async (maxRange, freshBlock) => {
            const state = await LogsStateModel.findOne({ key }).lean();

            if (!state || !state.range) {
                var lo = freshBlock
                var hi = freshBlock-1
            } else {
                var { lo, hi } = state.range
            }

            const requests = [{
                address,
                topics,
                from: Math.max(hi + 1, genesis || 0),
            }]

            // crawl back is needed only when there's no value found in fresh blocks
            if (!state || !state.hasOwnProperty('value')) {
                if (rangeLimit) {
                    maxRange = Math.min(maxRange, rangeLimit)
                }

                const to = lo-1
                const from = Math.max(lo - maxRange, genesis || 0)

                if (from <= to) {
                    requests.push({
                        address,
                        topics,
                        from,
                        to,
                    })
                }
            }

            return requests
        },

        processLogs: async ({ logs, fromBlock, toBlock, freshBlock }) => {
            const state = await LogsStateModel.findOne({ key }).lean();
            // console.log('processLogs', {state, logs, fromBlock, toBlock, freshBlock})
            const { value: oldValue, range: oldRange } = {...state}
            const { lo, hi } = oldRange || {}
            try {
                if (!!lo && toBlock < lo-1) {
                    throw new Error(`FATAL: ${key} missing block range: ${toBlock}-${lo-1}`)
                }
                if (!!hi && hi+1 < fromBlock) {
                    throw new Error(`FATAL: ${key} missing block range: ${hi}-${fromBlock}`)
                }

                if (!!address) {
                    if (Array.isArray(address)) {
                        logs = logs.filter(log => address.includes(log.address))
                    } else {
                        logs = logs.filter(log => address === log.address)
                    }
                }

                logs = logs.filter(log => !topics.some((topic, i) => topic && log.topics[i] !== topic))

                const newState = {}

                if (freshBlock) {
                    let from = fromBlock
                    if (!!hi && hi+1 > fromBlock) {
                        from = hi+1
                    }

                    logs = logs.filter(log => from <= log.blockNumber)

                    if (hi) {
                        newState.range = { lo, hi: undefined }
                    }
                } else {
                    const to = Math.min(toBlock, lo-1)
                    logs = logs.filter(log => log.blockNumber <= to)

                    newState.range = { lo: fromBlock, hi }
                }

                // APPLY LOGS TO OLD VALUE
                const value = await applyLogs(oldValue, logs)

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
                console.error(`ERROR in ${key}.processLogs, tracking last synced block ${freshBlock-1}`, err)
                return LogsStateModel.updateOne(
                    { key },
                    { range: { lo, hi: freshBlock-1} },
                    { upsert: true },
                );
            }
        }
    }
}
