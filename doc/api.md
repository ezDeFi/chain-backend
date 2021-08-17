# APIs

```js
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

function createSyncConsumer() {}
function createUpdateConsumer() {}
function createChainlogConfig() {}
```
