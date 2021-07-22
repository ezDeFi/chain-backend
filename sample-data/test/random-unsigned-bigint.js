'use strict'

const assert = require('assert')
const BigNumber = require('bignumber.js')
const {
    randomUnsignedBigInt,
    seedRandomUnsignedBigInt
} = require('../number')

describe('randomUnsignedBigInt', () => {
    it('call x-small broundary for 10 times', () => {
        let min = 0
        let max = 10
        let seed = 3
        let expectedResults = ['1', '2', '8', '0', '7', '5', '4', '9', '6']

        seedRandomUnsignedBigInt(seed)

        for (let expectedResult of expectedResults) {
            let actualResult = randomUnsignedBigInt(min, max)

            assert.strictEqual(
                actualResult.toString(),
                expectedResult
            )
        }
    })

    it('call medium boundary for 10 times', () => {
        let min = 100
        let max = 1000
        let seed = 4
        let expectedResults = [
            '415', '858', '417', '435', '232',
            '369', '676', '167', '151', '832'
        ]

        seedRandomUnsignedBigInt(seed)

        for (let expectedResult of expectedResults) {
            let actualResult = randomUnsignedBigInt(min, max)

            assert.strictEqual(
                actualResult.toString(),
                expectedResult
            )
        }
    })

    it('call big boundary for 10 times', () => {
        let min = '1357924680'
        let max = '9753186421357924680'
        let seed = 531
        let expectedResults = [
            '26174811202701', '6943370336074993828',
            '7025045110839898889', '4307297403309822353',
            '6039075123808900360', '7875256986262292711',
            '2289136667233274407', '4025068032448585823',
            '4584429162769904646', '5155316955076360501'
        ]

        seedRandomUnsignedBigInt(seed)

        for (let expectedResult of expectedResults) {
            let actualResult = randomUnsignedBigInt(min, max)

            assert.strictEqual(
                actualResult.toString(),
                expectedResult
            )
        }
    })

    it('call 10,000 times without verify exact results', () => {
        let min = new BigNumber('1357924680')
        let max = new BigNumber('9753186421357924680')
        let seed = 792

        seedRandomUnsignedBigInt(seed)

        for (let count = 1; count <= 10000; ++count) {
            let actualResult = randomUnsignedBigInt(min, max)

            assert.strictEqual(
                actualResult instanceof BigNumber, true,
                'result is not a BigNumber'
            )
            assert.strictEqual(
                actualResult.isInteger(), true,
                'result is not an integer'
            )
            assert.strictEqual(
                actualResult.isNegative(), false,
                'result is negative'
            )
            assert.strictEqual(
                actualResult.lt(min), false,
                `result is less then lower boundary`
            )
            assert.strictEqual(
                actualResult.gt(max), false,
                'result is greater than upper boundary'
            )
        }
    })
})
