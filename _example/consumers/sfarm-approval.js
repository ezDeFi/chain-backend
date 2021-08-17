const { ethers } = require('ethers')
const { ZERO_HASH, ZERO_ADDRESS } = require('../../helpers/constants').hexes
const abiIERC20 = require('../../ABIs/IERC20.json').abi
const accumulator = require('../../factory/ac')

// Input
//  * config.key {String}
//  * config.farm {String}
//  * config.farmGenesis {String}
module.exports = (config) => {
    const IERC20 = new ethers.Contract(ZERO_ADDRESS, abiIERC20)
    const filter = IERC20.filters.Approval(config.farm, null)
    delete filter.address

    return accumulator({
        key: config.key,
        filter: filter,
        genesis: parseInt(config.farmGenesis),

        applyLogs: (value, logs) => {
            value = {...value}

            // assume that the logs is sorted by blockNumber and transactionIndex
            logs.forEach(log => {
                const { address, topics } = log
                const spender = ethers.utils.getAddress('0x'+topics[2].slice(26))
                value[spender] = value[spender] ? { ...value[spender] } : {}
                if (log.data != ZERO_HASH) {
                    value[spender][address] = log.data
                } else {
                    delete value[spender][address]
                }
            })

            return value
        }
    })
}
