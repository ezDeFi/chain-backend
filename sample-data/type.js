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

// Type TokenPairReserves {String}
//
// Pattern: `{HeximalString}/{HeximalString}`

// Type TokenPair {Object}
//  * address {EthAddress}
//  * reserves {TokenPairReserves}
