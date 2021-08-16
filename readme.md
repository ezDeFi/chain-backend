# Chain Backend

* A library to retrieve and strore data from Binance Smart Chain network.
* See [APIs](#apis) for more details about public APIs.
* See [Types](#types) for more details about related types.
* See [Example](#example) for a quick start.

## APIs

```js
const {
    startWorker, 
    createAccumulatorConsumer,
    createSyncConsumer,
    createUpdateConsumer
} = require('chain-backend')

// Description
//  * Start a worker that retrieve and store data from Binance Smart Chain network.
//
// Input
//  * config {Object}
//  * config.consumerFactories {Array<CreateConsumer>}
//  * config.mongoEndpoint {String}
//  * config.bscEndpoint {String}
async function startWorker(config) {}

// Description
// ?
//
// Input
//  * config {Object}
//  * config.key {String}
//  * config.filter {ethers.Contract.Filter}
//  * config.genesis {String}
//  * config.mongo {MongoService}
//  * config.applyLogs {function ?}
//
// Output {Consumer}
function createAccumulatorConsumer(config) {}

function createSyncConsumer() {}
function createUpdateConsumer() {}
```

## Types

```js
// Type WorkerConfiguration {Object}
//  * consumers {Array<Consumer>}
//  * mongoose {mongoose.Connection}
//  * ethersProvider {ethers.providers.JsonRpcProvider}
//  * pastProcessorConfig {ProcessorConfig}
//  * headProcessorConfig {ProcessorConfig}

// Type Consumer {Object}
// 
// Description
// ?
//
// Attributes
//  * key {String}
//  * getRequests {function(?)}

// Type ProcessorConfig {Object}
//  * getLogs {function ?}
//  * getConcurrency {function ?}
//  * getSize {function ?}

// Type MongoService {Object}
//
// Description
//  * Include models to control database.
//
// Attributes
//  * LogsStateModel {mongoose.Model}
//  * ConfigModel {mongoose.Model}
//  * MemoizeModel {mongoose.Model}

// Type CreateConsumer {function(config)}
//
// Description
//  * The interface to create a consumer.
//
// Input
//  * config.mongo {MongoService}
//  
// Output {Consumer}
```

## Example

```js
'use strict'

const { ethers } = require('ethers')
const {startWorker, createAccumulatorConsumer} = require('./index')
const { ZERO_HASH } = require('./helpers/constants').hexes
const contractABI = require('./ABIs/SFarm.json').abi

function createConsumer(config) {
    let key = 'consumer_1'
    let farm = '0x8141AA6e0f40602550b14bDDF1B28B2a0b4D9Ac6'
    let farmGenesis = '8967359'
    let SFarm = new ethers.Contract(farm, contractABI)

    return createAccumulatorConsumer({
        key: key,
        filter: SFarm.filters.AuthorizeAdmin(null, null),
        genesis: parseInt(farmGenesis),
        mongo: config.mongo,

        applyLogs: (value, logs) => {
            value = {...value}
            logs.forEach(log => {
                const address = ethers.utils.getAddress(
                    '0x'+log.topics[1].slice(26)
                )

                if (log.data != ZERO_HASH) {
                    value[address] = true
                } else {
                    delete value[address]
                }
            })

            return value
        }
    })
}

async function main() {
    await startWorker({
        createConsumerFunctions: [
            createConsumer
        ],
        mongoEndpoint: 'mongodb://localhost/bsc_data_1',
        bscEndpoint: 'https://bsc-dataseed.binance.org'
    })
}

main().catch(console.error)
```
