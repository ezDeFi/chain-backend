const Bluebird = require('bluebird')
const _ = require('lodash')
const { JsonRpcProvider } = require('@ethersproject/providers')
const { FRESH_BLOCK, CONCURRENCY, CHUNK_SIZE_HARD_CAP, TARGET_LOGS_PER_CHUNK } = require('../helpers/constants').getlogs
const provider = new JsonRpcProvider({
	timeout: 3000,
	url: process.env.RPC,
})
const ConfigModel = require("../models/ConfigModel");
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const chunkSize = {
    head: CHUNK_SIZE_HARD_CAP,
    forward: CHUNK_SIZE_HARD_CAP,
    backward: CHUNK_SIZE_HARD_CAP,
}

const splitChunks = (from, to, count) => {
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

const chunkSizeUp = (type) => {
    const concurrency = (!type || type == 'head') ? 1 : CONCURRENCY
    const oldSize = chunkSize[type]
    let newSize = Math.floor(oldSize * Math.pow(5/3, 1/concurrency))
    if (newSize <= oldSize) {
        newSize = oldSize + 1
    }
    newSize = Math.min(CHUNK_SIZE_HARD_CAP, newSize)
    if (newSize > oldSize) {
        chunkSize[type] = newSize
        console.error(`getLogs: CHUNK_SIZE (${type}) increased to ${newSize}`)
    } else {
        console.error(`getLogs: CHUNK_SIZE (${type}) unchanged ${newSize}`)
    }
}

const chunkSizeDown = (type) => {
    const concurrency = (!type || type == 'head') ? 1 : CONCURRENCY
    const oldSize = chunkSize[type]
    let newSize = Math.floor(oldSize * Math.pow(1/2, 1/concurrency))
    newSize = Math.max(1, newSize)
    if (newSize < oldSize) {
        chunkSize[type] = newSize
        console.error(`getLogs: CHUNK_SIZE (${type}) decreased to ${chunkSize[type]}`)
    } else {
        console.error(`getLogs: CHUNK_SIZE (${type}) unchanged ${chunkSize[type]}`)
    }
}

const _getLogs = async ({ address, fromBlock, toBlock, topics }, type) => {
    if (!type) {
        type = 'head'
    }
    // console.log(`_getLogs:${type}`, {fromBlock, toBlock, address, topics})
    try {
        const logs = await provider.getLogs({
            address,
            topics,
            fromBlock,
            toBlock,
        });
        if (!Array.isArray(logs)) {
            throw new Error(JSON.stringify(logs));
        }
        if (logs.length < TARGET_LOGS_PER_CHUNK) {
            if (toBlock - fromBlock >= chunkSize[type] - 1) {
                chunkSizeUp(type)
            }
        }
        return logs;
    } catch(err) {
        if (err.code == 'TIMEOUT') {
            chunkSizeDown(type)
        }
        throw err
    }
}

const mergeTopics = (topics) => {
    return topics
        .map(ts => ts.map(t => _.isArray(t) ? t : [t])) // wrap all single topic to array
        .reduce((topics, ts, it) => {
            ts.forEach((t, i) => {
                t.forEach(ti => {
                    if (!topics[i].includes(ti)) {
                        topics[i].push(ti)
                    }
                })
            })
            return topics
        })
}

const processPast = async ({ configs }) => {
    const type = 'forward'

    const maxRange = chunkSize[type]*CONCURRENCY
    const requests = await Bluebird.map(configs, config => config.getRequests(maxRange))
        .then(_.flatten)
        .filter(r => r.from != FRESH_BLOCK)

    if (requests.length == 0) {
        console.log('processPast: no requests', {maxRange})
        return
    }
    
    const minRequestedBlock = Math.min(...requests.map(r => r.from))
    const fromBlock = minRequestedBlock

    const head = await provider.getBlockNumber()    // TODO: remove this call?
    const toBlock = Math.min(fromBlock + maxRange, head)

    const chunks = splitChunks(fromBlock, toBlock, CONCURRENCY);
    const logs = await Bluebird.map(chunks, ({ from: fromBlock, to: toBlock }, i) => {
        return getLogsInRange({ fromBlock, toBlock, requests }, type)
    }, { concurrency: CONCURRENCY }).then(_.flatten);

    if (!logs) {
        return  // failed
    }

    return Bluebird.map(configs, config => config.processLogs({logs, fromBlock, toBlock}));
}

const getLogsInRange = ({requests, fromBlock, toBlock}, type) => {
    const inRangeRequests = requests.filter(r => r.from <= toBlock && (!r.to || r.to >= fromBlock))
    if (inRangeRequests.length == 0) {
        // console.log(`no request in range ${fromBlock} +${toBlock-fromBlock}`)
        return []
    }
    const address = inRangeRequests.filter(r => !!r.address).map(r => r.address)
    const topics = mergeTopics(inRangeRequests.map(r => r.topics))
    return _getLogs({ address, fromBlock, toBlock, topics}, type)
}

const processHead = async ({ configs, head }) => {
    const maxRange = (chunkSize.head>>1)+1

    const requests =
        _.flatten(await Bluebird.map(configs, async config => await config.getRequests(maxRange)))
        .filter(r => !r.to)

    if (requests.length == 0) {
        console.log('processHead: no requests', {maxRange})
        return
    }

    const freshBlock = (await ConfigModel.findOne({
        key: 'lastHead'
    }).lean().then(m => m && m.value) || 0) + 1;

    requests.forEach(r => {
        if (r.from == FRESH_BLOCK) {
            r.from = freshBlock
        }
    })

    const minRequestedBlock = Math.min(...requests.map(r => r.from))
    const fromBlock = Math.max(minRequestedBlock, head - maxRange)

    const inRangeRequests = requests.filter(r => r.from >= fromBlock)
    // console.log({freshBlock, minRequestedBlock, fromBlock, inRangeRequests})
    if (inRangeRequests.length > 0) {
        // console.log({fromBlock, chunkSize, head})

        const address = inRangeRequests.filter(r => !!r.address).map(r => r.address)
        const topics = mergeTopics(inRangeRequests.map(r => r.topics))
        const logs = await _getLogs({ address, fromBlock, topics })
    
        if (!logs) {
            return  // failed
        }
    
        var toBlock = Math.max(head, ...logs.map(l => l.blockNumber))
    
        await Bluebird.map(configs, async config => {
            await config.processLogs({ logs, fromBlock, toBlock, freshBlock });
        });
    }

    await ConfigModel.updateOne(
        { key: 'lastHead' },
        { value: toBlock || head },
        { upsert: true },
    )
}

exports.processHead = processHead;
exports.processPast = processPast;