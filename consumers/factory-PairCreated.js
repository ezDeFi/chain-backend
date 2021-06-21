const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Factory.json').abi
const syncUpdate = require('./factory/sync-update')
const { ZERO_ADDRESS } = require('../helpers/constants').hexes

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)

    const pair = new ethers.Contract(ZERO_ADDRESS, contractABI)
    const filter = pair.filters.PairCreated(null, null)
    filter.address = [
        '0xBCfCcbde45cE874adCB698cC183deBcF17952812',   // Pancake
        '0xaC653cE27E04C6ac565FD87F18128aD33ca03Ba2',   // Thug
        '0x8a1E9d3aEbBBd5bA2A64d3355A48dD5E9b511256',   // Burger
        '0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7',   // Bakery
        '0x553990F2CBA90272390f62C5BDb1681fFc899675',   // Julswap
    ]

    return syncUpdate({
        key,
        filter,

        applyLogs: (value, logs) => {
            if (!logs.length) {
                return value
            }
            value = {...value}
            logs.forEach(log => {
                const { topics, data, address: factory } = log
                const token0 = ethers.utils.getAddress('0x' + topics[1].substr(26))
                const token1 = ethers.utils.getAddress('0x' + topics[1].substr(26))
                const pair = ethers.utils.getAddress('0x' + data.substr(26, 40))
                value[pair] = { factory, token0, token1 }
            })
            return value
        }
    })
}
