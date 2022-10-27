'use strict'

const mongoose = require('./mongoose')
const {standardizeStartConfiguration} = require('./validator')
const chainlogHeadProcessor = require('./service/chainlog-head-processor')
const chainlogPastProcessor = require('./service/chainlog-past-processor')
const { delay, rpcKnownError } = require('./util')

let blockTimestamps = {}
let configs = {}

// Description
//  * Start a worker that retrieve and store data from Binance Smart Chain
//    network.
//
// Input
//  * config {Object}
//  * config.consumerConstructors {Array<ConsumerConstructor>}
//  * config.mongoose {mongoose.Mongoose} There are reserved model's names and
//    must not use by outside of this function: 'Config', 'LogsState'.
//  * config.processorConfigs {Object}
//  * config.safeDepth {number=0} RPC can return bad result, such as empty
//    logs, or missing logs from the newly mined blocks. The `lastHead` only
//    advance pass block N if either:
//      1. got some logs with blockNumber >= N
//      2. N >= head-safeDepth
//
// Errors
//  * ChainBackendError
async function startWorker(config) {
    let validConfig = standardizeStartConfiguration(config)

    await _startWorker(validConfig)
}

// Input
//  * config {WorkerConfiguration}
async function _startWorker(config) {
    mongoose.applySchemaList(config.mongoose, config.mongoosePrefix)

    const consumers = _createConsumers(
        config.consumerConstructors,
        config.mongoose,
        config.mongoosePrefix,
    )
    const headProcessor = chainlogHeadProcessor({
        consumers: consumers,
        configs: config.processorConfigs,
        safeDepth: config.safeDepth,
        mongoose: config.mongoose,
        mongoosePrefix: config.mongoosePrefix,
        getBlockTimestamp
    })
    const pastProcessor = chainlogPastProcessor({
        consumers: consumers,
        configs: config.processorConfigs,
        mongoose: config.mongoose,
        mongoosePrefix: config.mongoosePrefix,
        getBlockTimestamp
    })
    const provider = config.processorConfigs.merge.getProvider()
    const context = {
        latency: config.latency,
        safeDepth: config.safeDepth,
        provider,
        headProcessor: headProcessor,
        pastProcessor: pastProcessor,
        lastProcessed: undefined,
        head: await provider.getBlockNumber(),
    }

    provider.on('block', blockNumber => {
        // TODO: clean up
        blockTimestamps[blockNumber] = Math.floor(new Date().getTime() / 1000)
        context.head = blockNumber
    })
    configs = {
        head: context.head,
        config: config.processorConfigs.merge
    }
    _startProcessingLoop(context)
}

function _createConsumers(constructors, mongoose, mongoosePrefix) {
    return Object.entries(constructors).map(([key, constructor]) => {
        return constructor({key, mongoose, mongoosePrefix})
    })
}

async function getBlockTimestamp(number) {
    if (blockTimestamps[number]) {
        return blockTimestamps[number]
    }

    let nB = Math.floor(number / configs.config.range) * configs.config.range
    let nA = nB + 1

    if (nA >= configs.head) {
        nA = Math.floor(configs.head / configs.config.range) * configs.config.range
        nB = nA-1
    }
    let timestampA = blockTimestamps[nA] ?? (await configs.config.getProvider().getBlock(nA)).timestamp
    let timestampB = blockTimestamps[nB] ?? (await configs.config.getProvider().getBlock(nB)).timestamp
    blockTimestamps[nA] = timestampA
    blockTimestamps[nB] = timestampB

    return Math.floor(timestampA + ((timestampA - timestampB) / (nA - nB)) * (number - nA))
}

async function _startProcessingLoop(context) {
    let nextPastProcess = Date.now()

    while (true) {
        // HEAD
        if ((context.lastHead ?? 0) < context.head) {
            const head = context.head
            try {
                context.lastHead = await context.headProcessor.process(head, getBlockTimestamp)
                context.lastProcessed = head
            }
            catch (error) {
                if (!rpcKnownError(error)) {
                    console.error('unexpected error: ', error)
                }
                console.log('[WARNING] head processing loop:', error.code)
            }
        }

        // PAST
        while (true) {
            const depth = context.head - context.lastHead
            if (depth > context.safeDepth) {
                console.log('safe depth reached', depth)
                break
            }

            const latency = context.head - context.lastProcessed
            if (latency > context.latency) {
                console.log('latency reached', latency)
                break
            }

            if (Date.now() < nextPastProcess) {
                await delay(Math.min(1000, nextPastProcess-Date.now()))
                continue
            }

            try {
                const nextDelay = await context.pastProcessor.process(null, getBlockTimestamp)
                if (!!nextDelay) {
                    console.log(`next past processing in ${nextDelay/1000}s`)
                    nextPastProcess = Date.now() + nextDelay
                    break
                }
            }
            catch (error) {
                if (!rpcKnownError(error)) {
                    console.error('unexpected error: ', error)
                }
                console.log('[WARNING] past processing loop:', error.code)
                nextPastProcess = Date.now() + 1000
            }
        }
    }
}

module.exports = startWorker
