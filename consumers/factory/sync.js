const LogsStateModel = require('../../models/LogsStateModel')
const { filterLogs } = require('../../helpers/logs')
const { diff } = require('jsondiffpatch')

module.exports = ({key, filter, genesis, applyLogs, rangeLimit}) => {
    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    const processLogs = async ({ request, logs, fromBlock, toBlock, lastHead, head }) => {
        // TODO: handle synchronization

        // filter by input request
        logs = filterLogs(logs, request)

        const state = await LogsStateModel.findOne({ key }).lean() || {
            range: {
                lo: lastHead+1,
                hi: lastHead,
            }
        }
        // console.log('processLogs', {state, logs, fromBlock, toBlock, lastHead})
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
            newState.value = await applyLogs(oldState.value, logs)
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

            const delta = diff(oldState.value, newState.value)
            const changes = Object.keys(delta).length
            console.log(`sync:${key} update db`, {changes})
            return LogsStateModel.updateOne(
                { key },
                newState,
                { upsert: true },
            );
        }
    }

    return {
        key,

        getRequests: async ({maxRange, lastHead}) => {
            const { address, topics } = filter

            const state = await LogsStateModel.findOne({ key }).lean() || {
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
        },
    }
}
