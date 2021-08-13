const { ethers } = require('ethers')
const { ZERO_HASH } = require('../../helpers/constants').hexes
const contractABI = require('../../ABIs/SFarm.json').abi
const accumulator = require('../../factory/ac')

// Input
//  * config.key {String}
//  * config.farm {String}
//  * config.farmGenesis {String}
//  * config.LogsStateModel {mongoose.Model}
function createConsumer(config) {
    const SFarm = new ethers.Contract(config.farm, contractABI)

    return accumulator({
        key: config.key,
        filter: SFarm.filters.AuthorizeAdmin(null, null),
        genesis: parseInt(config.farmGenesis),
        LogsStateModel: config.LogsStateModel,

        applyLogs: (value, logs) => {
            value = {...value}

            // assume that the logs is sorted by blockNumber and transactionIndex
            logs.forEach(log => {
                const address = ethers.utils.getAddress('0x'+log.topics[1].slice(26))
                if (log.data != ZERO_HASH) {
                    value[address] = true
                } else {
                    delete value[address]
                }
            })

            return value
        }
    })
}

// Input
//  * config.key {String}
//  * config.farm {String}
//  * config.farmGenesis {String}
function createConsumerFactory(config) {

    // Input
    //  * factoryConfig {Object}
    //  * factoryConfig.mongo {mongo} See 'mongo.js'.
    function consumerFactory(factoryConfig) {
        return createConsumer({
            key: config.key,
            farm: config.farm,
            farmGenesis: config.farmGenesis,
            LogsStateModel: factoryConfig.mongo.LogsStateModel
        })
    }

    return consumerFactory
}

module.exports = {
    createConsumer,
    createConsumerFactory
}
