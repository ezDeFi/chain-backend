'use strict'

const path = require('path')
const fs = require('fs')
const BigNumber = require('bignumber.js')
const csvParse = require('csv-parse/lib/sync')
const ethers = require('ethers')
const {findPair} = require('bsc_util')
const {randomUnsignedBigInt, seedRandomUnsignedBigInt} = require('./number')
const {standardizeMakeConfig} = require('./validator')

// Descriptions
//  * Make token pair state set from configuration.
//
// Input
//  * config {RawMakeConfig}
//
// Output {Map<key, value>}
//  * key {EthAddress}
//  * value {TokenPairState}
//
// Errors
//  * MakeConfigError
function make(config) {
    let {pairSpecs, seedPairCount, seedValue} = standardizeMakeConfig(config)

    if (seedValue !== undefined) {
        seedRandomUnsignedBigInt(seedValue)
    }

    let fullPairSpecs = _mergeWithSeedPairSpecs(pairSpecs, seedPairCount)
    let listOfPairList = fullPairSpecs.map(_makePairFromSpec)
    let pairStates = listOfPairList.flat(1)
    let pairStateMap = new Map(
        pairStates.map(state => [state.address, state])
    ) 

    return pairStateMap
}

// Descriptions
//  * Return list of token pair specifications to make that includes:
//  * Seed token pairs from file `./seed-pair-state`.
//  * If there is the same token pair from `specs` and seed data then
//    specification from `specs` is pick.
//
// Input
//  * specs {Array<MakePairSpec>}
//  * seedPairCount {UnsignedInteger} Number of seed pairs will be include to
//    results.
//
// Output {Array<MakePairSpec>}
function _mergeWithSeedPairSpecs(specs, seedPairCount) {
    let seedPairs = _getSeedPairs(seedPairCount)
    let seedPairMap = new Map(
        seedPairs.map(pair => [
            _getTokenPairKey(pair.address0, pair.address1),
            _makePairSpecFromSeedPair(pair)
        ])
    )

    for (let spec of specs) {
        let key = _getTokenPairKey(spec.addressA, spec.addressB)

        seedPairMap.set(key, spec)
    }

    return Array.from(
        seedPairMap.values()
    )
}

// Input 
//  * spec {ValidMakePairSpec}
//
// Output {Array<TokenPairState>}
function _makePairFromSpec({addressA, addressB, exchanges}) {
    return exchanges.map(exchange => {
        return _makePairFromExchangeSpec(
            addressA, 
            addressB, 
            exchange.name,
            exchange.boundaryA,
            exchange.boundaryB
        )
    })
}

// Input
//  * addressA {EthAddress}
//  * addressB {EthAddress}
//  * exchange {ExchangeName}
//  * boundaryA {UnsignedBigIntRandomBoundary}
//  * boundaryB {UnsignedBigIntRandomBoundary}
//
// Output {TokenPairState}
function _makePairFromExchangeSpec(
    addressA, 
    addressB, 
    exchange,
    boundaryA, 
    boundaryB
) {
    let address = findPair(exchange, addressA, addressB)
    let [address0, address1] = _getOrderedAddresses(addressA, addressB)
    let [boundary0, boundary1] = _getBoundaryByOrderedTokens(
        addressA, addressB,
        boundaryA, boundaryB
    )
    let reserve0 = randomUnsignedBigInt(...boundary0)
    let reserve1 = randomUnsignedBigInt(...boundary1)

    return {
        address: address, 
        factory: exchange, 
        token0: ethers.utils.getAddress(address0), 
        token1: ethers.utils.getAddress(address1), 
        reserve0: reserve0.toString(16), 
        reserve1: reserve1.toString(16)
    }
}

