const { ethers } = require('ethers')
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const path = require("path")
const { processNewState } = require('../services/update-logs-state')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const statePath = "../states"
const configs = {}

const normalizedPath = path.join(__dirname, statePath);
require("fs").readdirSync(normalizedPath).forEach(file => {
    const key = file.split('.').slice(0, -1).join('.')
    configs[key] = require(`${normalizedPath}/${key}`)(key)
})

console.log('State configs', configs)

let updating = false;
provider.on('block', async head => {
    console.log('New block', head)
    if (updating) {
        return;
    }
    try {
        updating = true;
        await processNewState({ configs, head })
    } catch (error) {
        console.error(error.message)
    } finally {
        updating = false;
    }
})