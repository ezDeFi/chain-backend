const { ethers } = require('ethers')
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const path = require("path")
const { updateLogsState } = require('../services/update-logs-state')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const statePath = "../states"
const configs = {}

const normalizedPath = path.join(__dirname, statePath);
require("fs").readdirSync(normalizedPath).forEach(file => {
    const key = file.split('.').slice(0, -1).join('.')
    configs[key] = require(`${normalizedPath}/${key}`)
    configs[key].key = key
})

console.log('State configs', configs)

let updating = false;
provider.on('block', async blockNumber => {
    console.log('New block', blockNumber)
    if (updating === true) {
        return;
    }
    try {
        updating = true;
        await updateLogsState({ configs })
    } catch (error) {
        console.error(error.message)
    } finally {
        updating = false;
    }
})