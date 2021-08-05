const _ = require('lodash');
const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Pair.json').abi
const update = require('./factory/update')
const { ZERO_ADDRESS } = require('../helpers/constants').hexes
const PairModel = require('../models/PairModel')
const Bluebird = require('bluebird')
const { createSwapContext } = require('../services/swapx')

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)
    // PairModel.updateMany({}, {
    //     rank: null,
    //     // rate01: null,
    //     // rate10: null,
    // }).then(console.error).catch(console.error)

    const pair = new ethers.Contract(ZERO_ADDRESS, contractABI)
    const filter = pair.filters.Sync(null, null)
    delete filter.address

    return update({
        key,
        filter,

        applyLogs: async (value, logs) => {
            if (!logs.length) {
                return value
            }

            const changes = new Map()

            logs.forEach(log => {
                const { address, data } = log
                const x = data.substr(2, 64).replace(/^0+/, '');
                const y = data.substr(66).replace(/^0+/, '');
                const reserve0 = '0x'+x
                const reserve1 = '0x'+y
                changes.set(address, { reserve0, reserve1 })
            })

            // console.error({changes})

            await Bluebird.map(changes.entries(), ([address, value]) =>
                PairModel.updateOne({ address }, value, { upsert: true })
            )

            try {
                const context = createSwapContext({})
                await context.updateRank(changes)
            } catch (err) {
                console.error(err)
            }

            return value || true
        }
    })
}
