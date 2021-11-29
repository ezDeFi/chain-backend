const _ = require('lodash')
const fetch = require('node-fetch')

const TOPIC_TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

function createIndexedLogsFetcher(indexerAPI, config) {
    const getLogs = async (filter) => {
        const MAX_RETRIES = 8
        const range = filter.toBlock - filter.fromBlock + 1
        for (let i = 0; i < MAX_RETRIES; ++i) {
            try {
                if (filter.topics[0] == TOPIC_TRANSFER && range > 512) {
                    throw { code: 'TOO GENERIC' }
                }
                console.log('fetching range', filter.fromBlock, isNaN(range) ? '' : `+${range}`)
                const provider = config.getProvider()
                const logs = await provider.getLogs(filter)
                return logs
            } catch (err) {
                if (!['TIMEOUT', 'TOO GENERIC', 'SERVER_ERROR'].includes(err.code)) {
                    console.error(err)
                }
                if (filter.toBlock == filter.fromBlock) {
                    // can't be splitted, retry
                    continue
                }
                const mid = (filter.fromBlock + filter.toBlock) >> 1
                return _.flatten([
                    await getLogs({ ...filter, toBlock: mid }),
                    await getLogs({ ...filter, fromBlock: mid + 1 }),
                ])
            }
        }
        console.error('out of retry', filter)
        throw new Error('out of retry')
    }

    return {
        fetchLogs: async (filters) => {
            const res = await fetch(indexerAPI + '/api/bloom/search/38', {
                method: 'POST',
                body: JSON.stringify(filters),
                headers: { 'Content-Type': 'application/json' }
            }).then(res => res.json());
        
            if (res.error) {
                throw new Error(res.error)
            }
            if (res.status == 0) {
                throw new Error(res.message)
            }
            const ranges = res?.data
            const all = []
        
            for (const filter of filters) {
                for (const range of ranges) {
                    const f = {
                        fromBlock: _.max([range.from, filter.fromBlock]),
                        toBlock: _.min([range.from+range.range-1, filter.toBlock]), // range.range can be undefined
                        address: filter.address,
                        topics: filter.topics,
                    }
                    let logs = await getLogs(f)
                    if (filter.topicsLength != null) {
                        logs = logs.filter(log => filter.topicsLength == log.topics.length)
                    }
                    console.log('found', logs.length)
                    all.push(...logs)
                }
            }
        
            return all
        }
    }
}

module.exports = createIndexedLogsFetcher