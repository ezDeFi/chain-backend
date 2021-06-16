const Bluebird = require('bluebird')
const _ = require('lodash')
const { JsonRpcProvider } = require('@ethersproject/providers')
const { CONCURRENCY, CHUNK_SIZE_HARD_CAP, TARGET_LOGS_PER_CHUNK } = require('../helpers/constants').getlogs
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
        console.log(`getLogs: CHUNK_SIZE (${type}) increased to ${newSize}`)
    }
}

const chunkSizeDown = (type) => {
    const concurrency = (!type || type == 'head') ? 1 : CONCURRENCY
    const oldSize = chunkSize[type]
    let newSize = Math.floor(oldSize * Math.pow(1/2, 1/concurrency))
    newSize = Math.max(1, newSize)
    if (newSize < oldSize) {
        chunkSize[type] = newSize
        console.log(`getLogs: CHUNK_SIZE (${type}) decreased to ${chunkSize[type]}`)
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
        // console.log({logs})
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

    const freshBlock = (await ConfigModel.findOne({
        key: 'lastHead'
    }).lean().then(m => m && m.value) || 0) + 1;

    const maxRange = chunkSize[type]*CONCURRENCY
    const requests = await Bluebird.map(configs, config => config.getRequests(maxRange, freshBlock))
        .then(_.flatten)
        .filter(r => r.from < freshBlock)

    if (!requests.length) {
        return false
    }

    console.log('processPast', { requests })
    
    const fromBlock = Math.min(...requests.map(r => r.from))
    const toBlock = Math.min(fromBlock + maxRange, freshBlock-1)

    const chunks = splitChunks(fromBlock, toBlock, CONCURRENCY);
    const logs = await Bluebird.map(chunks, ({ from: fromBlock, to: toBlock }, i) => {
        return getLogsInRange({ requests, fromBlock, toBlock }, type)
    }, { concurrency: CONCURRENCY }).then(_.flatten);

    if (!logs) {
        return false // failed
    }

    return Bluebird.map(configs, config => config.processLogs({ logs, fromBlock, toBlock }))
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

    const freshBlock = lastHead + 1;

    const requests = await Bluebird.map(configs, config => config.getRequests(maxRange, freshBlock))
        .then(_.flatten)
        .filter(r => r.from >= freshBlock)

    if (!requests.length) {
        return true
    }

    console.log('processHead', { head, freshBlock, requests })

    const fromBlock = freshBlock
    if (fromBlock + maxRange <= head) {
        var toBlock = fromBlock + maxRange - 1
        var hasMoreBlock = true
    }

    const address = requests.filter(r => !!r.address).map(r => r.address)
    const topics = mergeTopics(requests.map(r => r.topics))
    const logs = await _getLogs({ address, topics, fromBlock, toBlock })

    if (!logs) {
        return false // failed
    }

    if (!toBlock) {
        toBlock = Math.max(head, ...logs.map(l => l.blockNumber))
    }

    await Bluebird.map(configs, config => config.processLogs({ logs, fromBlock, toBlock, freshBlock }))

    await ConfigModel.updateOne(
        { key: 'lastHead' },
        { value: toBlock },
        { upsert: true },
    )

    return !!hasMoreBlock
}

exports.processHead = processHead;
exports.processPast = processPast;