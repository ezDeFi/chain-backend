'use strict'

const assert = require('assert')
const ethers = require('ethers')
const BigNumber = require('bignumber.js')
const make = require('../make')

describe('make', () => {
    it('make with not enough seed pairs throws error', () => {
        let config = {
            seedPairCount: 50000,
            pairSpecs: []
        }

        assert.throws(
            () => {
                make(config)
            },
            {
                message: 'Not enough seed token pairs'
            }
        )
    })

    it('make from configuration that has no token pairs', () => {
        let config = {
            seedPairCount: 10,
            pairSpecs: []
        }
        let pairMap = make(config)

        assert.strictEqual(pairMap instanceof Map, true)
        assert.strictEqual(pairMap.size, 50)
    })

    it('make return no states', () => {
        let config = {
            seedPairCount: 0,
            pairSpecs: []
        }
        let pairMap = make(config)

        assert.strictEqual(pairMap instanceof Map, true)
        assert.strictEqual(pairMap.size, 0)
    })

    it('make from simple configuration', () => {
        let config = {
            seedPairCount: 0,
            pairSpecs: [
                {
                    addressA: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
                    addressB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['13579864', '135798645af'],
                            boundaryB: ['97531246', '975312467af']
                        }
                    ]
                }
            ]
        }
        let pairMap = make(config)

        assert.strictEqual(pairMap instanceof Map, true)
        assert.strictEqual(pairMap.size, 1)

        let pairs = Array.from(
            pairMap.values()
        )

        for (let pair of pairs) {
            assert.strictEqual(ethers.utils.isAddress(pair.address), true)
            assert.strictEqual(pair.exchange, 'pancake')
            assert.strictEqual(pair.address0, 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c')
            assert.strictEqual(pair.address1, '0e09fabb73bd3ade0a17ecc321fd13a19e81ce82')
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })
})
