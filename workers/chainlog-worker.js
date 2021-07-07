const path = require("path")
const { JsonRpcProvider } = require('@ethersproject/providers')
const { createConfig } = require('../services/chainlog-config')
const HeadProcessor = require('../services/chainlog-head-processor')
const PastProcessor = require('../services/chainlog-past-processor')
const { CONCURRENCY, CHUNK_SIZE_HARD_CAP, TARGET_LOGS_PER_CHUNK } = require('../helpers/constants').getlogs

const consumers = []

const normalizedPath = path.join(__dirname, "../consumers");
require("fs").readdirSync(normalizedPath).forEach(file => {
    if (path.extname(file) == '.js') {
        const key = file.split('.').slice(0, -1).join('.')
        consumers.push(require(`${normalizedPath}/${key}`)(key))
    }
})

console.log('State consumers', consumers)

const provider = new JsonRpcProvider({
	timeout: 3000,
	url: process.env.RPC,
})

const headProcessor = HeadProcessor.createProccesor({
    consumers,
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

const pastProcessor = PastProcessor.createProccesor({
    consumers,
    config: createConfig({
        type: 'PAST',
        config: {
            provider,
            size: CHUNK_SIZE_HARD_CAP,
            concurrency: CONCURRENCY,
        },
        hardCap: CHUNK_SIZE_HARD_CAP,
        target: TARGET_LOGS_PER_CHUNK,
    })
})

provider.getBlockNumber()
    .then(processBlock)
    .then(() => {
        provider.on('block', processBlock)
        crawl()
    })

let isCatchingUp = false;

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
        isCatchingUp = false;
    }
}

function crawl() {
    // console.error('crawling...')
    pastProcessor.process()
        .then(nextDelay => setTimeout(crawl, nextDelay))
        .catch((err) => {
            console.error(err)
            setTimeout(crawl, 1000)
        })
}
