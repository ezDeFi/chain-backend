'use strict'

const HeadProcessor = require('./services/chainlog-head-processor')
const PastProcessor = require('./services/chainlog-past-processor')
const {standardizeStartConfiguration} = require('./validator')

// Input
//  * config {WorkerConfiguration}
async function startWorker(config) {
    let validConfig = standardizeStartConfiguration(config)

    await _startWorker(validConfig)
}

// Input
//  * config {WorkerConfiguration}
async function _startWorker(config) {
    let headProcessor = HeadProcessor.createProccesor({
        consumers: config.consumers,
        config: config.headProcessorConfig
    })
    let pastProcessor = PastProcessor.createProccesor({
        consumers: config.consumers,
        config: config.pastProcessorConfig
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
            ethersProvider.on('block', processBlock)
            crawl()
        })
        .catch(error => {
            console.error(error)
            process.exit(1)
        })
}

module.exports = startWorker
