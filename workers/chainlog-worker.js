const { ethers } = require('ethers')
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const path = require("path")
const { processHead, processPast } = require('../services/chainlog-provider')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const consumers = []


console.log('State consumers', consumers)

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
        return processHead({ configs: consumers, head })
    } catch (error) {
        console.error(error.message)
    } finally {
        isCatchingUp = false;
    }
}

function crawl() {
    // console.error('crawling...')
    processPast({ configs: consumers })
        .then(nextDelay => setTimeout(crawl, nextDelay))
        .catch((err) => setTimeout(crawl, 1000))
}
