const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Factory.json').abi
const ac = require('./factory/ac')

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)

    const genesis = 470617
    const factory = new ethers.Contract('0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7', contractABI)
    const filter = factory.filters.PairCreated(null, null)

    return ac({
        key,
        filter,
        genesis,

        applyLogs: (value, logs) => {
            if (!logs.length) {
                return value
            }
            value = {...value}
            logs.forEach(log => {
                const { topics, data } = log
                const token0 = ethers.utils.getAddress('0x' + topics[1].substr(26))
                const token1 = ethers.utils.getAddress('0x' + topics[2].substr(26))
                const pair = ethers.utils.getAddress('0x' + data.substr(26, 40))
                value[pair] = { token0, token1 }
            })
            return value
        }
    })
}
