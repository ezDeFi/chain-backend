const { ethers } = require('ethers')
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const path = require("path")
const { processHead, processPast } = require('../services/update-logs-state')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const statePath = "../states"
const configs = []

const normalizedPath = path.join(__dirname, statePath);
require("fs").readdirSync(normalizedPath).forEach(file => {
    if (path.extname(file) == '.js') {
        const key = file.split('.').slice(0, -1).join('.')
        configs.push(require(`${normalizedPath}/${key}`)(key))
    }
})

console.log('State configs', configs)

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
        return processHead({ configs, head })
    } catch (error) {
        console.error(error.message)
    } finally {
        isCatchingUp = false;
    }
}

function crawl() {
    // console.error('crawling...')
    processPast({ configs })
        .then(nextDelay => setTimeout(crawl, nextDelay))
        .catch((err) => setTimeout(crawl, 1000))
}
