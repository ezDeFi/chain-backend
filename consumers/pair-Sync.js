const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Pair.json').abi
const update = require('./factory/update')
const { ZERO_ADDRESS } = require('../helpers/constants').hexes

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)

    const pair = new ethers.Contract(ZERO_ADDRESS, contractABI)
    const filter = pair.filters.Sync(null, null)
    delete filter.address

    return update({
        key,
        filter,

        applyLogs: (value, logs) => {
            if (!logs.length) {
                return value
            }
            value = {...value}
            logs.forEach(log => {
                const { address, data } = log
                const x = data.substr(2, 64).replace(/^0+/, '');
                const y = data.substr(66).replace(/^0+/, '');
                const v = `${x}/${y}`
                value[address] = v
            })
            return value
        }
    })
}
