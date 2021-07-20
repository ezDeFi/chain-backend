const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Factory.json').abi
const ac = require('./factory/ac')
const { ZERO_ADDRESS } = require('../helpers/constants').hexes
const PairModel = require('../models/PairModel')
const Bluebird = require('bluebird')
const { SERVICES } = require('../services/swapx')

const genesis = Math.min(...Object.values(SERVICES).map(s => s.factoryBlock))

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)
    // PairModel.deleteMany({}).then(console.error).catch(console.error)

    const pair = new ethers.Contract(ZERO_ADDRESS, contractABI)
    const filter = pair.filters.PairCreated(null, null)
    filter.address = Object.values(SERVICES).map(s => s.factory)

    return ac({
        key,
        filter,
        genesis,

        applyLogs: async (value, logs) => {
            if (!logs.length) {
                return value
            }
            value = (value || 0) + logs.length

            const changes = new Map()

            logs.forEach(log => {
                const { topics, data, address: factory } = log
                const token0 = ethers.utils.getAddress('0x' + topics[1].substr(26))
                const token1 = ethers.utils.getAddress('0x' + topics[2].substr(26))
                const pair = ethers.utils.getAddress('0x' + data.substr(26, 40))
                changes.set(pair, { factory, token0, token1 })
            })

            await Bluebird.map(changes.entries(),
                ([address, {factory, token0, token1}]) => PairModel.updateOne({ address }, { factory, token0, token1 }, { upsert: true })
            )

            return value
        }
    })
}
