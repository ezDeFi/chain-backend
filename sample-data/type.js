'use strict'

// Type HeximalString {String}
//
// A string represents for a number with heximal digits.

// Type DecimalString {String} 
//
// A string represents for a number with decimal digits.

// Type RandomKey {String}
//
// Pattern `{HeximalString}/{HeximalString}`
//
// First hex string is lower bound of random, second one is upper bound.

// Type EthAddress {String}

// Type MakeConfig {Object}
//  * random_count {Number} This configuration will be use to make
//    `random_count` token pair state set.
//  * seed_count {Number} Number of sample token pairs from seed data will be
//    include to result.
//  * token_pairs {Array<MakeTokenPair>} List of token pair will be include in
//    token pair state set.

// Type MakeTokenPair {Object}
//  * token_a {EthAddress}
//  * token_b {EthAddress}
//  * exchanges {Array<MakeTokenPairExchange>} List of exchanges for token pairs.

// Type MakeTokenPairExchange {Object}
//  * name {ExchangeName}
//  * boundary_a {TokenReserveBoundary}
//  * boundary_b {TokenReserveBoundary}

// Type TokenReserveBoundary {Array}
//  * [0] {DecimalString} Lower reserve boundary.
//  * [1] {DecimalString} Upper reserve boundary.

// Type ExchangeName {String}
//
// It can be one of following values `pancake`, `pancake2`, `bakery`,
// `jul` and `ape`.

// Type TokenPairStateList {Array<TokenPairState>}

// Type TokenPairState {Object}
//  * address {EthAddress}
//  * reserve0 {BigNumber}
//  * reserve1 {BigNumber}

// TokenPairKey {String}
//
/// Pattern `address0/address1`
//  * address0 {EthAddress}
//  * address1 {EthAddress}
 
////////////////////////
// Type TokenPairReserves {String}
//
// Pattern: `{HeximalString}/{HeximalString}`

// Type TokenPair {Object}
//  * address {EthAddress}
//  * reserves {TokenPairReserves}
