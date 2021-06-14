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

let isCatchingUp = false;
provider.on('block', async head => {
    console.log('New block', head)
    if (isCatchingUp) {
        return;
    }
    try {
        isCatchingUp = true;
        await processHead({ configs, head })
    } catch (error) {
        console.error(error.message)
    } finally {
        isCatchingUp = false;
    }
})

function crawl() {
    console.error('crawling...')
    processPast({ configs })
        .then(() => setTimeout(crawl, 1000))
        .catch((err) => setTimeout(crawl, 1000))
}
crawl()