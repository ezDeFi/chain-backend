const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Factory.json').abi
const ac = require('./factory/ac')
const ConfigModel = require('../models/ConfigModel')
const Bluebird = require('bluebird')

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)

    const genesis = 586851
    const factory = new ethers.Contract('0xBCfCcbde45cE874adCB698cC183deBcF17952812', contractABI)
    const filter = factory.filters.PairCreated(null, null)

    return ac({
        key,
        filter,
        genesis,

        applyLogs: async (value, logs) => {
            if (!logs.length) {
                return value
            }

            const changes = {}

            logs.forEach(log => {
                const { topics, data } = log
                const token0 = ethers.utils.getAddress('0x' + topics[1].substr(26))
                const token1 = ethers.utils.getAddress('0x' + topics[2].substr(26))
                const pair = ethers.utils.getAddress('0x' + data.substr(26, 40))
                changes[`${key}-${token0}-${token1}`] = pair
            })

            await Bluebird.map(Object.entries(changes), ([key, value]) => ConfigModel.updateOne( { key }, { value }, { upsert: true } ))

            return value || true
        }
    })
}
