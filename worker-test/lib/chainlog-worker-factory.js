'use strict'

const { createConfig } = require('../../services/chainlog-config')
const HeadProcessor = require('../../services/chainlog-head-processor')
const PastProcessor = require('../../services/chainlog-past-processor')
const {
    CONCURRENCY,
    CHUNK_SIZE_HARD_CAP,
    TARGET_LOGS_PER_CHUNK
} = require('../../helpers/constants').getlogs

// Output {Object} Chainlog worker
//  * close() Stop worker.
async function startChainlogWorker({
    consumers,                      // Array<Object>
    ethersProvider,                 // ethers.providers.JsonRpcProvider
    hardCap=CHUNK_SIZE_HARD_CAP,    // Number
    target=TARGET_LOGS_PER_CHUNK,   // Number
    concurrency=CONCURRENCY,        // Number
    size=CHUNK_SIZE_HARD_CAP,       // Number
}) {
    let headProcessor = HeadProcessor.createProccesor({
        consumers,
        config: createConfig({
            type: 'HEAD',
            config: {
                provider: ethersProvider,
                size: size,
                concurrency: 1,
            },
            hardCap: hardCap,
            target: target,
        })
    })
    let pastProcessor = PastProcessor.createProccesor({
        consumers,
        config: createConfig({
            type: 'PAST',
            config: {
                provider: ethersProvider,
                size: size,
                concurrency: concurrency,
            },
            hardCap: hardCap,
            target: target,
        })
    })
    let isCatchingUp = false
    let crawlTimer

    function processBlock(head) {
        console.log('New block', head)
        if (isCatchingUp) {
            return;
        }
        try {
            isCatchingUp = true;
            return headProcessor.process(head)
        } catch (error) {
            console.error(error.message)
        } finally {
            isCatchingUp = false;
        }
    }

    function crawl() {
        // console.error('crawling...')
        pastProcessor.process()
            .then(nextDelay => {
                crawlTimer = setTimeout(crawl, nextDelay)
            })
            .catch(err => {
                console.error(err)
                crawlTimer = setTimeout(crawl, 1000)
            })
    }

    async function close() {
        if (crawlTimer) {
            clearTimeout(crawlTimer)
        }

        ethersProvider.removeAllListeners()
    }

    let lastBlockNumber = await ethersProvider.getBlockNumber()

    await processBlock(lastBlockNumber)
    ethersProvider.on('block', (blockNumber) => {
        processBlock(blockNumber).catch(console.error)
    })
    crawl()

    return {
        close
    }
}

module.exports = startChainlogWorker
