# APIs

* [startWorker()](#startworker)
* [factory.accumulationConsumer()](#factoryaccumulationconsumer)
* [factory.synchronizationConsumer()](#factorysynchronizationconsumer)
* [factory.updateConsumer()](#factoryupdateconsumer)
* [chainlogProcessorConfig()](#chainlogprocessorconfig)

## startWorker()

```js
const {startWorker} = require('chain-backend')

// Description
//  * Start a worker that retrieve and store data from Binance Smart Chain
//    network.
//
// Input
//  * config {WorkerConfiguration}
async function startWorker(config) {}
```

## factory.accumulationConsumer()

```js
const {accumulationConsumer} = require('chain-backend').factory

// Description
// ?
//
// Input
//  * config {AccumulatorConsumerConfig}
//
// Output {Consumer}
function accumulationConsumer(config) {}
```

## factory.synchronizationConsumer()

```js
const {synchronizationConsumer} = require('chain-backend').factory

// Description
// ?
//
// Input
//  * config {SyncConsumerConfig}
//
// Output {Consumer}
function synchronizationConsumer() {}

```

## factory.updateConsumer

```js
const {updateConsumer} = require('chain-backend').factory

// Description
// ?
//
// Input {UpdateConsumerConfig}
//
// Output {Consumer}
function updateConsumer() {}
```

## chainlogProcessorConfig()

```js
const {chainlogProcessorConfig} = require('chain-backend')

// Description
//  * Create a configuration to pass to services in 
//    './service/chainlog-head-processor.js' and 
//    './service/chainlog-past-processor.js'.
//
// Input
//  * options {Object}
//  * options.type {String} 'HEAD' or 'PAST'.
//  * options.config {Object}
//  * options.config.provider {ethers.providers.JsonRpcProvider}
//  * options.config.size {Number ?}
//  * options.config.concurrency {Number ?}
//  * options.hardCap {Number ?}
//  * options.target {Number ?}
//
// Output {Object}
//  * getLogs {function ?}
//  * getConcurrency {function ?}
//  * getSize {function ?}
function chainlogProcessorConfig({type, config, hardCap=4000, target=500}) {}
```
