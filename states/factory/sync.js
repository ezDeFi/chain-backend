const LogsStateModel = require('../../models/LogsStateModel')

module.exports = ({key, filter, genesis, applyLogs, rangeLimit}) => {
    const { address, topics } = filter

    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    return {
        key,

        getRequests: async (maxRange, lastHead) => {
            const state = await LogsStateModel.findOne({ key }).lean() || {
                value: null,
                range: {
                    lo: lastHead+1,
                    hi: lastHead,
                }
            }

            const lo = state.range.lo
            const hi = state.range.hi || lastHead
            const from = hi + 1
            const to = lo - 1

            const requests = [{ address, topics, from }]

            // crawl back is needed only when there's no value found in fresh blocks
            if (state.value == null) {
                maxRange = Math.min(maxRange, rangeLimit || Number.MAX_SAFE_INTEGER)
                const from = Math.max(to - maxRange, genesis || 0)
                if (from <= to) {
                    requests.push({ address, topics, from, to })
                }
            }

            return requests
        },

        processLogs: async ({ logs, fromBlock, toBlock, lastHead }) => {
            // TODO: also check isHead = freshBlock && toBlock < freshBlock 
            const state = await LogsStateModel.findOne({ key }).lean() || {
                range: {
                    lo: lastHead+1,
                    hi: lastHead,
                }
            }
            // console.log('processLogs', {state, logs, fromBlock, toBlock, lastHead})
            const oldState = {
                value: state.value,
                range: state.range,
            }
            const newState = {
                value: oldState.value,
                range: oldState.range,
            }
            try {
                if (lastHead) {
                    // write ahead log for failed head update
                    newState.range.hi = lastHead
                } else if (!state.range.hi) {
                    return // ignore head logs when we're out-dated
                }

                const lo = state.range.lo
                const hi = state.range.hi || lastHead
                const from = hi + 1
                const to = lo - 1

                if (lastHead) {
                    if (from < fromBlock) {
                        return  // missing head range
                    }
                    logs = logs.filter(log => from <= log.blockNumber)
                } else {
                    if (toBlock < to) {
                        return  // out of past range
                    }
                    logs = logs.filter(log => to >= log.blockNumber)
                }

                if (!!address) {
                    if (Array.isArray(address)) {
                        logs = logs.filter(log => address.includes(log.address))
                    } else {
                        logs = logs.filter(log => address === log.address)
                    }
                }

                logs = logs.filter(log => !topics.some((topic, i) => topic && log.topics[i] !== topic))

                // APPLY LOGS TO OLD VALUE
                newState.value = await applyLogs(oldState.value, logs)
                newState.range.lo = Math.min(lo, fromBlock)
                newState.range.hi = Math.max(hi, toBlock)

            } catch (err) {
                if (!lastHead) {
                    console.error(`ERROR in ${key}.processLogs, skip!`, err)
                } else {
                    console.error(`ERROR in ${key}.processLogs, tracking last synced block ${lastHead}`, err)
                }
            } finally {
                if (lastHead && newState.range.hi === toBlock) {
                    newState.range.hi = null
                }

                if (JSON.stringify(newState) == JSON.stringify(oldState)) {
                    return  // no change
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
