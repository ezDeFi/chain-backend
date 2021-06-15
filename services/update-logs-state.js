const Bluebird = require('bluebird')
const _ = require('lodash')
const { ethers } = require('ethers')
const { FRESH_BLOCK, CONCURRENCY, CHUNK_SIZE_HARD_CAP, TARGET_LOGS_PER_CHUNK } = require('../helpers/constants').getlogs
const provider = new ethers.providers.JsonRpcProvider({
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
    console.error('slpitChunks', {from, to, count})
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
    let newSize = Math.floor(oldSize * Math.pow(5/3, -concurrency))
    if (newSize <= oldSize) {
        newSize = oldSize + 1
    }
    newSize = Math.min(CHUNK_SIZE_HARD_CAP, newSize)
    if (newSize > oldSize) {
        chunkSize[type] = newSize
        console.error(`getLogs: CHUNK_SIZE (${type}) increased to ${newSize}`)
    }
}

const chunkSizeDown = (type) => {
    const concurrency = (!type || type == 'head') ? 1 : CONCURRENCY
    const oldSize = chunkSize[type]
    let newSize = Math.floor(oldSize / Math.pow(2, -concurrency))
    if (newSize < oldSize) {
        chunkSize[type] = newSize
        console.error(`getLogs: CHUNK_SIZE (${type}) decreased to ${chunkSize[type]}`)
    }
}

const _getLogs = async ({ fromBlock, toBlock, topics }, type) => {
    if (!type) {
        type = 'head'
    }
    console.error(`_getLogs:${type}`, fromBlock, toBlock, topics)
    try {
        const logs = await provider.getLogs({
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
    const requests = _.flatten(await Bluebird.map(configs, async config => await config.getRequests()))

    const forwardParams = await getNextForwardLogs(requests)
    if (!!forwardParams) {
        await Bluebird.map(configs, async config => {
            await config.processLogs({...forwardParams});
        });
    }
}

const getLogs = ({requests, fromBlock, toBlock}, type) => {
    const inRangeRequests = requests.filter(r => r.lo <= toBlock)
    if (inRangeRequests.length == 0) {
        return []
    }
    const topics = mergeTopics(requests.map(r => r.topics))
    return _getLogs({ fromBlock, toBlock, topics}, type)
}

const getNextForwardLogs = async(requests) => {
    const type = 'forward'

    console.error({requests})

    requests = requests
        .filter(r => !r.backward && r.lo != FRESH_BLOCK)

    if (requests.length == 0) {
        console.error('no requests')
        return
    }

    // TODO merge addresses
    if (requests.some(r => !!r.address)) {
        throw new Error('request with address not yet supported')
    }

    const minRequestedBlock = Math.min(...requests.map(r => r.lo))
    const fromBlock = minRequestedBlock

    const head = await provider.getBlockNumber()    // TODO: remove this call?
    const toBlock = Math.min(fromBlock + chunkSize[type]*CONCURRENCY, head)

    const blocks = splitChunks(fromBlock, toBlock, CONCURRENCY);
    const logs = await Bluebird.map(blocks, ({ from: fromBlock, to: toBlock }, i) => {
        return getLogs({ fromBlock, toBlock, requests }, type)
    }, { concurrency: CONCURRENCY }).then(_.flatten);

    if (!logs) {
        return
    }

    return { logs, fromBlock, toBlock }
}

const processHead = async ({ configs, head }) => {
    const freshBlock = (await ConfigModel.findOne({
        key: 'lastHead'
    }).lean().then(m => m && m.value) || 0) + 1;

    const requests =
        _.flatten(await Bluebird.map(configs, async config => await config.getRequests()))
        .filter(r => !r.hi)

    if (requests.length == 0) {
        return
    }

    // TODO merge addresses
    if (requests.some(r => !!r.address)) {
        throw new Error('request with address not yet supported')
    }

    requests.forEach(r => {
        if (r.lo == FRESH_BLOCK) {
            r.lo = freshBlock
        }
    })

    const minRequestedBlock = Math.min(...requests.map(r => r.lo))
    const HEAD_BUFFER_RANGE = (chunkSize.head>>1)+1
    const fromBlock = Math.max(minRequestedBlock, head - HEAD_BUFFER_RANGE)

    const inRangeRequests = requests.filter(r => r.lo >= fromBlock)
    console.error({freshBlock, minRequestedBlock, fromBlock, inRangeRequests})
    if (inRangeRequests.length > 0) {
        console.error({fromBlock, chunkSize, head})

        // TODO: merge addresses here
        const topics = mergeTopics(inRangeRequests.map(r => r.topics))
        const logs = await _getLogs({ fromBlock, topics })
    
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