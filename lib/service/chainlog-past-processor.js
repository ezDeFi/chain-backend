const Bluebird = require('bluebird')
const _ = require('lodash')
const { capRequests, mergeRequests, partitionRequests, filterLogs } = require("../ethers-log-filter")
const { splitChunks, mergeUniqSortedLogs } = require("../util")

// Input
//  * config {ChainlogProcessorConfig}
//  * consumers {Array<Consumer>}
//  * mongoose {ChainBackendMongoose}
const chainlogPastProcessor = ({configs, consumers, mongoose, mongoosePrefix, logMinFreq, getBlockTimestamp}) => {
    const config = configs.partition    // past processor always use partition config
    const ConfigModel = mongoose.model((mongoosePrefix ?? '') + 'Config')

    return {
        // return number of milliseconds for the next call
        process: async () => {
            const lastHead = await ConfigModel.findOne({
                key: 'lastHead'
            }).lean().then(m => m && m.value);
    
            const fetcher = !!configs.partition.getProvider().etherscanConfig
            const concurrency = config.getConcurrency()
            const maxRange = fetcher ? Number.MAX_VALUE : concurrency * config.getSize()
            const consumerRequestsUnfiltered = await Bluebird.map(consumers,
                c => c.getRequests({maxRange, lastHead})
                .then(rr => _.filter(rr, r => r.from <= lastHead))
            )
            const requests = consumerRequestsUnfiltered.flat()
        
            if (!requests.length) {
                return 3000 // no more requests, wait for 3s
            }
    
            const fromBlock = _.minBy(requests, 'from')?.from
            const toBlock = _.min([fromBlock+maxRange-1, lastHead])

            console.log('---- PAST ' + (fetcher ? '(SCAN)' : '(PARTITION)'),
                { fromBlock, range: toBlock-fromBlock+1, behind: lastHead-toBlock }
            )

            // filter each consumer's requests and flatten again
            const consumerRequests = consumerRequestsUnfiltered.map(requests =>
                requests.filter(r => r.from <= toBlock && (!r.to || r.to >= fromBlock))
            )

            let logs = []
    
            if (fetcher) {
                const capped = capRequests({requests, fromBlock, toBlock})
                logs = await config.getLogs(capped)
            } else {
                // partition similar requests base on the same combination of address and each topic
                const parts = partitionRequests(consumerRequests.flat())
                const chunks = splitChunks(fromBlock, toBlock, concurrency)

                logs = await Bluebird.map(chunks, ({ fromBlock, toBlock }) => {
                    // partition similar requests base on the same combination of address and each topic
                    const merged = parts.map(requests => mergeRequests({requests, fromBlock, toBlock}))
                    return config.getLogs(merged)
                }).then(mergeUniqSortedLogs)
            }
    
            // group and sort by order
            const groups = _.chain(consumers)
                .groupBy(o => o.order ?? 0)
                .map((consumers, order) => ({order, consumers}))
                .sortBy('order')
                .value()
                .map(o => o.consumers)
    
            const requestsByKey = _.zipObject(consumers.map(c => c.key), consumerRequests)

            for (const consumers of groups) {
                await Bluebird.map(consumers, consumer => {
                    const requests = requestsByKey[consumer.key]
                    if (!requests || !requests.length) {
                        return
                    }

                    const consumerLogs = mergeUniqSortedLogs(_.map(requests, request => filterLogs(logs, request)))

                    console.log(`\t${fromBlock} +${toBlock-fromBlock+1} :${consumerLogs.length}\t${consumer.key}`)

                    return consumer.processLogs({ logs: consumerLogs, fromBlock, toBlock, lastHead, getBlockTimestamp })
                })
            }

            return 0
        },
    }
}

module.exports = chainlogPastProcessor
