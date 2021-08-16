'use strict'

const {ChainBackendError} = require('./error')

// Input
//  * config {Object}
//  * config.createConsumerFunctions {Array<Consumer>}
//  * config.mongoEndpoint {String}
//  * config.bscEndpoint {String}
function standardizeStartConfiguration(config) {
    if (!config) {
        throw new ChainBackendError('undefined configuration')
    }

    _validateConsumerFactoryList(config.createConsumerFunctions)
    _validateMongoEndpoint(config.mongoEndpoint)
    _validateBscEndpoint(config.bscEndpoint)

    return {
        createConsumerFunctions: config.createConsumerFunctions,
        mongoEndpoint: config.mongoEndpoint,
        bscEndpoint: config.bscEndpoint,
    }
}

function _validateConsumerFactoryList(factories) {
    if (Array.isArray(factories) === false|| factories.length === 0) {
        throw new ChainBackendError('invalid configuration "createConsumerFunctions"')
    }

    for (let index = 0; index < factories.length; ++index) {
        if ((typeof factories[index]) !== 'function') {
            throw new ChainBackendError('invalid configuration "createConsumerFunctions"')
        }
    }
}

function _validateMongoEndpoint(endpoint) {
    let url

    try {
        url = new URL(endpoint)
    }
    catch (error) {
        throw new ChainBackendError('invalid configuration "mongoEndpoint"', error)
    }

    if (url.protocol !== 'mongodb:') {
        throw new ChainBackendError('invalid configuration "mongoEndpoint"')
    }
}

function _validateBscEndpoint(endpoint) {
    let url

    try {
        url = new URL(endpoint)
    }
    catch (error) {
        throw new ChainBackendError('invalid configuration "bscEndpoint"', error)
    }

    if (['http:', 'https:'].includes(url.protocol) === false) {
        throw new ChainBackendError('invalid configuration "bscEndpoint"')
    }
}

module.exports = {
    standardizeStartConfiguration
}
