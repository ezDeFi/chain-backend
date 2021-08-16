'use strict'

const { JsonRpcProvider } = require('@ethersproject/providers')
const { createConfig } = require('./services/chainlog-config')
const mongo = require('./mongo')
const HeadProcessor = require('./services/chainlog-head-processor')
const PastProcessor = require('./services/chainlog-past-processor')
const {standardizeStartConfiguration} = require('./validator')
const { 
    CONCURRENCY, 
    CHUNK_SIZE_HARD_CAP, 
    TARGET_LOGS_PER_CHUNK 
} = require('./helpers/constants').getlogs

// Input
//  * config {Object}
//  * config.createConsumerFunctions {Array<Function>}
//  * config.mongoEndpoint {String}
//  * config.bscEndpoint {String}
//  * config.farm {String} ?
//  * config.farmGenesis {String} ?
async function startWorker(config) {
    let validConfig = standardizeStartConfiguration(config)

    await _startWorker(validConfig)
}

async function _startWorker(config) {
    let mongoService = await mongo.open(config.mongoEndpoint)
    let consumers = _createConsumers(config.createConsumerFunctions, mongoService)
    let provider = new JsonRpcProvider({
        timeout: 6000,
        url: config.bscEndpoint
    })
    let headProcessor = HeadProcessor.createProccesor({
        consumers: consumers,
        mongo: mongoService,
        config: createConfig({
            type: 'HEAD',
            config: {
                provider,
                size: 6,
                concurrency: 1,
            },
            hardCap: CHUNK_SIZE_HARD_CAP,
            target: TARGET_LOGS_PER_CHUNK,
        })
    })
    let pastProcessor = PastProcessor.createProccesor({
        consumers: consumers,
        mongo: mongoService,
        config: createConfig({
            type: 'PAST',
            config: {
                provider,
                size: CHUNK_SIZE_HARD_CAP,
                concurrency: CONCURRENCY,
            },
            hardCap: CHUNK_SIZE_HARD_CAP,
            target: TARGET_LOGS_PER_CHUNK
        })
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

    provider.getBlockNumber()
        .then(processBlock)
        .then(() => {
            provider.on('block', processBlock)
            crawl()
        })
        .catch(error => {
            console.error(error)
            process.exit(1)
        })
}

function _createConsumers(createConsumerFunctions, mongo) {
    return createConsumerFunctions.map(createFunction => {
        return createFunction({mongo})
    })
}

module.exports = startWorker
