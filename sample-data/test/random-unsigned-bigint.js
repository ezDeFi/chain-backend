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
        let expectedResults = ['2', '8', '0', '7', '5', '4', '9', '6', '10', '1']

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
            '157', '464', '856', '840', '620',
            '298', '826', '878', '692', '387'
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
            '8886769557939981', '5935742500637784606',
            '6523813701233701948', '1904077759679313475',
            '6034158553453952279', '5520755099126696846',
            '9374719223106899632', '4311959793315765130',
            '2253713839789144040', '4628430200086591872'
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
