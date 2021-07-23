# DecimalString {String} 

* Pattern `[0-9]+`.

# HeximalString {String}

* Pattern `(0x)?[a-fA-F0-9]+`.

# ExchangeName {String}

* It can be one of following values: `pancake`, `pancake2`, `bakery`,
 `jul` and `ape`.

# EthAddress {String}

* Pattern `(0x)?[a-fA-F0-9]{40}`.

# PositiveInteger {Number}

* Integer number which is greater than zero.

# UnsignedInteger {Number}

* Integer number which is greater than or equal zero.

# BigNubmer {bignumber.js}

# MakeConfig {Object}

* seedValue `PositiveInteger` It is use as seed value to random reserve of
  tokens. If it does not specify then take default as `0x7531246`.
* seedPairCount `PositiveInteger` Number of seed pairs is use to make token
  pairs. A seed pair produces 5 pairs on five exchanges, see `ExchagneName`.
  If it does not specify then all seed pairs is use.
* pairSpecs `Array<MakePairSpec>` List of specifications to create token
  pairs and it's state.

# MakePairSpec {Object}

* addressA `EthAddress`
* addressB `EthAddress`
* exchanges `Array<MakeExchangeSpec>` List of exchanges for token pair.

# MakeExchangeSpec {Object}

* name `ExchangeName`
* boundaryA `HeximalRandomBoundary`
* boundaryB `HeximalRandomBoundary`

# HeximalRandomBoundary {Array}

* [0] `HeximalString` Lower boundary.
* [1] `HeximalString` Upper boundary.

# ValidMakeConfig {Object}

* seedValue `BigNumber` Positive integer.
* seedPairCount `UnsignedInteger`
* pairSpecs `Array<ValidMakePairSpec>`

# ValidMakePairSpec {Object}

* addressA `EthAddress`
* addressB `EthAddress`
* exchanges `Array<ValidMakeExchangeSpec>`

# ValidMakeExchangeSpec {Object}

* name `ExchangeName`
* boundaryA `UnsignedBigIntRandomBoundary`
* boundaryB `UnsignedBigIntRandomBoundary`

# UnsignedBigIntRandomBoundary {Array}

* [0] `BigNumber` Lower boundary, unsigned integer.
* [1] `BigNumber` Upper boundary, unsigned integer.

# TokenPair {Object}

* address `EthAddress`
* factory `ExchangeName`
* token0 `EthAddress`
* token1 `EthAddress`
* reserve0 `HeximalString`
* reserve1 `HeximalString`

# SeedPair {Array<Object>}

* [].address0 `EthAddress`
* [].address1 `EthAddress`
* [].reserve0 `HeximalString`
* [].reserve1 `HeximalString`

# TokenPairKey {String}

* Pattern `address0/address1`
* address0 `EthAddress` This value is similar like result from method
  `token0()` of token pair contract which is created by two token `address0`
  and `address1`.
* address1 `EthAddress`

// Type RandomKey {String}
//
// Pattern `{HeximalString}/{HeximalString}`
//
// First hex string is lower bound of random, second one is upper bound.
