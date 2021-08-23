'use strict'

const mongoose = require('./mongoose')
const {standardizeStartConfiguration} = require('./validator')
const chainlogHeadProcessor = require('./service/chainlog-head-processor')
const chainlogPastProcessor = require('./service/chainlog-past-processor')
const {delay} = require('./util')

// Description
//  * Start a worker that retrieve and store data from Binance Smart Chain
//    network.
//
// Input
//  * config {Object}
//  * config.consumerConstructors {Array<ConsumerConstructor>}
//  * config.mongoose {mongoose.Mongoose} There are reserved model's names and
//    must not use by outside of this function: 'Config', 'LogsState'.
//  * config.ethersProvider {ethers.providers.JsonRpcProvider}
//  * config.pastProcessorConfig {ChainlogProcessorConfig}
//  * config.headProcessorConfig {ChainlogProcessorConfig}
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
    mongoose.applySchemaList(config.mongoose)

    let consumers = _createConsumers(
        config.consumerConstructors, 
        config.mongoose
    )
    let headProcessor = chainlogHeadProcessor({
        consumers: consumers,
        config: config.headProcessorConfig,
        mongoose: config.mongoose
    })
    let pastProcessor = chainlogPastProcessor({
        consumers: consumers,
        config: config.pastProcessorConfig,
        mongoose: config.mongoose
    })
    let context = {
        isCatchingUp: false,
        ethersProvider: config.ethersProvider,
        headProcessor: headProcessor,
        pastProcessor: pastProcessor
    }

    await _processLatestBlock(context)
    _startHeadProcessingLoop(context)
    await _startPastProcessingLoop(context)
}

function _createConsumers(constructors, mongoose) {
    return Object.entries(constructors).map(([key, constructor]) => {
        return constructor({key, mongoose})
    })
}

async function _processLatestBlock(context) {
    let latestBlockNumber = await context.ethersProvider.getBlockNumber()

    await _processBlock(context, latestBlockNumber)
}

async function _processBlock(context, head) {
    console.log('New block', head)

    if (context.isCatchingUp) {
        return
    }

    try {
        await context.headProcessor.process(head)
        context.isCatchingUp = true
    } 
    catch (error) {
        console.error(error)
    } 
    finally {
        context.isCatchingUp = false
    }
}

async function _startPastProcessingLoop(context) {
    for (;;) {
        try {
            const nextDelay = await context.pastProcessor.process()
            await delay(nextDelay)
        }
        catch (error) {
            if (error && error.code !== 'TIMEOUT') {
                console.error('unexpected error: ', error)
            }
            console.log('[WARNING] past processing loop:', error.code)
            await delay(1000)
        }
    }
}

function _startHeadProcessingLoop(context) {
    context.ethersProvider.on('block', blockNumber => {
        _processBlock(context, blockNumber).catch(error => {
            console.error(error)
        })
    })
}

module.exports = startWorker
