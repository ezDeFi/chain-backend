# APIs

* [startWorker()](#startworker)
* [factory.accumulationConsumer()](#factoryaccumulationconsumer)
* [factory.synchronizationConsumer()](#factorysynchronizationconsumer)
* [factory.updateConsumer()](#factoryupdateconsumer)
* [chainlogProcessorConfig()](#chainlogprocessorconfig)
* [Types](#types)

## startWorker()

```js
const {startWorker} = require('chain-backend')

// Description
//  * Start a worker that retrieve and store data from Binance Smart Chain
//    network.
//
// Input
//  * config {Object}
//  * config.consumerConstructors {Array<ConsumerConstructor>}
//  * config.mongoose {mongoose.Mongoose} There are reserved model's names and
//    must not use by outside of this function: 'Config', 'LogsState'.
//  * config.processorConfigs {Object}
//
// Errors
//  * ChainBackendError
async function startWorker(config) {}
```

## factory.accumulationConsumer()

```js
const {accumulationConsumer} = require('chain-backend').factory

// Input
//  * config {Object}
//  * config.key {String}
//  * config.filter {ethers.Contract.Filter}
//  * config.genesis {String}
//  * config.applyLogs {applyLogsFunction}
//  * config.mongoose {ChainBackendMongoose}
//
// Output {Consumer}
function accumulationConsumer(config) {}
```

## factory.synchronizationConsumer()

```js
const {synchronizationConsumer} = require('chain-backend').factory

// Input
//  * config {Object}
//  * config.key {String}
//  * config.filter {ethers.Contract.Filter}
//  * config.genesis {String} A number as string.
//  * config.applyLogs {applyLogsFunction}
//  * config.rangeLimit {Number}
//  * config.mongoose {ChainBackendMongoose}
//
// Output {Consumer}
function synchronizationConsumer() {}

```

## factory.updateConsumer

```js
const {updateConsumer} = require('chain-backend').factory

// Input
//  * config {Object}
//  * config.key {String}
//  * config.filter {ethers.Contract.Filter}
//  * config.genesis {String} A number as string.
//  * config.applyLogs {function applyLogsFunction}
//  * config.mongoose {ChainBackendMongoose}
//
// Output {Consumer}
function updateConsumer() {}
```

## chainlogProcessorConfig()

```js
const {chainlogProcessorConfig} = require('chain-backend')

// Description
//  * Create a configuration which is pass to 'startWorker(config)' as input
//  'config.processorConfigs'.
//
// Input
//  * options {Object}
//  * options.type {String} 'HEAD' or 'PAST'.
//  * options.config {Object}
//  * options.config.provider {ethers.providers.JsonRpcProvider}
//  * options.config.size {Number}
//  * options.config.concurrency {Number}
//  * options.hardCap {Number}
//  * options.target {Number}
//
// Output {Object}
//  * getLogs {getLogsFunction}
//  * getConcurrency {function() => Number}
//  * getSize {function() => Number}
function chainlogProcessorConfig({type, config, hardCap=4000, target=500}) {}
```

## Types

```js
// Type Consumer {Object}
//  * key {String}
//  * getRequests {getRequestsFunction}


// Type getRequestsFunction {function}
//
// Input
//  * options {Object}
//  * options.maxRange {Number}
//  * options.lastHead {Number}
//
// Output {ConsumerRequest}


// Type ConsumerRequest {Object}
//  * key {String}
//  * address {String}
//  * topics {ethers.providers.EventFilter.topics}
//  * from {Number}
//  * processLogs  {processLogsFunction}


// Type getLogsFuction {function}
//
// Input
//  * filter {ethers.providers.Filter}
//
// Output {Array<ethers.providers.Log>}


// Type processLogsFunction {function}
//
// Input
//  * request {ConsumerRequest}
//  * logs {Array<ethers.providers.Log>}
//  * fromBlock {Number}
//  * toBlock {Number}
//  * lastHead {Number}
//  * head {Number}


// Type applyLogsFunction {function}
//
// Input
//  * value {String}
//  * logs {Array<ethers.providers.Log>}
//
// Output {String}

// Type ChainBackendMongoose {mongoose.Mongoose}
//
// Description
//  * It is an instance of mongoose.Mongoose which is apply internal schemas by
//    'applySchemaList()' from module './lib/mongoose.js'.
```
