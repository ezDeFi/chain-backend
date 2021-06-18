const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Pair.json').abi
const syncConsumerFactory = require('./factory/sync')

// Description
//  * Create a new consumer that work on pair USDT-BUSD.
//
// Input
//  * key {String}
//  * mongodb {service.Mongodb}
//
// Output {Object} See output of `factory.syncConsumerFactory()`
function pcUsdtBusdConsumer(key, mongodb) {
    const address = '0xD1F12370b2ba1C79838337648F820a87eDF5e1e6'
    const SFarm = new ethers.Contract(address, contractABI)
    const filter = SFarm.filters.Sync(null, null)
    const genesis = parseInt(4206097)

    function applyLogs(value, logs) {
        if (logs.length) {
            console.error(logs[logs.length-1].data)
            return logs[logs.length-1].data
        }

        return value
    }

    return syncConsumerFactory({
        key,
        filter,
        mongodb,
        applyLogs,
        genesis,
    })
}
module.exports = pcUsdtBusdConsumer
