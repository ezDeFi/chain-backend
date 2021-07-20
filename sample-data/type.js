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
//  * token_pairs {Array<MakeTokenPair>} List of token pair will be include in
//    token pair state set.

// Type MakeTokenPair {Object}
//  * token_a {EthAddress}
//  * token_b {EthAddress}
//  * exchanges {Array<MakeTokenPairExchange>} List of exchanges for token pairs.

// Type MakeTokenPairExchange {Object}
//  * name {ExchangeName}
//  * boundary_a {Array}
//  * boundary_a[0] {DecimalString} Lower reserve boundary of token_a.
//  * boundary_b[1] {DecimalString} Upper reserve boundary of token_a.
//  * boundary_b {Array} It is similar like `boundary_a` but for token_b.

// Type ExchangeName {String}
//
// It can be one of following values `pancake`, `pancake2`, `bakery`,
// `jul` and `ape`.

// Type TokenPairReserves {String}
//
// Pattern: `{HeximalString}/{HeximalString}`

// Type TokenPair {Object}
//  * address {EthAddress}
//  * reserves {TokenPairReserves}
