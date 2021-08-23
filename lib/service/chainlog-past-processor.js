const Bluebird = require('bluebird')
const _ = require('lodash')
const { mergeRequests, partitionRequests } = require("../ethers-log-filter")

// Input
//  * config {ChainlogProcessorConfig}
//  * consumers {Array<Consumer>}
//  * mongoose {ChainBackendMongoose}
const chainlogPastProcessor = ({config, consumers, mongoose}) => {
    const ConfigModel = mongoose.model('Config')

    const process = async () => {
        const _splitChunks = (from, to, count) => {
            // console.log('slpitChunks', {from, to, count})
            const size = Math.round((to - from) / count)
            const blocks = _.range(count).map(i => {
                const blockFrom = from + (size * i)
                const blockTo = blockFrom + size - 1
                return {
                    from: blockFrom,
                    to: blockTo,
                }
            });
            return blocks;
        }

        const lastHead = await ConfigModel.findOne({
            key: 'lastHead'
        }).lean().then(m => m && m.value);
    
        const concurrency = config.getConcurrency()
        const maxRange = concurrency * config.getSize()
        let requests = await Bluebird.map(consumers, c => c.getRequests({maxRange, lastHead}))
            .then(_.flatten)
            .filter(r => r.from <= lastHead)
    
        if (!requests.length) {
            return 3000 // no more requests, wait for 3s
        }

        const fromBlock = Math.min(...requests.map(r => r.from))
        const toBlock = Math.min(fromBlock + maxRange, lastHead)
        requests = requests.filter(r => r.from <= toBlock && (!r.to || r.to >= fromBlock))

        console.log('PAST ----', { lastHead, fromBlock, toBlock })
        console.log(requests.map(({key, from, to}) => `\t${key}:\t${from} +${(to||toBlock)-from}`).join('\n'))

        // TODO: check block range for partitioning condition here

        // partition similar requests base on the same combination of address and each topic
        const parts = partitionRequests(requests)

        const logs = await Bluebird.map(parts, requests => {
            const chunks = _splitChunks(fromBlock, toBlock, concurrency);
            return Bluebird.map(chunks, ({ from: fromBlock, to: toBlock }, i) => {
                const merged = mergeRequests({requests, fromBlock, toBlock})
                if (merged) {
                    return config.getLogs(merged, concurrency * parts.length)
                }
            }).then(_.flatten).filter(l => l);
        })

        await Bluebird.map(parts, (requests, i) =>
            Bluebird.map(requests, request =>
                request.processLogs({ request, logs: logs[i], fromBlock, toBlock, lastHead })
            )
        )
    }

    return {
        process,
    }
}

module.exports = chainlogPastProcessor
