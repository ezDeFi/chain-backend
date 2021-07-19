'use strict'

const assert = require('assert')
const BigNumber = require('bignumber.js')
const {
    randomUnsignedBigInt,
    toDecimal
} = require('../number')

describe('randomUnsignedBigInt', () => {
    it('min is not a number throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(null, 0)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })

    it('max is not a number throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(0, null)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })

    it('min is negative throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(-1, 0)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })

    it('max is negative throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(0, -1)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })

    it('min is float nubmer throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(1.1, 0)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })

    it('max is float nubmer throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(0, 1.1)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })

    it('max is less than min throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(3, 2)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })

    it('max is equal min throws error', () => {
        assert.throws(
            () => {
                randomUnsignedBigInt(3, 3)
            },
            {
                message: 'Invalid boundary values'
            }
        )
    })
    
    it('call x-small broundary for 10 times', () => {
        let min = 0
        let max = 10
        let seed = 3
        let expectedResults = ['9', '1', '8', '6', '5', '10', '7', '0', '2']

        randomUnsignedBigInt.seed(min, max, seed)

        for (let expectedResult of expectedResults) {
            let actualResult = randomUnsignedBigInt(min, max)

            assert.strictEqual(
                toDecimal(actualResult),
                expectedResult
            )
        }
    })

    it('call medium boundary for 10 times', () => {
        let min = 100
        let max = 1000
        let seed = 4
        let expectedResults = [
            '317', '177', '444', '765', '584',
            '498', '263', '679', '349', '914'
        ]

        randomUnsignedBigInt.seed(min, max, seed)

        for (let expectedResult of expectedResults) {
            let actualResult = randomUnsignedBigInt(100, 1000)

            assert.strictEqual(
                toDecimal(actualResult),
                expectedResult
            )
        }
    })

    it('call big boundary for 10 times', () => {
        let min = '1357924680'
        let max = '9753186421357924680'
        let seed = 531
        let expectedResults = [
            '3687917489872042914', '6833823825756397140',
            '6413888203817604343', '7064001556641361126',
            '880756339425585433', '8351173561882793419',
            '2690254269097810631', '4030229737234983492',
            '9344670941683920971', '2291457882275179576'
        ]

        randomUnsignedBigInt.seed(min, max, seed)

        for (let expectedResult of expectedResults) {
            let actualResult = randomUnsignedBigInt(min, max)

            assert.strictEqual(
                toDecimal(actualResult),
                expectedResult
            )
        }
    })

    it('call 10,000 times without verify exact results', () => {
        let min = new BigNumber('1357924680')
        let max = new BigNumber('9753186421357924680')
        let seed = 792

        randomUnsignedBigInt.seed(min, max, seed)

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
                `result is less then lower boundary: ${toDecimal(actualResult)}`
            )
            assert.strictEqual(
                actualResult.gt(max), false,
                'result is greater than upper boundary'
            )
        }
    })
})
