const { ethers } = require('ethers')
const contractABI = require('../../ABIs/UniswapV2Pair.json').abi
const sync = require('../../consumers/factory/sync')

module.exports = (key) => {
    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    const SFarm = new ethers.Contract("0xD1F12370b2ba1C79838337648F820a87eDF5e1e6", contractABI)
    const filter = SFarm.filters.Sync(null, null)

    return sync({
        key,
        filter,
        genesis: parseInt(4206097),

        applyLogs: (value, logs) => {
            if (logs.length) {
                console.error(logs[logs.length-1].data)
                return logs[logs.length-1].data
            }
            return value
        }
    })
}
