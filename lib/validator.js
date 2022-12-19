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
        'mongoosePrefix',
        'consumerConstructors',
        'processorConfigs',
        'latency',
        'safeDepth',
        'blockTimestampCacheSize',
        'blockTimeStampInterpolatingRange',
        'logMinFreq',
    ]

    _validateConsumerConstructors(config.consumerConstructors)
    _validateMongoose(config.mongoose)
    _validateMongoosePrefix(config.mongoosePrefix)
    _validateProcessorConfig(config.processorConfigs)
    _validateSafeDepth(config.safeDepth)
    _validateBlockTimestampCacheSize(config.blockTimestampCacheSize)
    _validateBlockTimeStampInterpolatingRange(config.blockTimeStampInterpolatingRange)
    _validatelogMinFreq(config.logMinFreq)
    // TODO: validate config.latency

    const unknownProp = Object.keys(config).find(prop => !knownProps.includes(prop))
    if (unknownProp) {
        throw new ChainBackendError('configuration has unknown property: ' + unknownProp)
    }

    const defaultConfig = {
        safeDepth: 0,
        blockTimestampCacheSize: 4096,
        blockTimeStampInterpolatingRange: 1024,
        logMinFreq: 0,
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

function _validateMongoosePrefix(prefix) {
    if (prefix != null && typeof prefix !== 'string') {
        throw new ChainBackendError('invalid configuration "mongoosePrefix"')
    }
}

function _validateEthersProvider(provider) {
    if (!provider || !provider?.constructor?.name?.endsWith('JsonRpcProvider')) {
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

function _validateBlockTimestampCacheSize(value) {
    if (value == null) {
        return
    }

    if (!Number.isInteger(value) || value < 0) {
        throw new ChainBackendError(
            'invalid configuration "validateBlockTimestampCacheSize"'
        )
    }
}

function _validateBlockTimeStampInterpolatingRange(value) {
    if (value == null) {
        return
    }

    if (!Number.isInteger(value) || value < 0) {
        throw new ChainBackendError(
            'invalid configuration "validateBlockTimeStampInterpolatingRange"'
        )
    }
}

function _validatelogMinFreq(value) {
    if (value == null) {
        return
    }

    if (!Number.isInteger(value) || value < 0) {
        throw new ChainBackendError(
            'invalid configuration "validate_validatelogMinFreq"'
        )
    }
}

module.exports = {
    standardizeStartConfiguration,
}
