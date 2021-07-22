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

* make_count `PositiveInteger` This configuration will be use to make
  `make_count` token pair state set.
* seed_pair_count `PositiveInteger` Number of seed token pairs will be use to
  make sample data.
* pair_specs `Array<MakePairSpec>` List of specifications to create token
  pairs and it's state. This specification overrides token pairs from seed
  data which is limit by `seed_pair_count`.

# MakePairSpec {Object}

* address_a `EthAddress`
* address_b `EthAddress`
* exchanges `Array<MakeExchangeSpec>` List of exchanges for token pair.

# MakeExchangeSpec {Object}

* name `ExchangeName`
* boundary_a `HeximalRandomBoundary`
* boundary_b `HeximalRandomBoundary`

# HeximalRandomBoundary {Array}

* [0] `HeximalString` Lower boundary.
* [1] `HeximalString` Upper boundary.

# TokenPairStateSet {Array<TokenPairState>}

# TokenPairState {Object}

* address `EthAddress`
* reserve0 `BigNumber`
* reserve1 `BigNumber`

# SeedPairState {Array<Object>}

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
