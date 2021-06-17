const { ethers } = require('ethers')
const { ZERO_HASH } = require('../helpers/constants').hexes
const contractABI = require('../ABIs/SFarm.json').abi
const accumulating = require('./factory/accumulating')

module.exports = (key) => {
    const SFarm = new ethers.Contract(process.env.FARM, contractABI)
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

            if (Object.keys(changes).length == 0) {
                return value
            }

            return Object.assign({...value}, changes)
        }
    })
}
