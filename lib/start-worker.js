'use strict'

const mongoose = require('./mongoose')
const {standardizeStartConfiguration} = require('./validator')
const chainlogHeadProcessor = require('./service/chainlog-head-processor')
const chainlogPastProcessor = require('./service/chainlog-past-processor')

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
    let isCatchingUp = false

    async function processBlock(head) {
        console.log('New block', head)
        if (isCatchingUp) {
            return;
        }
        try {
            isCatchingUp = true;
            return await headProcessor.process(head)
        } catch (error) {
            console.error(error.message)
        } finally {
            isCatchingUp = false
        }
    }

    function crawl() {
        pastProcessor.process()
            .then(nextDelay => setTimeout(crawl, nextDelay))
            .catch((err) => {
                console.error(err)
                setTimeout(crawl, 1000)
            })
    }

    config.ethersProvider.getBlockNumber()
        .then(processBlock)
        .then(() => {
            config.ethersProvider.on('block', processBlock)
            crawl()
        })
        .catch(error => {
            console.error(error)
            process.exit(1)
        })
}

function _createConsumers(constructors, mongoose) {
    return constructors.map(constructor => {
        return constructor({mongoose})
    })
}

module.exports = startWorker
