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

const processPast = async ({ configs }) => {
    const type = 'forward'

    const lastHead = await ConfigModel.findOne({
        key: 'lastHead'
    }).lean().then(m => m && m.value);

    const maxRange = chunkSize[type]*CONCURRENCY
    let requests = await Bluebird.map(configs, config => config.getRequests({maxRange, lastHead}))
        .then(_.flatten)
        .filter(r => r.from <= lastHead)

    if (!requests.length) {
        return 3000 // no more requests, wait for 3s
    }

    const fromBlock = Math.min(...requests.map(r => r.from))
    const toBlock = Math.min(fromBlock + maxRange, lastHead)

    requests = requests.filter(r => r.from <= toBlock && (!r.to || r.to >= fromBlock))

    console.log('processPast', { lastHead, fromBlock, toBlock, requests })

    const chunks = splitChunks(fromBlock, toBlock, CONCURRENCY);
    const logs = await Bluebird.map(chunks, ({ from: fromBlock, to: toBlock }, i) => {
        return getLogsInRange({ requests, fromBlock, toBlock }, type)
    }, { concurrency: CONCURRENCY }).then(_.flatten);

    if (!logs) {
        return 10000 // failed, wait for 10s
    }

    await Bluebird.map(requests, request => request.processLogs({ request, logs, fromBlock, toBlock, lastHead }))
}

exports.processHead = processHead;
exports.processPast = processPast;
