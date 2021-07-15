const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Factory.json').abi
const ac = require('./factory/ac')
const { ZERO_ADDRESS } = require('../helpers/constants').hexes
const ConfigModel = require('../models/ConfigModel')
const Bluebird = require('bluebird')

const FACTORY = {
    pancake: '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
    bakery: '0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7',
    pancake2: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    jul: '0x553990F2CBA90272390f62C5BDb1681fFc899675',
    ape: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
}

const GENESIS = {
    pancake: 586851,
    bakery: 470617,
    pancake2: 6809737,
    jul: 784352,
    ape: 4855901,
}
const genesis = Math.min(...Object.values(GENESIS))

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)
    // ConfigModel.deleteMany({ key: new RegExp(`^${key}-.*`) }).then(console.error).catch(console.error)

    const pair = new ethers.Contract(ZERO_ADDRESS, contractABI)
    const filter = pair.filters.PairCreated(null, null)
    filter.address = Object.values(FACTORY)

    return ac({
        key,
        filter,
        genesis,

        applyLogs: async (value, logs) => {
            if (!logs.length) {
                return value
            }
            value = (value || 0) + logs.length

            const changes = {}

            logs.forEach(log => {
                const { topics, data, address: factory } = log
                const token0 = ethers.utils.getAddress('0x' + topics[1].substr(26))
                const token1 = ethers.utils.getAddress('0x' + topics[2].substr(26))
                const pair = ethers.utils.getAddress('0x' + data.substr(26, 40))
                changes[`${key}-${pair}`] = { factory, token0, token1 }
                console.error(`${key}-${pair}`)
            })

            await Bluebird.map(Object.entries(changes), ([key, value]) => ConfigModel.create({ key, value }))

            return value
        }
    })
}
