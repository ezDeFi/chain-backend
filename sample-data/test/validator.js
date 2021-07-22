'use strict'

const assert = require('assert')
const BigNumber = require('bignumber.js')
const {standardizeMakeConfig} = require('../validator')

describe('standardizeMakeConfig', () => {
    it('seedPairCount is not a number throws error', () => {
        let config = {
            seedPairCount: '1',
            pairSpecs: []
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'seedPairCount: Not an unsigned integer'}
        )
    })

    it('seedPairCount is not an integer throws error', () => {
        let config = {
            seedPairCount: 1.1,
            pairSpecs: []
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'seedPairCount: Not an unsigned integer'}
        )
    })

    it('seedPairCount is negative integer throws error', () => {
        let config = {
            seedPairCount: -1,
            pairSpecs: []
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'seedPairCount: Not an unsigned integer'}
        )
    })

    it('seedValue is not a heximal string throws error', () => {
        let config = {
            seedValue: '123abcXYZ',
            pairSpecs: []
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'seedValue: Not a positive integer'}
        )
    })

    it('seedValue is negative throws error', () => {
        let config = {
            seedValue: '-123abcdef',
            pairSpecs: []
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'seedValue: Not a positive integer'}
        )
    })

    it('seedValue is zero throws error', () => {
        let config = {
            seedValue: '0',
            pairSpecs: []
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'seedValue: Not a positive integer'}
        )
    })

    it('addressA is not an ETH address throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '0x123',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].addressA: Not an ETH address'}
        )
    })

    it('addressB is not an ETH address throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    addressB: '0x123'
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].addressB: Not an ETH address'}
        )
    })

    it('exchange name is invalid throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'this name is not existed',
                            boundaryA: ['123', 'abcdef'],
                            boundaryB: ['123', 'abcdef'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].name: Not an exchange'}
        )
    })

    it('boundaryA lower is invalid throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['123XYZ', 'abcdef'],
                            boundaryB: ['123', 'abcdef'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].boundaryA[0]: Not an unsigned integer'}
        )
    })

    it('boundaryA upper is invalid throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['123', 'abcdefXYZ'],
                            boundaryB: ['123', 'abcdef'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].boundaryA[1]: Not an unsigned integer'}
        )
    })

    it('boundaryA upper is equal lower throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['123def', '123def'],
                            boundaryB: ['123', 'abcdef'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].boundaryA: Upper is less than or equal lower boundary'}
        )
    })

    it('boundaryA upper is less than lower throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['321', '123'],
                            boundaryB: ['123', 'abcdef'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].boundaryA: Upper is less than or equal lower boundary'}
        )
    })

    it('boundaryB lower is invalid throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['123', 'abcdef'],
                            boundaryB: ['123XYZ', 'abcdef'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].boundaryB[0]: Not an unsigned integer'}
        )
    })

    it('boundaryB upper is invalid throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['123', 'abcdef'],
                            boundaryB: ['123', 'abcdefXYZ'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].boundaryB[1]: Not an unsigned integer'}
        )
    })

    it('boundaryB upper is less than lower throws error', () => {
        let config = {
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['123abc', '123def'],
                            boundaryB: ['321', '123'],
                        }
                    ]
                }
            ]
        }

        assert.throws(
            () => {
                standardizeMakeConfig(config)
            },
            {message: 'pairSpec[0].exchanges[0].boundaryB: Upper is less than or equal lower boundary'}
        )
    })

    it('empty configuration', () => {
        let config = {
            pairSpecs: []
        }
        let actualResult = standardizeMakeConfig(config)
        let expectedResult = {
            seedPairCount: undefined,
            seedValue: undefined,
            pairSpecs: []
        }

        assert.deepStrictEqual(actualResult, expectedResult)
    })

    it('simple configuration with pancake exchange', () => {
        let config = {
            seedPairCount: 1,
            seedValue: '7531246',
            pairSpecs: [
                {
                    addressA: '0x3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: ['123abc', '123def'],
                            boundaryB: ['456abc', '456def'],
                        }
                    ]
                }
            ]
        }
        let actualResult = standardizeMakeConfig(config)
        let expectedResult = {
            seedPairCount: 1,
            seedValue: new BigNumber('7531246'),
            pairSpecs: [
                {
                    addressA: '3375afa606f5836154c95f1df5830ea2e4f41df2',
                    addressB: 'bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    exchanges: [
                        {
                            name: 'pancake',
                            boundaryA: [
                                new BigNumber('123abc', 16),
                                new BigNumber('123def', 16)
                            ],
                            boundaryB: [
                                new BigNumber('456abc', 16),
                                new BigNumber('456def', 16)
                            ]
                        }
                    ]
                }
            ]
        }

        assert.deepStrictEqual(actualResult, expectedResult)
    })
})
