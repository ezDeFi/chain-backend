const { ethers } = require('ethers')
const { ZERO_HASH, ZERO_ADDRESS } = require('../helpers/constants').hexes
const abiIERC20 = require('../ABIs/IERC20.json').abi
const accumulator = require('./factory/ac')

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)

    const IERC20 = new ethers.Contract(ZERO_ADDRESS, abiIERC20)
    const filter = IERC20.filters.Approval(process.env.FARM, null)
    delete filter.address

    return accumulator({
        key,
        filter,
        genesis: parseInt(process.env.FARM_GENESIS),

        applyLogs: (value, logs) => {
            value = {...value}

            // assume that the logs is sorted by blockNumber and transactionIndex
            logs.forEach(log => {
                const { address, topics } = log
                const spender = ethers.utils.getAddress('0x'+topics[2].slice(26))
                if (!value[spender]) {
                    value[spender] = {}
                }
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
