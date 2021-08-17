const Bluebird = require('bluebird')
const _ = require('lodash')
const { mergeRequests } = require("../helpers/logs")

function createHeadProcessor({config, consumers, mongoose}) {
    // rollback the lastHead
    // ConfigModel.updateOne(
    //     { key: 'lastHead' },
    //     { value: 8000000 },
    //     { upsert: true },
    // ).then(console.log).catch(console.error)

    let ConfigModel = mongoose.model('Config')

    const process = async (head) => {
        const maxRange = config.getSize()
    
        let lastHead = await ConfigModel.findOne({
            key: 'lastHead'
        }).lean().then(m => m && m.value)
    
        if (!lastHead) {    // init the first sync
            lastHead = head - maxRange
            await ConfigModel.updateOne(
                { key: 'lastHead' },
                { value: lastHead },
                { upsert: true },
            )
        }

        if (head <= lastHead) {
            return  // nothing to do
        }

        const requests = await Bluebird.map(consumers, c => c.getRequests({maxRange, lastHead, head}))
            .then(_.flatten)
            .filter(r => r.from > lastHead)
    
        if (!requests.length) {
            return true
        }

        console.log('++++ HEAD', { lastHead, head })
        console.log(requests.map(({key, from, to}) => `\t${key}:\t${from}${to ? ` +${to-from}` : ''}`).join('\n'))
    
        const fromBlock = Math.min(lastHead+1, ...requests.map(r => r.from))
        if (fromBlock + maxRange <= head) {
            var toBlock = fromBlock + maxRange - 1
            var hasMoreBlock = true
        }

        const merged = mergeRequests({requests, fromBlock, toBlock})
        if (merged) {
            const logs = await config.getLogs(merged)
            if (!logs) {
                return false // failed
            }
    
            if (!toBlock) {
                toBlock = Math.max(head, ...logs.map(l => l.blockNumber))
            }

            await Bluebird.map(requests, request => request.processLogs({ request, logs, fromBlock, toBlock, lastHead, head }))
        }

        await ConfigModel.updateOne(
            { key: 'lastHead' },
            { value: toBlock },
            { upsert: true },
        )
    
        return !!hasMoreBlock
    }

    return {
        process,
    }
}

module.exports = createHeadProcessor
