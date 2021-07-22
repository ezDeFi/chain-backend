'use strict'

const BigNumber = require('bignumber.js')

// Input
//  * min {Number | DecimalString | BigNumber} Non negative integer.
//  * max {Number | DecimalString | BigNumber}
//  * base {Number} Input based.
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
//  * Set a seed value for `randomUnsignedBigInt()`
//
// Input
//  * value {Number | DecimalString | BigNumber} Positive integer.
//
// Errors
//  * Error `Invalid seed value`
function seedRandomUnsignedBigInt(value) {
    let bigValue = new BigNumber(value)

    if (!bigValue.isInteger() || bigValue.lte(0)) {
        throw Error('Invalid seed value')
    }

    randomUnsignedBigInt._seedValue = bigValue
}

// Input
//  * min {BigNumber} Non negative integer.
//  * max {BigNumber}
//
// Output {BigNumber}
function _randomUnsignedBigInt(min, max) {
    _validateRandomBoundary(min, max)

    let nextSeed = _randomUnsignedBigInt._seedValue
        .times(_randomUnsignedBigInt._MULTIPLER)
        .plus(_randomUnsignedBigInt._ADDITIONAL)
    let range = max.plus(1).minus(min)
    let rand = _divToRemainer(nextSeed, range)
    let result = min.plus(rand)

    _randomUnsignedBigInt._seedValue = result

    return result
}

// {BigNumber}
_randomUnsignedBigInt._seedValue = new BigNumber(0x5312460)
_randomUnsignedBigInt._MULTIPLER = new BigNumber(0x753124560)
_randomUnsignedBigInt._ADDITIONAL = new BigNumber(0x12345)

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
    seedRandomUnsignedBigInt
}
