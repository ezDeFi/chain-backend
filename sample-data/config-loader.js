'use strict'

const path = require('path')
const fs = require('fs')
const ethers = require('ethers')
const BigNumber = require('bignumber.js')

class ConfigFileError extends Error {
    constructor(file, attribute) {
        let message = file + ': ' + attribute

        super(message)        
        this.name = 'ConfigFileError'
    }
} 

// Descriptions
//  * Retrieve next configuration to make sample data. 
//  * Configurations is specify by files in directory
//    `_readConfigFileNames.CONFIG_DIRECTORY`.
//  * Configuration files MUST be name by increasing order to get correct
//    results.
//
// Output 
//  * {MakeConfig}
//  * {undefined} There is no more configuration.
//
// Errors
//  * ConfigFileError `random_count`.
function next() {
    let fileNames = _readConfigFileNames()

    if (fileNames.length === 0 || next._cursor === (fileNames.length - 1)) {
        return undefined
    } 

    next._cursor = (next._cursor === undefined) ? 0 : next._cursor + 1

    return _readConfigFile(fileNames[next._cursor])
}

// {Number}
next._cursor = undefined

// Descriptions
//  * Set iterator index to begin. 
function reset() {
    next._cursor = undefined
}

// Descriptions
//  * Retrieve list of configuration files.
//
// Output {Array<String>}
function _readConfigFileNames() {
    if (!_readConfigFileNames._paths) {
        let entries = fs.readdirSync(_readConfigFileNames._CONFIG_DIRECTORY, {
            withFileTypes: true
        })
        let fileEntries = entries.filter(entry => entry.isFile())
        let jsonEntries = fileEntries.filter(entry => {
            return path.extname(entry.name) === '.json'
        })

        _readConfigFileNames._paths = jsonEntries.map(entry => entry.name)
    }

    return _readConfigFileNames._paths
}

// {String} 
//
// Path to configuration directory.
_readConfigFileNames._CONFIG_DIRECTORY = path.join(__dirname, 'config')

// {Array<String>} 
//
// Relative paths to configuration files from `_CONFIG_DIRECTORY`.
_readConfigFileNames._paths = undefined

// Input
//  * filePath {String}
//
// Output {MakeConfig}
//
// Errors
//  * ConfigFileError `random_count`.
function _readConfigFile(fileName) {
    let filePath = path.join(_readConfigFileNames._CONFIG_DIRECTORY, fileName)
    let fileData = fs.readFileSync(filePath, 'utf-8')
    let config = JSON.parse(fileData)
    let error = _validateConfigFile(config)

    if (error) {
        throw new ConfigFileError(fileName, error)
    }

    return config
}

// Descriptions
//  * Check configuration is valid or not.
//  * This implementation does not test all conditions but important ones.
//
// Input
//  * config {Object}
//
// Output
//  * {undefined} Configuration is valid.
//  * {String} Attribute name which is invalid.
function _validateConfigFile(config) {
    if (!Number.isInteger(config.random_count)) {
        return 'random_count'
    }

    if (!Array.isArray(config.token_pairs)) {
        return 'token_pairs'
    }

    for (let i = 0; i < config.token_pairs.length; ++i) {
        let error = _validateTokenPairConfig(config.token_pairs[i])

        if (error) {
            return `token_pairs[${i}].${error}`
        }
    }

    return undefined
}

function _validateTokenPairConfig(tokenPair) {
    if (!ethers.utils.isAddress(tokenPair.token_a)) {
        return 'token_a'
    }

    if (!ethers.utils.isAddress(tokenPair.token_b)) {
        return 'token_b'
    }

    if (!Array.isArray(tokenPair.exchanges)) {
        return 'exchanges'
    }

    for (let i = 0; i < tokenPair.exchanges.length; ++i) {
        let error =  _validateExchange(tokenPair.exchanges[i])

        if (error) {
            return `exchanges[${i}].${error}`
        }
    }

    return undefined
}

function _validateExchange(exchange) {
    if (!_isValidExchangeName(exchange.name)) {
        return 'name'
    }

    let errorA = _validateReserveBoundary(exchange.boundary_a)

    if (errorA) {
        return 'boundary_a' + errorA
    }

    let errorB = _validateReserveBoundary(exchange.boundary_b)

    if (errorB) {
        return 'boundary_b' + errorB
    }

    return undefined
}

function _validateReserveBoundary(boundary) {
    if (!Array.isArray(boundary) || boundary.length !== 2) {
        return 'is not an array with 2 items'
    }

    if (!_isDecimalString(boundary[0])) {
        return '[1] as lower boundary of reserve'
    }

    if (!_isDecimalString(boundary[1])) {
        return '[2] as upper boundary of reserve'
    }

    return undefined
}

function _isValidExchangeName(name) {
    return _isValidExchangeName._exchangeSet.has(name)
}

// {Set<String>}
_isValidExchangeName._exchangeSet = new Set([
    'pancake',
    'pancake2',
    'bakery',
    'jul',
    'ape'
])

function _isDecimalString(value) {
    let number = new BigNumber(value, 10)

    return !number.isNaN()
}

module.exports = {
    next,
    reset
}
