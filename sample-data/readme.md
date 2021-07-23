# Sample Data

* Give APIs to make deterministic sample token pairs, where each items
  contains attributes `address`, `reserve0`, `reserve1` and few others
  properties. See [API References](#api-references) for more details.

# API References

```js
const {getDb, MakeConfigError} = require('./sample-data')
```

```js
// Descriptions
//  * Make token pair state set from configuration.
//
// Input
//  * config {Object}
//  * config.seedValue {Number | String} It is use as seed value to random
//    reserve of tokens. If it does not specify then take default as `0x7531246`.
//    It is postivie integer.
//  * config.seedPairCount {Number} Number of seed pairs is use to make token.
//    It is unsigned integer.
//  * config.pairSpecs {Array<Object>} Each seed pairs produces 5 pairs on
//    five exchanges, include: `pancake`, `pancake2`, `bakery`, `jul` and `ape`.
//    If it does not specify then all seed pairs is use.
//  * config.pairSpecs[].addressA {String} ETH address, with or without prefix
//    `0x`, checksum or not checksum.
//  * config.pairSpecs[].addressB {String}
//  * config.pairSpecs[].exchanges {Array<Object>}
//  * config.pairSpecs[].exchanges[].name {String} Name of exchange, it can be
//    one of following value: `pancake`, `pancake2`, `bakery`, `jul` and `ape`.
//  * config.pairSpecs[].exchanges[].boundaryA {Array} Boundary to random
//    reserve for `addressA`.
//  * config.pairSpecs[].exchanges[].boundaryA[0] {String} Lower bound,
//    heximal string.
//  * config.pairSpecs[].exchanges[].boundaryA[1] {String} Upper bound.
//  * config.pairSpecs[].exchanges[].boundaryB {Array} Boundary to random
//    reserve for `addressB`.
//
// Output {Map<key, value>}
//  * key {String} ETH address of token pair.
//  * value {Object}
//  * value.address {String} It is the same as `key`.
//  * value.factory {String} Name of exchange.
//  * value.token0 {String} ETH address of token0.
//  * value.token1 {String} ETH address of token0.
//  * value.reserve0 {String} Reserve of token0.
//  * value.reserve1 {String} Reserve of token1.
//
// Errors
//  * MakeConfigError
function getDb(config) {}
```

# Examples

```js
const {getDb} = require('./sample-data')

let config = {
    seedValue: 0x4213,
    seedPairCount: 3,
    pairSpecs: [
        {
            addressA: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
            addressB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
            exchanges: [
                {
                    name: 'pancake',
                    boundaryA: ['13579864', '135798645af'],
                    boundaryB: ['97531246', '975312467af']
                }
            ]
        }
    ]
}
let pairMap = getDb(config)
let pair = pairMap.get('0xA527a61703D82139F8a06Bc30097cC9CAA2df5A6')

// address: '0xA527a61703D82139F8a06Bc30097cC9CAA2df5A6',
// factory: 'pancake',
// token0: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
// token1: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
// reserve0: '1bd5aa8ab1',
// reserve1: '47353ece97d'
```
