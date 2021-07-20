# Sample Data

* Provide a way to make sample dataset, where dataset is set of token pair
  state, each token pair state includes it's address, reserve of token0 and
  token1.
* Provide APIs to access to that sample data.

# Use

```bash
npm run make-sample-data
```

* This comand deletes all existed data files then makes sample data from
  configuration file.
* Configuration files is located at directory `./config`, see [Configuration
  File](#configuration-file) for more details.
* Generated data is put into directory `./data`. This command can be skip,
  unless there is no files in data directory or configuration files is changed
  or added.
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
//
// Output {Map<key, value>}
//  * key {EthAddress}
//  * value {Object}
//  * value.address {String} Address of token pair.
//  * value.reserve0 {DecimalString}
//  * value.reserve1 {DecimalString}
function readPairStateMap() {}
```

# Examples

```js
const {listPairStateMap, readPairStateMap} = require('./sample-data')

let names = listPairStateMap()
let data = readPairStateMap(names[1])
```

# Configuration Files

## Descriptions

* Configuration file is used to make sample data by invoke `npm run
  make-sample-data`.
* Configuration files is located at directory `./config` and can be add more
  as needed.
* Each configuration file can produces more than one a dataset, depend on
  attribute `random_count`.
* Configuration file follows JSON data structure. 

## Specifications

* **ranom_count** `{Number}` Number of dataset will be make from this
  configuration.
* **token_pairs** `{Array<Object>}` List of token pair and specification to
  make sample data.
* **token_pairs[].token_a** `{String}` ETH address of a token.
* **token_pairs[].token_b** `{String}` An other ETH address that create a pair
  with `token_a`.
* **token_pairs[].exchanges** `{Array<Object>}` List of exchange providers that
  token pair will be listed on.
* **token_pairs[].exchanges[].name** `{String}` Name of exchange provider, one
  of `pancake`, `pancake2`, `bakery`, `jul` or `ape`.
* **token_pairs[].exchanges[].boundary_a** `{Array}` Boundary to random reserve
  for `token_a`.
* **token_paris[].exchanges[].boundary_a[0]** `{String}` Lower boundary,
  non-negative integer nubmer as a decimal string.
* **token_paris[].exchanges[].boundary_a[0]** `{String}` Upper boundary.
* **token_paris[].exchanges[].boundary_b** `{Array}` Data structure is similar
  like `boundary_a` and it's use for `token_b`.

## Example

```json
{
    "random_count": 3,
    "token_pairs": [
        {
            "token_a": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
            "token_b": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
            "exchanges": [
                {
                    "name": "pancake",
                    "boundary_a": ["13579864", "135798645"],
                    "boundary_b": ["97531246", "975312467"]
                },
                {
                    "name": "pancake2",
                    "boundary_a": ["1357986420", "13579864200"],
                    "boundary_b": ["9753124680", "97531246800"]
                },
                {
                    "name": "bakery",
                    "boundary_a": ["135798", "1357980"],
                    "boundary_b": ["975312", "9753120"]
                },
                {
                    "name": "jul",
                    "boundary_a": ["1357", "13570"],
                    "boundary_b": ["9753", "97530"]
                },
                {
                    "name": "ape",
                    "boundary_a": ["135", "1350"],
                    "boundary_b": ["975", "9750"]
                }
            ]
        }
    ]
}
```
