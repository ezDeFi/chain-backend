# APIs

```js
// Notes:
//  * See './type.md' for more details of related types.

const {
    startWorker, 
    createAccumulatorConsumer,
    createSyncConsumer,
    createUpdateConsumer,
    createChainlogConfig
} = require('chain-backend')

// Description
//  * Start a worker that retrieve and store data from Binance Smart Chain
//    network.
//
// Input
//  * config {WorkerConfiguration}
async function startWorker(config) {}

// Description
// ?
//
// Input
//  * config {AccumulatorConsumerConfig}
//
// Output {Consumer}
function createAccumulatorConsumer(config) {}

// Description
// ?
//
// Input
//  * config {SyncConsumerConfig}
//
// Output {Consumer}
function createSyncConsumer() {}

// Description
// ?
//
// Input {UpdateConsumerConfig}
//
// Output {Consumer}
function createUpdateConsumer() {}

// Description
// ?
//
// Input 
//  * options {CreateChainlogConfigOptions}
//
// Output {ProcessorConfig}
function createChainlogConfig(options) {}
```
