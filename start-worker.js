'use strict'

const mongoose = require('./mongoose')
const {standardizeStartConfiguration} = require('./validator')
const {
    createHeadProcessor,
    createPastProcessor
} = require('./chainlog-service')

// Input
//  * config {WorkerConfiguration}
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
    let headProcessor = createHeadProcessor({
        consumers: consumers,
        config: config.headProcessorConfig,
        mongoose: config.mongoose
    })
    let pastProcessor = createPastProcessor({
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
