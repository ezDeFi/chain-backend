'use strict'

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
        let states = _makeTokenPairStateList(config.token_pairs)

        tokenPairStateLists.push(states)
    }

    return tokenPairStateLists
}

// Input
//  * specs {Array<MakeTokenPair>}
//
// Output {Array<TokenPairState>}
function _makeTokenPairStateList(specs) {
    let stateListOfList = specs.map(_makeTokenPairStateFromSpec)

    return stateListOfList.flat(1)
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
    let reserve0 = randomUnsignedBigInt(...boundary0)
    let reserve1 = randomUnsignedBigInt(...boundary1)

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

module.exports = make
