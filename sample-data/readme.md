# Sample Data

* This module makes sample dataset, where dataset is set of token pair states,
  each token pair state includes it's `address`, `reserve0` and `reserve1`.
* It also exports APIs to access to that sample data, see [APIs](#apis) for
  more details.

# Use

```bash
npm run make-sample-data
```

* This command should be skip, unless there is no files in data directory or
  configuration files is changed or added.
* It deletes all existed data files then makes new ones from configuration
  files.
* Configuration files is located at directory `./config`, see [Configuration
  File](#configuration-file) for more details.
* Generated data is put into directory `./data`. That data is deterministic no
  matter what, unless configuration files is changed.
* After all, data can be retrieve by [APIs](#apis).

# APIs

```js
const {listPairStateMap, readPairStateMap} = require('./sample-data')
```

```js
// Descriptions
//  * Retrieve list of dataset's name that can be load by
//    `readPairStateMap()`.
//
// Output {Array<String>}
function listPairStateMap() {}
```

```js
// Input
//  * name {String} Name of dataset that can be retrieve by
//    `listPairStateMap()`.
//
// Output {Map<key, value>}
//  * key {EthAddress}
//  * value {Object}
//  * value.address {String} ETH address of token pair as heximal string.
//  * value.reserve0 {String} Reserve of token0 as heximal string.
//  * value.reserve1 {String}
function readPairStateMap() {}
```

# Examples

```js
const {listPairStateMap, readPairStateMap} = require('./sample-data')

let names = listPairStateMap()
let stateMap = readPairStateMap(names[1])
let state = data.get('6BE969fa4c9AcE0D62825d9Cd6609925Ea7CebCE')

// {
//   address: '6BE969fa4c9AcE0D62825d9Cd6609925Ea7CebCE',
//   reserve0: '63e557a00f0e6',
//   reserve1: '72a79608bbe42'
// }
```

# Configuration Files

## Descriptions

* Configuration file is used to make sample data by invoke `npm run
  make-sample-data`.
* Configuration files is located at directory `./config` and can be add more
  as needed.
* Each configuration files produces more than one a dataset, depend on
  attribute `make_count`.
* Configuration file follows JSON data structure. 

## Specifications

* **make_count** `{Number}` Number of datasets will be make from this
  configuration.
* **seed_pair_count** `{Number}` Number of seed pairs to be include as
  results. A seed pair produces 5 pairs on five exchanges. There are 5000 seed
  pairs. If this attritute does not specify then all seed pairs is use.
* **pair_specs** `{Array<Object>}` List of token pair and specification to
  make sample data.
* **pair_specs[].address_a** `{String}` ETH address of a token. It could be
  checksum or non-checksum address, prefix with or without `0x`.
* **pair_specs[].address_b** `{String}` An other ETH address that create a pair
  with `address_a`.
* **pair_specs[].exchanges** `{Array<Object>}` List of exchange providers that
  token pair will be listed on.
* **pair_specs[].exchanges[].name** `{String}` Name of exchange provider, one
  of following values: `pancake`, `pancake2`, `bakery`, `jul` or `ape`.
* **pair_specs[].exchanges[].boundary_a** `{Array}` Boundary to random reserve
  for `address_a`.
* **pair_specs[].exchanges[].boundary_a[0]** `{String}` Lower boundary,
  non-negative integer nubmer as a heximal string, with or without prefix
  `0x`.
* **pair_specs[].exchanges[].boundary_a[0]** `{String}` Upper boundary.
* **pair_specs[].exchanges[].boundary_b** `{Array}` Boundary of reserve for
  `address_b`, data structure is similar like `boundary_a`.

## Example

```json
{
    "make_count": 3,
    "seed_pair_count": 5000,
    "pair_specs": [
        {
            "address_a": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
            "address_b": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
            "exchanges": [
                {
                    "name": "pancake",
                    "boundary_a": ["13579864abc", "135798645def"],
                    "boundary_b": ["97531246abd", "975312467def"]
                },
                {
                    "name": "pancake2",
                    "boundary_a": ["1357986420abc", "13579864200def"],
                    "boundary_b": ["9753124680abd", "97531246800def"]
                },
                {
                    "name": "bakery",
                    "boundary_a": ["135798abd", "1357980def"],
                    "boundary_b": ["975312abc", "9753120def"]
                },
                {
                    "name": "jul",
                    "boundary_a": ["1357abc", "13570def"],
                    "boundary_b": ["9753abc", "97530def"]
                },
                {
                    "name": "ape",
                    "boundary_a": ["135abc", "1350def"],
                    "boundary_b": ["975abc", "9750def"]
                }
            ]
        }
    ]
}
```
