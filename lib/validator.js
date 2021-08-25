'use strict'

const { config } = require('bluebird')
const {ChainBackendError} = require('./error')

// Input
//  * config {Object} It is similar like 'config' from 'startWorker(config)'
//    in file 'start-worker.js'.
//
// Output {Object} Valid configuration. It is similar like 'config' from
//        'startWorker(config)'.
//
// Errors
//  * ChainBackendError
function standardizeStartConfiguration(config) {
    if (!config) {
        throw new ChainBackendError('undefined configuration')
    }

    _validateConsumerConstructors(config.consumerConstructors)
    _validateMongoose(config.mongoose)
    _validateEthersProvider(config.ethersProvider)
    _validateProcessorConfig(config.processorConfigs)

    if (Object.keys(config).length > 4) {
        throw new ChainBackendError('configuration has additional properties')
    }

    return Object.assign({}, config)
}

function _validateConsumerConstructors(constructors) {
    if (typeof constructors !== 'object') {
        throw new ChainBackendError(
            'invalid configuration "consumerConstructors"'
        )
    }

    for (const key in constructors) {
        if (typeof constructors[key] !== 'function') {
            throw new ChainBackendError(
                `invalid configuration "consumerConstructors[${key}]"`
            )
        }
    }
}

// Input
//  * consumer {Consumer}
function _isValidConsumer(consumer) {
    if (typeof consumer !== 'object') {
        return false
    }

    if (typeof consumer.key !== 'string' || consumer.length === 0) {
        return false
    } 

    if (typeof consumer.getRequests !== 'function') {
        return false
    }

    return true
}

function _validateMongoose(connection) {
    if (!connection || connection?.constructor?.name !== 'Mongoose') {
        throw new ChainBackendError('invalid configuration "mongoose"')
    }
}

function _validateEthersProvider(provider) {
    if (!provider || provider?.constructor?.name != 'JsonRpcProvider') {
        throw new ChainBackendError(
            'invalid configuration "ethersProvider"'
        )
    }
}

function _validateProcessorConfig(configs) {
    Object.values(configs).forEach(config => {
        if (!_isValidProcessorConfig(config)) {
            throw new ChainBackendError(
                'invalid configuration "processorConfigs"'
            )
        }
    })
}

function _isValidProcessorConfig(config) {
    if (
        typeof config !== 'object' ||
        typeof config.getLogs !== 'function' ||
        typeof config.getConcurrency !== 'function' ||
        typeof config.getSize !== 'function'
    ) {
        return false
    }

    return true
}

module.exports = {
    standardizeStartConfiguration
}
