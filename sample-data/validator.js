'use strict'

const BigNumber = require('bignumber.js')
const ethers = require('ethers')

// Descriptions
//  * To report errors during reading configuration file.
class MakeConfigError extends Error {
    // Input
    //  * attributePath {String} Path to invalid attribute, for example:
    //    `token_pairs[].address_a`.
    //  * message {String}
    constructor(attributePath, message) {
        super(attributePath + ': ' + message)        
        this.name = 'MakeConfigError'
    }
}

// Descriptions
//  * Check configuration is valid or not and return error.
//
// Input
//  * config {MakeConfig}
//
// Output {ValidMakeConfig}
//
// Error
//  * MakeConfigError `seedPairCount`
//  * MakeConfigError `seedValue`
//  * MakeConfigError `pairSpec[]*`
function standardizeMakeConfig(config) {
    let seedPairCount = _standardizeSeedPairCount(config.seedPairCount)

    if (seedPairCount.error) {
        throw new MakeConfigError('seedPairCount', seedPairCount.error)
    }

    let seedValue = _standardizeSeedValue(config.seedValue)

    if (seedValue.error) {
        throw new MakeConfigError('seedValue', seedValue.error)
    }

    let pairSpecs = _standardizePairSpecs(config.pairSpecs)

    if (pairSpecs.error) {
        throw new MakeConfigError(
            'pairSpec' + pairSpecs.errorPath, 
            pairSpecs.error
        )
    }

    return {
        seedPairCount: seedPairCount.value, 
        seedValue: seedValue.value, 
        pairSpecs: pairSpecs.value
    }
}

// Input
//  * value {String} String with of with out prefix `0x`.
//
// Output {String} A string without prefix `0x`, lowercase.
function _standardizeHeximalString(value) {
    let prefix = value.slice(0, 2)

    return prefix === '0x' 
        ? value.slice(2).toLowerCase() 
        : value.toLowerCase()
}

// Input
//  * rawValue {Number}
//
// Output {Object} 
//  * error {undefined | String}
//  * value {undefiend | UnsignedInteger}
function _standardizeSeedPairCount(rawValue) {
    if (rawValue === undefined) {
        return {value: undefined}
    }

    if (!Number.isInteger(rawValue) || rawValue < 0) {
        return {error: 'Not an unsigned integer'}
    }

    return {value: rawValue}
}

// Input
//  * rawValue {Number | DecimalString | BigNumber} Positive integer.
//
// Output {Object} 
//  * error {undefined | String}
//  * value {undefiend | BigNumber}
function _standardizeSeedValue(rawValue) {
    if (rawValue === undefined) {
        return {value: undefined}
    }
    
    let value = new BigNumber(rawValue)

    if (value.isNaN() || !value.isInteger() || value.lte(0)) {
        return {error: 'Not a positive integer'}
    }

    return {value}
}

// Input
//  * rawPairSpecs {Array<MakePairSpec>}
//
// Output {Object} 
//  * errorPath {undefined | String}
//  * error {undefined | String}
//  * value {undefiend | Array<ValidMakePairSpec>}
function _standardizePairSpecs(rawSpecs) {
    if (!Array.isArray(rawSpecs)) {
        return {errorPath: '', error: 'Not an array'}
    }

    let specs = []
    
    for (let index = 0; index < rawSpecs.length; ++index) {
        let spec = _standardizePairSpec(rawSpecs[index])

        if (spec.error) {
            return {
                errorPath: `[${index}].${spec.errorPath}`, 
                error: spec.error
            }
        }

        specs.push(spec.value)
    }

    return {value: specs}
}

// Input
//  * rawSpec {MakePairSpec}
//
// Output {Object} 
//  * errorPath {undefined | String}
//  * error {undefined | String}
//  * value {undefiend | ValidMakePairSpec}
function _standardizePairSpec(rawSpec) {
    if (!ethers.utils.isAddress(rawSpec.addressA)) {
        return {errorPath: 'addressA', error: 'Not an ETH address'}
    }

    if (!ethers.utils.isAddress(rawSpec.addressB)) {
        return {errorPath: 'addressB', error: 'Not an ETH address'}
    }

    let exchanges = _standardizeExchangeSpecs(rawSpec.exchanges)

    if (exchanges.error) {
        return {
            errorPath: 'exchanges' + exchanges.errorPath, 
            error: exchanges.error
        }
    }

    return {
        value: {
            addressA: _standardizeHeximalString(rawSpec.addressA),
            addressB: _standardizeHeximalString(rawSpec.addressB),
            exchanges: exchanges.value
        }
    }
}

// Input
//  * rawExchanges {Array<MakeExchangeSpec>}
//
// Output {Object} 
//  * errorPath {undefined | String}
//  * error {undefined | String}
//  * value {undefiend | Array<ValidMakeExchangeSpec>}
function _standardizeExchangeSpecs(rawExchanges) {
    if (!Array.isArray(rawExchanges)) {
        return {errorPath: '', error: 'Not an array'}
    }

    let exchanges = []

    for (let index = 0; index < rawExchanges.length; ++index) {
        let exchange =  _validateExchangeSpec(rawExchanges[index])

        if (exchange.error) {
            return {
                errorPath: `[${index}]${exchange.errorPath}`,
                error: exchange.error
            }
        }

        exchanges.push(exchange.value)
    }    

    return {value: exchanges}
}

// Input
//  * rawExchange {MakeExchangeSpec}
//
// Output {Object} 
//  * errorPath {undefined | String}
//  * error {undefined | String}
//  * value {undefiend | ValidMakeExchangeSpec}
function _validateExchangeSpec(rawExchange) {
    if (!_isValidExchangeName(rawExchange.name)) {
        return {errorPath: '.name', error: 'Not an exchange'}
    }

    let boundaryA = _standardizeHeximalRandomBoundary(rawExchange.boundaryA)

    if (boundaryA.error) {
        return {
            errorPath: '.boundaryA' + boundaryA.errorPath, 
            error: boundaryA.error
        }
    }

    let boundaryB = _standardizeHeximalRandomBoundary(rawExchange.boundaryB)

    if (boundaryB.error) {
        return {
            errorPath: '.boundaryB' + boundaryB.errorPath, 
            error: boundaryB.error
        }
    }

    return {
        value: {
            name: rawExchange.name,
            boundaryA: boundaryA.value,
            boundaryB: boundaryB.value
        }
    }
}

// Input
//  * boundary {HeximalRandomBoundary}
//
// Output {Object} 
//  * errorPath {undefined | String}
//  * error {undefined | String}
//  * value {undefiend | UnsignedBigIntRandomBoundary}
function _standardizeHeximalRandomBoundary(boundary) {
    if (!Array.isArray(boundary) || boundary.length !== 2) {
        return {errorPath: '', error: 'Not an array with 2 items'}
    }

    let lower = new BigNumber(boundary[0], 16)

    if (lower.isNaN() || !lower.isInteger() || lower.isNegative()) {
        return {errorPath: '[0]', error: 'Not an unsigned integer'}
    }

    let upper = new BigNumber(boundary[1], 16)

    if (upper.isNaN() || !upper.isInteger() || upper.isNegative()) {
        return {errorPath: '[1]', error: 'Not an unsigned integer'}
    }

    if (upper.lte(lower)) {
        return {
            errorPath: '', 
            error: 'Upper is less than or equal lower boundary'
        }
    }

    return {
        value: [lower, upper]
    }
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

module.exports = {
    standardizeMakeConfig,
    MakeConfigError
}
