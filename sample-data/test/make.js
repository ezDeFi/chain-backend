'use strict'

const assert = require('assert')
const ethers = require('ethers')
const BigNumber = require('bignumber.js')
const make = require('../make')

describe('make', () => {
    it('make from configuration that has no token pairs', () => {
        let config = {
            make_count: 1,
            seed_pair_count: 10,
            pair_specs: []
        }
        let listOfStateList = make(config)

        assert.strictEqual(Array.isArray(listOfStateList), true)
        assert.strictEqual(listOfStateList.length, 1)
        assert.strictEqual(listOfStateList[0].length > 0, true)
    })

    it('make return no states', () => {
        let config = {
            make_count: 1,
            seed_pair_count: 0,
            pair_specs: []
        }
        let listOfStateList = make(config)

        assert.strictEqual(Array.isArray(listOfStateList), true)
        assert.strictEqual(listOfStateList.length, 1)
        assert.strictEqual(listOfStateList[0].length, 0)
    })

    it('make from simple configuration', () => {
        let config = {
            make_count: 1,
            seed_pair_count: 10,
            pair_specs: [
                {
                    address_a: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
                    address_b: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundary_a: ['13579864', '135798645af'],
                            boundary_b: ['97531246', '975312467af']
                        },
                        {
                            name: 'pancake2',
                            boundary_a: ['1357986420', '13579864200af'],
                            boundary_b: ['9753124680', '97531246800af']
                        },
                        {
                            name: 'bakery',
                            boundary_a: ['135798', '1357980af'],
                            boundary_b: ['975312', '9753120af']
                        },
                        {
                            name: 'jul',
                            boundary_a: ['1357', '13570af'],
                            boundary_b: ['9753', '97530af']
                        },
                        {
                            name: 'ape',
                            boundary_a: ['135', '1350af'],
                            boundary_b: ['975', '9750af']
                        }
                    ]
                }
            ]
        }
        let listOfStateList = make(config)

        assert.strictEqual(listOfStateList.length, 1)
        assert.strictEqual(listOfStateList[0].length, 55)

        for (let pair of listOfStateList[0]) {
            assert.strictEqual(ethers.utils.isAddress(pair.address), true)
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make with not enough seed pair state throws error', () => {
        let config = {
            make_count: 1,
            seed_pair_count: 50000,
            pair_specs: []
        }

        assert.throws(
            () => {
                make(config)
            },
            {
                message: 'Not enough token pair seed states'
            }
        )
    })
})
