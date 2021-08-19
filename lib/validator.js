'use strict'

const {Mongoose} = require('mongoose')
const {JsonRpcProvider} = require('@ethersproject/providers')
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
    _validateHeadProcessorConfig(config.headProcessorConfig)
    _validatePastProcessorConfig(config.pastProcessorConfig)

    if (Object.keys(config).length  > 5) {
        throw new ChainBackendError('configuration has additional properties')
    }

    return Object.assign({}, config)
}

function _validateConsumerConstructors(constructors) {
    if (Array.isArray(constructors) === false || constructors.length === 0) {
        throw new ChainBackendError(
            'invalid configuration "consumerConstructors"'
        )
    }

    for (let index = 0; index < constructors.length; ++index) {
        if (typeof constructors[index] !== 'function') {
            throw new ChainBackendError(
                `invalid configuration "consumerConstructors[${index}]"`
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
        throw new ChainBackendError(
            'invalid configuration "ethersProvider"'
        )
    }
}

function _validateHeadProcessorConfig(config) {
    if (!_isValidProcessorConfig(config)) {
        throw new ChainBackendError(
            'invalid configuration "headProcessorConfig"'
        )
    }
}

function _validatePastProcessorConfig(config) {
    if (!_isValidProcessorConfig(config)) {
        throw new ChainBackendError(
            'invalid configuration "pastProcessorConfig"'
        )
    }
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
