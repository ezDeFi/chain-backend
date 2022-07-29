const Bluebird = require('bluebird')
const _ = require('lodash')
const { capRequests, mergeRequests, partitionRequests, filterLogs } = require("../ethers-log-filter")
const { mergeUniqSortedLogs } = require('../util')

// Input
//  * config {ChainlogProcessorConfig}
//  * consumers {Array<Consumer>}
//  * mongoose {ChainBackendMongoose}
function chainlogHeadProcessor({configs, consumers, mongoose, mongoosePrefix, safeDepth}) {
    // rollback the lastHead
    // mongoose.model((mongoosePrefix ?? '') + 'Config').updateOne(
    //     { key: 'lastHead' },
    //     { value: 8000000 },
    //     { upsert: true },
    // ).then(console.log).catch(console.error)

    let ConfigModel = mongoose.model((mongoosePrefix ?? '') + 'Config')

    // return the last processed block number (lastHead)
    const process = async (head) => {
        let lastHead = await ConfigModel.findOne({
            key: 'lastHead'
        }).lean().then(m => m && m.value)

        if (!lastHead) {    // init the first sync
            lastHead = _.max([0, head-safeDepth-1])
            await ConfigModel.updateOne(
                { key: 'lastHead' },
                { value: lastHead },
                { upsert: true },
            )
        }

        if (head <= lastHead) {
            return lastHead // nothing to do
        }

        const isMerged = head <= lastHead + configs.merge.getSize()
        const config = isMerged ? configs.merge : configs.partition
        
        const safeBlock = head-safeDepth

        let maxRange = config.getSize()
        const fetcher = !!config.getProvider().etherscanConfig && safeBlock-lastHead > maxRange * 2
        if (fetcher) {
            maxRange = safeBlock-lastHead
        }

        const consumerRequests = await Bluebird.map(consumers,
            c => c.getRequests({ maxRange, lastHead, head })
            .then(rr => _.filter(rr, r => r.from > lastHead))
        )
        let requests = consumerRequests.flat()
    
        if (!requests.length) {
            // could be buggy for some strange consumer strategies
            await ConfigModel.updateOne(
                { key: 'lastHead' },
                { value: safeBlock },
                { upsert: true },
            )
            return safeBlock
        }

        let logs = []

        const fromBlock = _.min([
            lastHead+1,
            _.minBy(requests, 'from')?.from,
        ])

        const type = fetcher ? '(SCAN)' : isMerged ? '(MERGE)' : '(PARTITION)'
        global.process.stdout.write(`++++ HEAD ${type} ${fromBlock}\t`)

        if (fetcher) {
            var toBlock = safeBlock
            const capped = capRequests({requests, fromBlock, toBlock})
            logs = await config.getLogs(capped)
        } else {
            if (fromBlock + maxRange <= head) {
                var toBlock = fromBlock + maxRange - 1
            }
    
            if (isMerged) {
                const merged = mergeRequests({requests, fromBlock, toBlock})
                logs = await config.getLogs(merged, safeBlock)
            } else {
                // partition similar requests base on the same combination of address and each topic
                const parts = partitionRequests(requests)
                const merged = parts.map(requests => mergeRequests({requests, fromBlock, toBlock}))
                logs = await config.getLogs(merged, safeBlock)
            }

            toBlock = _.max([
                lastHead,
                _.maxBy(logs, 'blockNumber')?.blockNumber,
                _.min([
                    toBlock,
                    safeBlock,
                ]),
            ])

            if (logs && logs.length) {
                // truncate all log higher than toBlock to prevent missing head
                const lenBefore = logs.length
                logs = logs.filter(log => log.blockNumber <= toBlock)
                if (logs.length != lenBefore) {
                    console.warn('TRUNCATED', lenBefore - logs.length)
                }
            }
        }

        console.log({ range: toBlock-fromBlock+1, behind: head-toBlock, logs: logs.length })

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

                return consumer.processLogs({ logs: consumerLogs, fromBlock, toBlock, lastHead, head })
            })
        }

        await ConfigModel.updateOne(
            { key: 'lastHead' },
            { value: toBlock },
            { upsert: true },
        )

        return toBlock
    }

    return {
        process,
    }
}

module.exports = chainlogHeadProcessor
