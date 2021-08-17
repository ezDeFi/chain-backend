const { ethers } = require('ethers')
const { ZERO_HASH } = require('../../helpers/constants').hexes
const contractABI = require('../../ABIs/SFarm.json').abi
const createAccumulatorConsumer = require('../../factory/ac')

// Input
//  * config.key {String}
//  * config.farm {String}
//  * config.farmGenesis {String}
//  * config.mongo {MongoService}
//
// Output {Object}
//  * key {String}
//  * getRequests {function(?)}
function createConsumer(config) {
    const SFarm = new ethers.Contract(config.farm, contractABI)

    return createAccumulatorConsumer({
        key: config.key,
        filter: SFarm.filters.AuthorizeAdmin(null, null),
        genesis: parseInt(config.farmGenesis),
        mongo: config.mongo,

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
//
// Output {function createConsumer()}
function createConsumerFactory(config) {

    // Input
    //  * factoryConfig {Object}
    //  * factoryConfig.mongo {mongo} See 'mongo.js'.
    function consumerFactory(factoryConfig) {
        return createConsumer({
            key: config.key,
            farm: config.farm,
            farmGenesis: config.farmGenesis,
            mongo: factoryConfig.mongo
        })
    }

    return consumerFactory
}

module.exports = {
    createConsumer,
    createConsumerFactory
}
