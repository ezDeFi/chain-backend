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
            const state = await LogsStateModel.findOne({ key }).lean() || {}
            // console.log('processLogs', {state, logs, fromBlock, toBlock, freshBlock})
            const oldState = {
                value: state.value,
                range: state.range,
            }
            const newState = {
                value: oldState.value,
                range: oldState.range || {},
            }
            try {
                if (freshBlock) {
                    // write ahead log for failed head update
                    newState.range.hi = freshBlock - 1
                }

                const { lo, hi } = newState.range
                if (!!lo && toBlock < lo-1) {
                    // throw new Error(`FATAL: ${key} missing block range: ${toBlock}-${lo-1}`)
                    return  // out of range
                }
                if (!!hi && hi+1 < fromBlock) {
                    // throw new Error(`FATAL: ${key} missing block range: ${hi}-${fromBlock}`)
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
                    .filter(log => log.blockNumber >= Math.max(fromBlock, (hi||0)+1))
                    .filter(log => log.blockNumber <= Math.min(toBlock, (lo||Number.MAX_SAFE_INTEGER)-1))
                    .filter(log => !topics.some((topic, i) => topic && log.topics[i] !== topic))

                // APPLY LOGS TO OLD VALUE
                newState.value = await applyLogs(oldState.value, logs)
                newState.range.lo = fromBlock
                newState.range.hi = toBlock

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

                if (freshBlock && newState.range.hi === toBlock) {
                    newState.range.hi = null
                }

                if (JSON.stringify(newState.range) == JSON.stringify(oldState.range)) {
                    delete newState.range
                }

                if (!Object.keys(newState).length) {
                    return
                }

                console.error(`sync:${key} update db`, newState)
                return LogsStateModel.updateOne(
                    { key },
                    newState,
                    { upsert: true },
                );
            }
        }
    }
}
