const Bluebird = require('bluebird')
const _ = require('lodash')
const { mergeRequests, partitionRequests, filterLogs } = require("../ethers-log-filter")

// Input
//  * config {ChainlogProcessorConfig}
//  * consumers {Array<Consumer>}
//  * mongoose {ChainBackendMongoose}
function chainlogHeadProcessor({configs, consumers, mongoose}) {
    // rollback the lastHead
    // ConfigModel.updateOne(
    //     { key: 'lastHead' },
    //     { value: 8000000 },
    //     { upsert: true },
    // ).then(console.log).catch(console.error)

    let ConfigModel = mongoose.model('Config')

    const process = async (head) => {
        let lastHead = await ConfigModel.findOne({
            key: 'lastHead'
        }).lean().then(m => m && m.value)

        const mergeRange = configs.merge.getSize()
    
        if (!lastHead) {    // init the first sync
            lastHead = head - mergeRange
            await ConfigModel.updateOne(
                { key: 'lastHead' },
                { value: lastHead },
                { upsert: true },
            )
        }

        if (head <= lastHead) {
            return  // nothing to do
        }

        const isMerged = head <= lastHead + mergeRange
        const config = isMerged ? configs.merge : configs.partition

        const maxRange = config.getSize()

        const consumerRequests = await Bluebird.map(consumers,
            c => c.getRequests({ maxRange, lastHead, head })
            .then(rr => _.filter(rr, r => r.from > lastHead))
        )
        let requests = consumerRequests.flat()
    
        if (!requests.length) {
            await ConfigModel.updateOne(
                { key: 'lastHead' },
                { value: head },
                { upsert: true },
            )
            return false
        }
    
        const fromBlock = Math.min(lastHead+1, ...requests.map(r => r.from))
        if (fromBlock + maxRange <= head) {
            var toBlock = fromBlock + maxRange - 1
        }

        let logs = []

        if (isMerged) {
            const merged = mergeRequests({requests, fromBlock, toBlock})
            if (merged) {
                logs = await config.getLogs(merged)
                // if (!logs) {
                //     return false // failed
                // }
            }
        } else {
            // partition similar requests base on the same combination of address and each topic
            const parts = partitionRequests(requests)

            logs = await Bluebird.map(parts, requests => {
                const merged = mergeRequests({requests, fromBlock, toBlock})
                return config.getLogs(merged, parts.length)
            }).then(_.flatten)
        }

        if (!toBlock) {
            toBlock = head
            if (logs) {
                logs.forEach(({blockNumber}) => {
                    if (toBlock < blockNumber) {
                        toBlock = blockNumber
                    }
                })
            }
        }

        console.log('++++ HEAD ' + (isMerged ? '(MERGE)' : '(PARTITION)'),
            { fromBlock, range: toBlock-fromBlock+1, behind: head-toBlock, logs: logs.length }
        )

        await Bluebird.map(consumers, (consumer, i) => {
            const requests = consumerRequests[i]
            if (!requests || !requests.length) {
                return
            }

            const consumerLogs = requests
                .map(request => filterLogs(logs, request))
                .flat()
                .sort((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex)

            const { key, from, to } = requests[0]
            console.log(`\t${from} +${(to||toBlock)-from+1} :${consumerLogs.length}\t${key}`)

            return consumer.processLogs({ logs: consumerLogs, fromBlock, toBlock, lastHead, head })
        })

        await ConfigModel.updateOne(
            { key: 'lastHead' },
            { value: toBlock },
            { upsert: true },
        )

        return toBlock && toBlock < head
    }

    return {
        process,
    }
}

module.exports = chainlogHeadProcessor
