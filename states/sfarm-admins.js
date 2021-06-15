const { ethers } = require('ethers')
const { ZERO_HASH } = require('../helpers/constants').hexes
const contractABI = require('../ABIs/SFarm.json').abi
const accumulating = require('./factory/accumulating')

module.exports = (key) => {
    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
    const SFarm = new ethers.Contract(process.env.FARM, contractABI, provider)
    const filter = SFarm.filters.AuthorizeAdmin(null, null)

    return accumulating({
        key,
        filter,
        genesis: parseInt(process.env.FARM_GENESIS),

        applyLogs: (value, logs) => {
            const changes = {}

            // assume that the logs is sorted by blockNumber and transactionIndex
            for (let i = logs.length-1; i >= 0; --i) {
                const log = logs[i]
                const admin = '0x'+log.topics[1].slice(26)
                if (!changes.hasOwnProperty(admin)) {
                    const enable = log.data != ZERO_HASH
                    changes[admin] = enable
                }
            }

            return Object.assign({...value}, changes)
        }
    })
}