// Input
//  * addressA {EthAddress}
//  * addressB {EthAddress}
//  * boundaryA {UnsignedBigIntRandomBoundary}
//  * boundaryB {UnsignedBigIntRandomBoundary}
//
// Output {Array}
//  * [0] {UnsignedBigIntRandomBoundary} Boundary of token0.
//  * [1] {UnsignedBigIntRandomBoundary} Boundary of token1.
function _getBoundaryByOrderedTokens(
    addressA,
    addressB, 
    boundaryA, 
    boundaryB
) {
    let tokens = [
        {address: addressA.toLowerCase(), boundary: boundaryA},
        {address: addressB.toLowerCase(), boundary: boundaryB}
    ]
    let orderedTokens = tokens.sort((a, b) => {
        return a.address > b.address ? 1 : -1
    })
    
    return orderedTokens.map(token => token.boundary)
}

// Input
//  * tokenA {EthAddress}
//  * tokenB {EthAddress}
//
// Output {Array}
//  * [0] {EthAddress} Address of first token in pair.
//  * [1] {EthAddress} Address of second token in pair.
function _getOrderedAddresses(tokenA, tokenB) {
    return [tokenA, tokenB].sort((a, b) => {
        return a.address > b.address ? 1 : -1
    })
}

// Descriptions
//  * Create token pair specification to make from seed state.
//
// Input
//  * pair {SeedPairState}
//
// Output {ValidMakePairSpec}
function _makePairSpecFromSeedPair(pair) {
    return {
        addressA: pair.address0,
        addressB: pair.address1,
        exchanges: [
            {
                name: 'pancake',
                boundaryA: [ 
                    new BigNumber('1357986420'), 
                    new BigNumber('8642013579')
                ],
                boundaryB: [
                    new BigNumber('1357986420123'), 
                    new BigNumber('8642013579456')
                ]
            },
            {
                name: 'pancake2',
                boundaryA: [ 
                    new BigNumber('1357986420123'), 
                    new BigNumber('86420135790123')
                ],
                boundaryB: [
                    new BigNumber('1357986420123456'), 
                    new BigNumber('8642013579456456')
                ]
            },
            {
                name: 'bakery',
                boundaryA: [ 
                    new BigNumber('13579864'), 
                    new BigNumber('86420135')
                ],
                boundaryB: [
                    new BigNumber('13579864201'), 
                    new BigNumber('86420135794')
                ]
            },
            {
                name: 'jul',
                boundaryA: [ 
                    new BigNumber('135798'), 
                    new BigNumber('864201')
                ],
                boundaryB: [
                    new BigNumber('135798642'), 
                    new BigNumber('864201357')
                ]
            },
            {
                name: 'ape',
                boundaryA: [ 
                    new BigNumber('1357'), 
                    new BigNumber('8642')
                ],
                boundaryB: [
                    new BigNumber('1357986'), 
                    new BigNumber('8642013')
                ]
            }
        ]
    }
}

// Descriptions
//  * Query to file system at the first time, from second one return cached
//    data.
//
// Input
//  * count {Number} Number of states to get. If it does not specify then
//    return all pair states.
//
// Output {Array<SeedPairState>}
//
// Errors
//  * Error `Not enough seed pair states`
function _getSeedPairs(count=undefined) {
    if (!_getSeedPairs._pairStates) {
        _getSeedPairs._pairStates = _readSeedPairStates()
    }

    if (count === undefined) {
        return _getSeedPairs._pairStates
    }

    if (count > _getSeedPairs._pairStates.length) {
        throw Error('Not enough seed token pairs')
    }

    return _getSeedPairs._pairStates.slice(0, count)
}

// Array<SeedPairState>
_getSeedPairs._pairStates = undefined

// Output {Array<SeedPairState>}
function _readSeedPairStates() {
    let rawData = fs.readFileSync(_readSeedPairStates._DATA_FILE)
    let rows = csvParse(rawData, {
        cast: false,
        columns: true
    })

    return rows
}

// {String} Path to file that contains seed token pair states.
_readSeedPairStates._DATA_FILE = path.join(__dirname, 'seed-pair-state')

// Input
//  * addressA {EthAddress}
//  * addressB {EthAddress}
//
// Output {TokenPairKey}
function _getTokenPairKey(addressA, addressB) {
    let [address0, address1] = _getOrderedAddresses(addressA, addressB)
    
    return address0 + '/' + address1
}

module.exports = make
