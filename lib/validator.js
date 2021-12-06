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

    const knownProps = [
        'mongoose',
        'consumerConstructors',
        'processorConfigs',
        'latency',
        'indexerEndpoint',
        'safeDepth',
    ]

    _validateConsumerConstructors(config.consumerConstructors)
    _validateMongoose(config.mongoose)
    _validateProcessorConfig(config.processorConfigs)
    _validateSafeDepth(config.safeDepth)
    // TODO: validate config.latency
    // TODO: validate config.indexerEndpoint

    const unknownProp = Object.keys(config).find(prop => !knownProps.includes(prop))
    if (unknownProp) {
        throw new ChainBackendError('configuration has unknown property: ' + unknownProp)
    }

    const defaultConfig = {
        safeDepth: 0,   // make sure it's not null
    }
    return Object.assign(defaultConfig, config)
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
    if (!provider || provider?.constructor?.name !== 'JsonRpcProvider') {
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

    const provider = config.getProvider()
    if (Array.isArray(provider)) {
        provider.forEach(_validateEthersProvider)
    } else {
        _validateEthersProvider(provider)
    }
    return true
}

function _validateSafeDepth(value) {
    if (value == null) {
        return
    }

    if (!Number.isInteger(value) || value < 0) {
        throw new ChainBackendError(
            'invalid configuration "validateSafeDepth"'
        )
    }
}

module.exports = {
    standardizeStartConfiguration
}
