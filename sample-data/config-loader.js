'use strict'

const path = require('path')
const fs = require('fs')
const ethers = require('ethers')
const BigNumber = require('bignumber.js')

// Descriptions
//  * To report errors during reading configuration file.
class ConfigFileError extends Error {
    // Input
    //  * file {String} File name or path refer to invalid configruation file.
    //  * attributePath {String} Path to invalid attribute, for example:
    //    `token_pairs[].address_a`.
    constructor(file, attributePath) {
        let message = file + ': ' + attributePath

        super(message)        
        this.name = 'ConfigFileError'
    }
} 

// Descriptions
//  * Retrieve next configuration to make sample data. 
//  * Configurations is specify by JSON files in directory `./config`.
//
// Output 
//  * {MakeConfig} Configuration.
//  * {undefined} There is no more configuration.
//
// Errors
//  * ConfigFileError `make_count`.
//  * ConfigFileError `seed_pair_count`.
//  * ConfigFileError `pair_specs.*`.
function next() {
    let fileNames = _getConfigFileNames()

    if (fileNames.length === 0 || next._cursor === (fileNames.length - 1)) {
        return undefined
    } 

    next._cursor = (next._cursor === undefined) ? 0 : next._cursor + 1

    return _readConfigFile(fileNames[next._cursor])
}

// * {UnsignedInteger} Index that point to specific configuration.
// * {undefined} Cursor point to nowhere, mean next call return first
//   configuration.
next._cursor = undefined

// Descriptions
//  * Set configuration iterator index to no where, mean next call return
//    first configuration.
function reset() {
    next._cursor = undefined
}

// Descriptions
//  * Retrieve list of configuration files.
//  * Invoke to file system at the first time, after that return cached
//    results.
//
// Output {Array<String>}
function _getConfigFileNames() {
    if (!_getConfigFileNames._paths) {
        let entries = fs.readdirSync(
            _getConfigFileNames._CONFIG_DIRECTORY, 
            {withFileTypes: true}
        )
        let fileEntries = entries.filter(entry => entry.isFile())
        let jsonEntries = fileEntries.filter(entry => {
            return path.extname(entry.name) === '.json'
        })

        _getConfigFileNames._paths = jsonEntries.map(entry => entry.name)
    }

    return _getConfigFileNames._paths
}

// {String} 
//
// Path to directory that contains configuration files.
_getConfigFileNames._CONFIG_DIRECTORY = path.join(__dirname, 'config')

// {Array<String>} 
//
// Relative paths to configuration files from `_CONFIG_DIRECTORY`.
_getConfigFileNames._paths = undefined

// Input
//  * filePath {String}
//
// Output {MakeConfig}
//
// Errors
//  * ConfigFileError `make_count`.
//  * ConfigFileError `seed_pair_count`.
//  * ConfigFileError `token_pairs`.
function _readConfigFile(fileName) {
    let filePath = path.join(_getConfigFileNames._CONFIG_DIRECTORY, fileName)
    let fileData = fs.readFileSync(filePath, 'utf-8')
    let config = JSON.parse(fileData)
    let error = _validateConfig(config)

    if (error) {
        throw new ConfigFileError(fileName, error)
    }

    return config
}

// Descriptions
//  * Check configuration is valid or not and return error.
//
// Input
//  * config {Object}
//
// Output
//  * {undefined} Configuration is valid.
//  * {String} Attribute path name which is invalid.
function _validateConfig(config) {
    if (!Number.isInteger(config.make_count) || config.make_count < 0) {
        return 'make_count'
    }

    if (!_isValidSeedPairCount(config.seed_pair_count)) {
        return 'seed_pair_count'
    }

    if (!Array.isArray(config.pair_specs)) {
        return 'pair_specs'
    }

    for (let i = 0; i < config.pair_specs.length; ++i) {
        let error = _validatePairSpec(config.pair_specs[i])

        if (error) {
            return `pair_specs[${i}].${error}`
        }
    }

    return undefined
}

// Input
//  * value {any}
//
// Output
//  * {true} Input is undefined or non-negative integer.
//  * {false}
function _isValidSeedPairCount(value) {
    if (value === undefined) {
        return true
    }
    
    if (Number.isInteger(value) && value >= 0) {
        return true
    } 

    return false
}

// Input
//  * spec {Object}
//
// Output
//  * {undefined} Specification is valid.
//  * {String} Attribute path name which is invalid.
function _validatePairSpec(spec) {
    if (!ethers.utils.isAddress(spec.address_a)) {
        return 'address_a'
    }

    if (!ethers.utils.isAddress(spec.address_b)) {
        return 'address_b'
    }

    if (!Array.isArray(spec.exchanges)) {
        return 'exchanges'
    }

    for (let i = 0; i < spec.exchanges.length; ++i) {
        let error =  _validateExchangeSpec(spec.exchanges[i])

        if (error) {
            return `exchanges[${i}].${error}`
        }
    }

    return undefined
}

// Input
//  * spec {Object}
//
// Output
//  * {undefined} Specification is valid.
//  * {String} Attribute path name which is invalid.
function _validateExchangeSpec(spec) {
    if (!_isValidExchangeName(spec.name)) {
        return 'name'
    }

    let errorA = _validateHeximalRandomBoundary(spec.boundary_a)

    if (errorA) {
        return 'boundary_a' + errorA
    }

    let errorB = _validateHeximalRandomBoundary(spec.boundary_b)

    if (errorB) {
        return 'boundary_b' + errorB
    }

    return undefined
}

// Input
//  * spec {Object}
//
// Output
//  * {undefined} Boundary is invalid.
//  * {String} Attribute path name which is invalid.
function _validateHeximalRandomBoundary(boundary) {
    if (!Array.isArray(boundary) || boundary.length !== 2) {
        return 'is not an array with 2 items'
    }

    if (!_isHeximalString(boundary[0])) {
        return '[1] as lower boundary of reserve'
    }

    if (!_isHeximalString(boundary[1])) {
        return '[2] as upper boundary of reserve'
    }

    return undefined
}

// Input
//  * name {String}
//
// Output
//  * {true} Input is a valid exchange name.
//  * {false}
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

// Input
//  * value {String}
//
// Output
//  * {true} Input is a heximal string.
//  * {false}
function _isHeximalString(value) {
    if (typeof value !== 'string' || value.length === 0) {
        return false
    }

    let number = new BigNumber(value, 16)

    return number.isNaN() === false
}

module.exports = {
    next,
    reset
}
