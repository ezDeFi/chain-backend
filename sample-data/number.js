'use strict'

// APIs
//  * randomUnsignedBigInt()
//  * randomUnsignedBigInt.seed()
//  * toHeximal()
//  * toDecimal()
//
// Example 1
//  let a = randomUnsignedBigInt(0, 100)
//  let b = randomUnsignedBigInt('1000', '100000000')
//  let c = randomUnsignedBigInt('1000', new BigNumber('1000000000000'))
//
// Example 2
//  randomUnsignedBigInt.seed(56473)
//  let n = randomUnsignedBigInt(100, 200)

const BigNumber = require('bignumber.js')

// Input
//  * min {Number | DecimalString | BigNumber} Non negative integer.
//  * max {Number | DecimalString | BigNumber}
//
// Output {BigNumber}
//
// Errors
//  * Error `Invalid boundary values`
function randomUnsignedBigInt(min, max) {
    let minBigNumber = new BigNumber(min)
    let maxBigNumber = new BigNumber(max)

    return _randomUnsignedBigInt(minBigNumber, maxBigNumber)
}

// Descriptions
//  * Set the first seed of random in range [min, max].
//
// Input
//  * min {Number | DecimalString | BigNumber} Lower bound of random.
//  * min {Number | DecimalString | BigNumber} Upper bound of random.
//  * value {Number | DecimalString | BigNumber} Positive integer number.
//
// Errors
//  * Error `Invalid seed value`
randomUnsignedBigInt.seed = function(min, max, value) {
    let minBigNumber = new BigNumber(min)
    let maxBigNumber = new BigNumber(max)
    let seedBigNumber = new BigNumber(value)

    _validateRandomBoundary(minBigNumber, maxBigNumber)
    _validateRandomSeed(seedBigNumber)    

    let key = _getRandomKey(minBigNumber, maxBigNumber)

    _randomUnsignedBigInt._seedMap.set(key, seedBigNumber)
}

// Input
//  * number {BigNumber}
//
// Output {DecimalString}
function toDecimal(number) {
    return _numberToString(number, 10)
}

// Input
//  * number {BigNumber}
//
// Output {HeximalString}
//
// Errors
//  * Error `Not an integer`
function toHeximal(number) {
    return _numberToString(number, 16)
}

// Input
//  * min {BigNumber} Non negative integer.
//  * max {BigNumber}
//
// Output {BigNumber}
function _randomUnsignedBigInt(min, max) {
    _validateRandomBoundary(min, max)

    let key = _getRandomKey(min, max)
    let previousSeed = _randomUnsignedBigInt._seedMap.get(key) ||
        _getFirstSeed(min, max)
    let [multipler, additional] = _getRandomContext(key, min, max)
    let nextSeed = previousSeed
        .times(multipler)
        .plus(additional)
    let range = max.plus(1).minus(min)
    let rand = _divToRemainer(nextSeed, range)
    let result = min.plus(rand)

    _randomUnsignedBigInt._seedMap.set(key, result)

    return result
}

// {Map<RandomKey, BigNumber>}
_randomUnsignedBigInt._seedMap = new Map()

// Map<RandomKey, Array[]>
//  * Array[0] {BigNumber} Multipler
//  * Array[1] {BigNumber} Additional
_randomUnsignedBigInt._contextMap = new Map()

// Input
//  * min {BigNumber}
//  * max {BigNumber}
//
// Errors
//  * Error `Invalid boundary values`
function _validateRandomBoundary(min, max) {
    if (
        !min.isInteger() || 
        !max.isInteger() ||
        min.isNegative() ||
        max.isNegative() ||
        max.lte(min)
    ) {
        throw Error('Invalid boundary values')
    }
}

// Input
//  * value {BigNumber}
//
// Errors
//  * Error `Invalid seed value`
function _validateRandomSeed(value) {
    if (!value.isInteger() || value.lte(0)) {
        throw Error('Invalid seed value')
    }
}

// Input
//  * min {BigNumber}
//  * max {BigNumber}
//
// Output {RandomKey}
function _getRandomKey(min, max) {
    return toHeximal(min) + '/' + toHeximal(max)
}

// Input
//  * key {RandomKey}
//  * min {BigNumber}
//  * max {BigNumber}
//
// Output {Array}
//  * [0] {BigNumber} Multipler for random in rage [min, max].
//  * [1] {BigNumber} Additional for random in range [min, max].
function _getRandomContext(key, min, max) {
    let context = _randomUnsignedBigInt._contextMap.get(key) 
    
    if (!context) {
        context = [
            _getRandomMultipler(min, max),
            _getRanomAdditional(min, max)
        ]
        _randomUnsignedBigInt._contextMap.set(key, context)
    }
    
    return context
}

// Descriptions
//  * Calculate first seed value for random in range [min, max].
//  * Formular: output = min + max + minValue
//
// Input
//  * min {BigNumber}
//  * max {BigNumber}
//
// Output {BigNumber}
function _getFirstSeed(min, max) {
    let sum = min.plus(max)
    let diff = max.minus(min)
    let product = sum.times(diff)
    let minValue = 998776 // it's just a random value

    return product.plus(minValue)
}

// Descriptions
//  * Calculate multipler for random in range [min, max].
//  * Formular: output = (min + max) * (max - min) + minValue.
//
// Input
//  * min {BigNumber}
//  * max {BigNumber}
//
// Output {BigNumber}
function _getRandomMultipler(min, max) {
    let sum = min.plus(max)
    let diff = max.minus(min)
    let product = sum.times(diff)
    let minValue = 113445667 // it's just a random value

    return product.plus(minValue)
}

// Descriptions
//  * Calculate additional for random in range [min, max].
//  * Formular: output = min^2 + max^2 + minValue.
//
// Input
//  * min {BigNumber}
//  * max {BigNumber}
//
// Output {BigNumber}
function _getRanomAdditional(min, max) {
    let minPow = min.pow(2)
    let maxPow = max.pow(2)
    let minValue = 123245 // it's just a random value

    return minPow.plus(maxPow)
        .plus(minValue)
}

// Input
//  * number {BigNumber}
//  * base {Number}
//
// Errors
//  * Error `Not an integer`
function _numberToString(number, base) {
    if (!number.isInteger()) {
        throw Error('Not an integer')
    }

    return number.toString(base)
}

// Input
//  * dividend {BigNumber}
//  * divisor {BigNumber}
//
// Output {BigNumber} Remainder of `dividend/divisor`
function _divToRemainer(dividend, divisor) {
    let int = dividend.idiv(divisor)
    let x = int.times(divisor)

    return dividend.minus(x)
}

module.exports = {
    randomUnsignedBigInt,
    toDecimal,
    toHeximal    
}
