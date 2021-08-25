const Bluebird = require('bluebird')
const _ = require('lodash')
const { mergeRequests } = require("../ethers-log-filter")

// Input
//  * config {ChainlogProcessorConfig}
//  * consumers {Array<Consumer>}
//  * mongoose {ChainBackendMongoose}
const chainlogPastProcessor = ({config, consumers, mongoose}) => {
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
    let ConfigModel = mongoose.model('Config')

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
    
        // filter only similar requests, prioritize address > topics[0] > topics[1] > topics[2] > topics[3]
        if (requests.some(r => r.address)) {
            requests = requests.filter(r => r.address)
        }
        for (let i = 0; i < 4; ++i) {
            if (requests.some(r => r.topics[i])) {
                requests = requests.filter(r => r.topics[i])
            }
        }
        // console.error(mergeRequests({requests, fromBlock, toBlock}))
    
        const fromBlock = Math.min(...requests.map(r => r.from))
        const toBlock = Math.min(fromBlock + maxRange, lastHead)
    
        requests = requests.filter(r => r.from <= toBlock && (!r.to || r.to >= fromBlock))

        console.log('PAST ----', { lastHead, fromBlock, toBlock })
        console.log(requests.map(({key, from, to}) => `\t${key}:\t${from} +${(to||toBlock)-from}`).join('\n'))

        const chunks = _splitChunks(fromBlock, toBlock, concurrency);
        const logs = await Bluebird.map(chunks, ({ from: fromBlock, to: toBlock }, i) => {
            const merged = mergeRequests({requests, fromBlock, toBlock})
            if (merged) {
                return config.getLogs(merged)
            }
        }, { concurrency }).then(_.flatten).filter(l => l);

        if (!logs) {
            return 10000 // failed, wait for 10s
        }
    
        await Bluebird.map(requests, request => request.processLogs({ request, logs, fromBlock, toBlock, lastHead }))
    }

    return {
        process,
    }
}

module.exports = chainlogPastProcessor
