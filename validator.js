'use strict'

const {Mongoose} = require('mongoose')
const {JsonRpcProvider} = require('@ethersproject/providers')
const {ChainBackendError} = require('./error')

// Input
//  * config {WorkerConfiguration}
//
// Output {WorkerConfiguration}
function standardizeStartConfiguration(config) {
    if (!config) {
        throw new ChainBackendError('undefined configuration')
    }

    _validateConsumerList(config.consumers)
    _validateMongoose(config.mongoose)
    _validateEthersProvider(config.ethersProvider)
    _validateHeadProcessorConfig(config.headProcessorConfig)
    _validatePastProcessorConfig(config.pastProcessorConfig)

    return config
}

function _validateConsumerList(consumers) {
    if (Array.isArray(consumers) === false || consumers.length === 0) {
        throw new ChainBackendError('invalid configuration "consumers"')
    }

    for (let index = 0; index < consumers.length; ++index) {
        if (!_isValidConsumer(consumers[index])) {
            throw new ChainBackendError(
                `invalid configuration "consumers[${index}]"`
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
    if ((connection instanceof Mongoose) === false) {
        throw new ChainBackendError('invalid configuration "mongoose"')
    }
}

function _validateEthersProvider(provider) {
    if ((provider instanceof JsonRpcProvider) === false) {
        throw new ChainBackendError('invalid configuration "ethersProvider"')
    }
}

function _validateHeadProcessorConfig(config) {
    if (!_isValidProcessorConfig(config)) {
        throw new ChainBackendError('invalid configuration "headProcessorConfig"')
    }
}

function _validatePastProcessorConfig(config) {
    if (!_isValidProcessorConfig(config)) {
        throw new ChainBackendError('invalid configuration "pastProcessorConfig"')
    }
}

function _isValidProcessorConfig(config) {
    if (
        typeof config !== 'object' ||
        typeof config.getLogs !== 'function' ||
        typeof config.getConcurency !== 'function' ||
        typeof config.getSize !== 'function'
    ) {
        return false
    }

    return true
}

module.exports = {
    standardizeStartConfiguration
}
