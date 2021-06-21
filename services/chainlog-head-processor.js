const Bluebird = require('bluebird')
const _ = require('lodash')
const ConfigModel = require("../models/ConfigModel")
const { mergeTopics } = require("../helpers/logs")

const createProccesor = ({config, consumers}) => {
    const process = async (head) => {
        const maxRange = 1 + (config.getSize() >> 1)
    
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

        const requests = await Bluebird.map(consumers, c => c.getRequests({maxRange, lastHead}))
            .then(_.flatten)
            .filter(r => r.from > lastHead)
    
        if (!requests.length) {
            return true
        }
    
        console.log('++++ HEAD', { lastHead, head })
        console.log(requests.map(({key, from, to}) => `\t${key}:\t${from}${to ? ` +${to-from}` : ''}`).join('\n'))
    
        const fromBlock = lastHead + 1
        if (fromBlock + maxRange <= head) {
            var toBlock = fromBlock + maxRange - 1
            var hasMoreBlock = true
        }
    
        const address = _.flatten(requests.filter(r => !!r.address).map(r => r.address))
        const topics = mergeTopics(requests.map(r => r.topics))
        const logs = await config.getLogs({ address, topics, fromBlock, toBlock })

        if (!logs) {
            return false // failed
        }

        if (!toBlock) {
            toBlock = Math.max(head, ...logs.map(l => l.blockNumber))
        }
    
        await Bluebird.map(requests, request => request.processLogs({ request, logs, fromBlock, toBlock, lastHead, head }))
    
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

exports.createProccesor = createProccesor
