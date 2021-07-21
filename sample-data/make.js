'use strict'

const path = require('path')
const fs = require('fs')
const csvParse = require('csv-parse/lib/sync')
const {findPair} = require('bsc_util')
const {randomUnsignedBigInt} = require('./number')

// Descriptions
//  * Make token pair reserve set from configuration.
//
// Input
//  * config {MakeConfig}
//
// Output {Array<TokenPairStateList>}
function make(config) {
    let tokenPairStateLists = []

    for (let count = 1; count <= config.random_count; ++count) {
        let states = _makeTokenPairStateList(config.token_pairs, config.seed_pair_count)

        tokenPairStateLists.push(states)
    }

    return tokenPairStateLists
}

// Input
//  * specs {Array<MakeTokenPair>}
//  * seedCount {Number}
//
// Output {Array<TokenPairState>}
function _makeTokenPairStateList(specs, seedCount) {
    let fullSpecs = _mergeWithSeedSpecs(specs, seedCount)
    let stateListOfList = fullSpecs.map(_makeTokenPairStateFromSpec)

    return stateListOfList.flat(1)
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
//  * spec {MakeTokenPair}
//
// Output {Array<TokenPairState>}
function _makeTokenPairStateFromSpec({token_a, token_b, exchanges}) {
    return exchanges.map(exchange => {
        return _makeTokenPairFromExchange(
            token_a, 
            token_b, 
            exchange.name,
            exchange.boundary_a,
            exchange.boundary_b
        )
    })
}

// Output {TokenPairState}
function _makeTokenPairFromExchange(
    token_a, 
    token_b, 
    exchange,
    boundary_a, 
    boundary_b
) {
    let address = findPair(exchange, token_a, token_b)
    let [boundary0, boundary1] = _getBoundaryByTokenOrder(
        token_a, token_b,
        boundary_a, boundary_b
    )
    let reserve0 = randomUnsignedBigInt(...boundary0, 16)
    let reserve1 = randomUnsignedBigInt(...boundary1, 16)

    return {address, reserve0, reserve1}
}

// Output {Array}
//  * [0] {TokenReserveBoundary} Boundary of token0.
//  * [1] {TokenReserveBoundary} Boundary of token1.
function _getBoundaryByTokenOrder(token_a, token_b, boundary_a, boundary_b) {
    let tokens = [
        {address: token_a.toLowerCase(), boundary: boundary_a},
        {address: token_b.toLowerCase(), boundary: boundary_b}
    ]
    let orderedTokens = tokens.sort((a, b) => {
        return a.address > b.address ? 1 : -1
    })
    let boundaries = orderedTokens.map(token => token.boundary)

    return boundaries
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
//  * Return list of token pair random requests that includes:
//  * Seed token pairs.
//  * If there is a token pair random request in `specs` then it will be
//    override to seed token pairs.
//
// Input
//  * specs {Array<MakeTokenPair>}
//  * seedCount {Number}
//
// Output {Array<MakeTokenPair>}
function _mergeWithSeedSpecs(specs, seedCount) {
    let seedStates = _getSeedStates(seedCount)
    let seedSpecMap = new Map(
        seedStates.map(state => [
            _getTokenPairKey(state.address0, state.address1),
            _tokenPairFromSeedState(state)
        ])
    )

    for (let spec of specs) {
        let key = _getTokenPairKey(spec.token_a, spec.token_b)

        seedSpecMap.set(key, spec)
    }

    return Array.from(
        seedSpecMap.values()
    )
}

// Input
//  * state {SeedTokenPair}
//
// Output {MakeTokenPair}
function _tokenPairFromSeedState(state) {
    return {
        token_a: state.address0,
        token_b: state.address1,
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

// Input
//  * count {Number} Number of states to get.
//
// Output {Array<SeedTokenPair>}
//
// Errors
//  * Error `Not enough token pair seed states`
function _getSeedStates(count) {
    if (!_getSeedStates._pairStates) {
        _getSeedStates._pairStates = _readSeedStates()
    }

    if (count > _getSeedStates._pairStates.length) {
        throw Error('Not enough token pair seed states')
    }

    return _getSeedStates._pairStates.slice(0, count)
}

_getSeedStates._pairStates = undefined

// Output {Array<Object>}
//  * [].address0 {EthAddress}
//  * [].address1 {EthAddress}
//  * [].reserve0 {HeximalString}
//  * [].reserve1 {HeximalString}
function _readSeedStates() {
    let rawData = fs.readFileSync(_readSeedStates._DATA_FILE)
    let rows = csvParse(rawData, {
        cast: false,
        columns: true
    })

    return rows
}

// {String} Path to file that contains seed token pair states.
_readSeedStates._DATA_FILE = path.join(__dirname, 'seed-data')

module.exports = make
