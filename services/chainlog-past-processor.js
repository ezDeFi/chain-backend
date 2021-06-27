const Bluebird = require('bluebird')
const _ = require('lodash')
const ConfigModel = require("../models/ConfigModel")
const { mergeRequests } = require("../helpers/logs")

const createProccesor = ({config, consumers}) => {
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

    const process = async () => {
        const lastHead = await ConfigModel.findOne({
            key: 'lastHead'
        }).lean().then(m => m && m.value);
    
        const concurrency = config.getConcurrency()
        const maxRange = config.getSize() * concurrency
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

        const chunks = _splitChunks(fromBlock, toBlock, concurrency);
        const logs = await Bluebird.map(chunks, ({ from: fromBlock, to: toBlock }, i) => {
            return config.getLogs(mergeRequests({requests, fromBlock, toBlock}))
        }, { concurrency }).then(_.flatten);
    
        if (!logs) {
            return 10000 // failed, wait for 10s
        }
    
        await Bluebird.map(requests, request => request.processLogs({ request, logs, fromBlock, toBlock, lastHead }))
    }

    return {
        process,
    }
}

exports.createProccesor = createProccesor
