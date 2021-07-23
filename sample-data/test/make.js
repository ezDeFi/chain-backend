'use strict'

const assert = require('assert')
const ethers = require('ethers')
const BigNumber = require('bignumber.js')
const make = require('../make')
const {getDb} = require('../index')

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

    it('make with the same seed value return identical results', () => {
        let config = {
            seedValue: 0x4213,
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
        let pairMap1 = make(config)
        let pairMap2 = make(config)

        assert.strictEqual(pairMap1 instanceof Map, true)
        assert.strictEqual(pairMap1.size, 1)
        assert.strictEqual(pairMap2 instanceof Map, true)
        assert.strictEqual(pairMap2.size, 1)

        let pair1 = pairMap1.values().next().value
        let pair2 = pairMap2.values().next().value

        assert.notStrictEqual(pair1, undefined)
        assert.notStrictEqual(pair2, undefined)
        assert.deepStrictEqual(pair1, pair2)
    })

    it('make with the different seed values return the distinctive results', () => {
        let config1 = {
            seedValue: 0x12345,
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
        let config2 = {
            seedValue: 0x54321,
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
        let pairMap1 = make(config1)
        let pairMap2 = make(config2)

        assert.strictEqual(pairMap1 instanceof Map, true)
        assert.strictEqual(pairMap1.size, 1)
        assert.strictEqual(pairMap2 instanceof Map, true)
        assert.strictEqual(pairMap2.size, 1)

        let pair1 = pairMap1.values().next().value
        let pair2 = pairMap2.values().next().value

        assert.strictEqual(pair1.address, pair2.address)
        assert.notDeepStrictEqual(pair1.reserve0, pair2.reserve0)
        assert.notDeepStrictEqual(pair1.reserve1, pair2.reserve1)
    })

    it('make exchange pancake', () => {
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

        for (let pair of pairMap.values()) {
            assert.strictEqual(pair.address, '0xA527a61703D82139F8a06Bc30097cC9CAA2df5A6')
            assert.strictEqual(pair.factory, 'pancake')
            assert.strictEqual(pair.token0, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
            assert.strictEqual(pair.token1, '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82')
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make exchange pancake2', () => {
        let config = {
            seedPairCount: 0,
            pairSpecs: [
                {
                    addressA: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
                    addressB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake2',
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
            assert.strictEqual(pair.address, '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0')
            assert.strictEqual(pair.factory, 'pancake2')
            assert.strictEqual(pair.token0, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
            assert.strictEqual(pair.token1, '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82')
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make exchange bakery', () => {
        let config = {
            seedPairCount: 0,
            pairSpecs: [
                {
                    addressA: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
                    addressB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'bakery',
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
            assert.strictEqual(pair.address, '0x65E9CfDBC579856B6354d369AFBFbA2B2a3C7856')
            assert.strictEqual(pair.factory, 'bakery')
            assert.strictEqual(pair.token0, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
            assert.strictEqual(pair.token1, '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82')
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make exchange jul', () => {
        let config = {
            seedPairCount: 0,
            pairSpecs: [
                {
                    addressA: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
                    addressB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'jul',
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
            assert.strictEqual(pair.address, '0x0bf693a8679eFB36Ac912c147A75e19368A33CDA')
            assert.strictEqual(pair.factory, 'jul')
            assert.strictEqual(pair.token0, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
            assert.strictEqual(pair.token1, '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82')
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make exchange ape', () => {
        let config = {
            seedPairCount: 0,
            pairSpecs: [
                {
                    addressA: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
                    addressB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'ape',
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
            assert.strictEqual(pair.address, '0x60593Abea55e9Ea9d31c1b6473191cD2475a720D')
            assert.strictEqual(pair.factory, 'ape')
            assert.strictEqual(pair.token0, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
            assert.strictEqual(pair.token1, '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82')
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make with 1000 seed pairs', () => {
        let config = {
            seedPairCount: 1000,
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
        let exchangeNameSet = new Set([
            'pancake', 'pancake2', 'bakery',
            'jul', 'ape'
        ])

        assert.strictEqual(pairMap instanceof Map, true)
        assert.strictEqual(pairMap.size, 4996)

        let pairs = Array.from(
            pairMap.values()
        )

        for (let pair of pairs) {
            assert.strictEqual(ethers.utils.isAddress(pair.address), true)
            assert.strictEqual(exchangeNameSet.has(pair.factory), true)
            assert.strictEqual(ethers.utils.isAddress(pair.token0), true)
            assert.strictEqual(ethers.utils.isAddress(pair.token1), true)
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make with all seed pairs', () => {
        let config = {
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
        let exchangeNameSet = new Set([
            'pancake', 'pancake2', 'bakery',
            'jul', 'ape'
        ])

        assert.strictEqual(pairMap instanceof Map, true)
        assert.strictEqual(pairMap.size, 49996)

        let pairs = Array.from(
            pairMap.values()
        )

        for (let pair of pairs) {
            assert.strictEqual(ethers.utils.isAddress(pair.address), true)
            assert.strictEqual(exchangeNameSet.has(pair.factory), true)
            assert.strictEqual(ethers.utils.isAddress(pair.token0), true)
            assert.strictEqual(ethers.utils.isAddress(pair.token1), true)
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })

    it('make with 1000 seed pairs by public API', () => {
        let config = {
            seedPairCount: 1000,
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
        let pairMap = getDb(config)
        let exchangeNameSet = new Set([
            'pancake', 'pancake2', 'bakery',
            'jul', 'ape'
        ])

        assert.strictEqual(pairMap instanceof Map, true)
        assert.strictEqual(pairMap.size, 4996)

        let pairs = Array.from(
            pairMap.values()
        )

        for (let pair of pairs) {
            assert.strictEqual(ethers.utils.isAddress(pair.address), true)
            assert.strictEqual(exchangeNameSet.has(pair.factory), true)
            assert.strictEqual(ethers.utils.isAddress(pair.token0), true)
            assert.strictEqual(ethers.utils.isAddress(pair.token1), true)
            assert.strictEqual(pair.reserve0 instanceof BigNumber, true)
            assert.strictEqual(pair.reserve1 instanceof BigNumber, true)
        }
    })
})
