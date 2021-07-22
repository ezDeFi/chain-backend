'use strict'

const path = require('path')
const fs = require('fs')
const csvParse = require('csv-parse/lib/sync')
const {findPair} = require('bsc_util')
const {randomUnsignedBigInt} = require('./number')

// Descriptions
//  * Make token pair state set from configuration.
//
// Input
//  * config {MakeConfig}
//
// Output {Array<TokenPairStateSet>}
function make(config) {
    let listOfStateSet = []

    for (let count = 1; count <= config.make_count; ++count) {
        let stateSet = _makePairStateSet(
            config.pair_specs, 
            config.seed_pair_count
        )

        listOfStateSet.push(stateSet)
    }

    return listOfStateSet
}

// Input
//  * specs {Array<MakePairSpec>}
//  * seedPairCount {Number}
//
// Output {Array<TokenPairState>}
function _makePairStateSet(specs, seedPairCount) {
    let fullSpecs = _mergeWithSeedSpecs(specs, seedPairCount)
    let listOfStateList = fullSpecs.map(_makePairStateFromSpec)

    return listOfStateList.flat(1)
}

// Input
//  * addressA {EthAddress}
//  * addressB {EthAddress}
//
// Output {TokenPairKey}
function _getTokenPairKey(addressA, addressB) {
    let [address0, address1] = _getOrderedTokens(addressA, addressB)
    
    return address0 + '/' + address1
}

// Input 
//  * spec {MakePairSpec}
//
// Output {Array<TokenPairState>}
function _makePairStateFromSpec({address_a, address_b, exchanges}) {
    return exchanges.map(exchange => {
        return _makePairStateFromExchangeSpec(
            address_a, 
            address_b, 
            exchange.name,
            exchange.boundary_a,
            exchange.boundary_b
        )
    })
}

// Input
//  * address_a {EthAddress}
//  * address_b {EthAddress}
// Output {TokenPairState}
function _makePairStateFromExchangeSpec(
    address_a, 
    address_b, 
    exchange,
    boundary_a, 
    boundary_b
) {
    let address = findPair(exchange, address_a, address_b)
    let [boundary0, boundary1] = _getBoundaryByOrderedTokens(
        address_a, address_b,
        boundary_a, boundary_b
    )
    let reserve0 = randomUnsignedBigInt(...boundary0, 16)
    let reserve1 = randomUnsignedBigInt(...boundary1, 16)

    return {address, reserve0, reserve1}
}

// Input
//  * addressA {EthAddress}
//  * addressB {EthAddress}
//  * boundaryA {HeximalRandomBoundary}
//  * boundaryB {HeximalRandomBoundary}
//
// Output {Array}
//  * [0] {TokenReserveBoundary} Boundary of token0.
//  * [1] {TokenReserveBoundary} Boundary of token1.
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
function _getOrderedTokens(tokenA, tokenB) {
    return [tokenA, tokenB].sort((a, b) => {
        return a.address > b.address ? 1 : -1
    })
}

// Descriptions
//  * Return list of token pair specifications to make that includes:
//  * Seed token pairs from file `./seed-pair-state`.
//  * If there is the same token pair from `specs` and seed data then
//    specification from `specs` is pick.
//
// Input
//  * specs {Array<MakePairSpec>}
//  * seedCount {UnsignedInteger} Number of seed pairs will be include to
//    results.
//
// Output {Array<MakePairSpec>}
function _mergeWithSeedSpecs(specs, seedCount) {
    let seedStates = _getSeedPairStates(seedCount)
    let seedSpecMap = new Map(
        seedStates.map(state => [
            _getTokenPairKey(state.address0, state.address1),
            _makePairStateFromSeedState(state)
        ])
    )

    for (let spec of specs) {
        let key = _getTokenPairKey(spec.address_a, spec.address_b)

        seedSpecMap.set(key, spec)
    }

    return Array.from(
        seedSpecMap.values()
    )
}

// Descriptions
//  * Create token pair specification to make from seed state.
//
// Input
//  * state {SeedPairState}
//
// Output {MakePairSpec}
function _makePairStateFromSeedState(state) {
    return {
        address_a: state.address0,
        address_b: state.address1,
        exchanges: [
            {
                name: 'pancake',
                boundary_a: ['1357986420abc', '8642013579def'],
                boundary_b: ['1357986420abc', '8642013579def']
            },
            {
                name: 'pancake2',
                boundary_a: ['1357986420abc', '8642013579def'],
                boundary_b: ['1357986420abc', '8642013579def']
            },
            {
                name: 'bakery',
                boundary_a: ['1357986420abc', '8642013579def'],
                boundary_b: ['1357986420abc', '8642013579def']
            },
            {
                name: 'jul',
                boundary_a: ['1357986420abc', '8642013579def'],
                boundary_b: ['1357986420abc', '8642013579def']
            },
            {
                name: 'ape',
                boundary_a: ['1357986420abc', '8642013579def'],
                boundary_b: ['1357986420abc', '8642013579def']
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
function _getSeedPairStates(count=undefined) {
    if (!_getSeedPairStates._pairStates) {
        _getSeedPairStates._pairStates = _readSeedPairStates()
    }

    if (count === undefined) {
        return _getSeedPairStates._pairStates
    }

    if (count > _getSeedPairStates._pairStates.length) {
        throw Error('Not enough token pair seed states')
    }

    return _getSeedPairStates._pairStates.slice(0, count)
}

// Array<SeedPairState>
_getSeedPairStates._pairStates = undefined

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

module.exports = make
