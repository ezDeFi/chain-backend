'use strict'

const {ChainBackendError} = require('./error')

// Input
//  * config {Object}
//  * config.consumers {Array<Consumer>}
//  * config.mongoEndpoint {String}
//  * config.bscEndpoint {String}
function standardizeStartConfiguration(config) {
    if (!config) {
        throw new ChainBackendError('undefined configuration')
    }

    _validateConsumerList(config.consumers)
    _validateMongoEndpoint(config.mongoEndpoint)
    _validateBscEndpoint(config.bscEndpoint)

    return {
        consumers: config.consumers,
        mongoEndpoint: config.mongoEndpoint,
        bscEndpoint: config.bscEndpoint
    }
}

function _validateConsumerList(consumers) {
    if (Array.isArray(consumers) === false|| consumers.length === 0) {
        throw new ChainBackendError('invalid configuration "consumers"')
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

    if (url.protocol !== 'mongo:') {
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
