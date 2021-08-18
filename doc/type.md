# Types

```js
// Type WorkerConfiguration {Object}
//  * consumerConstructors {Array<ConsumerConstructor>}
//  * mongoose {mongoose.Mongoose} There are reserved model's names and must
//    not use by outside of function `startWorker()`: 'Config', 'LogsState'.
//  * ethersProvider {ethers.providers.JsonRpcProvider}
//  * pastProcessorConfig {ChainlogProcessorConfig}
//  * headProcessorConfig {ChainlogProcessorConfig}

// Type ConsumerConstructor {function(config)}
//
// Input
//  * config.mongoose {mongoose.Mongoose}
//  
// Output {Consumer}


// Type ChainlogProcessorConfig {Object}
//  * getLogs {function ?}
//  * getConcurrency {function ?}
//  * getSize {function ?}


// Type AccumulatorConsumerConfig
//  * key {String}
//  * filter {Object ?}
//  * genesis {String} A number as string.
//  * applyLogs {function ?}
//  * mongoose {mongoose.Mongoose}


// Type SyncConsumerConfig {Object}
//  * key {String}
//  * filter {Object ?}
//  * genesis {String} A number as string.
//  * applyLogs {function ?}
//  * rangeLimit {Number}
//  * mongoose {mongoose.Mongoose}


// Type UpdateConsumerConfig {Object}
//  * key {String}
//  * filter {Object ?}
//  * genesis {String} A number as string.
//  * applyLogs {function ?}
//  * mongoose {mongoose.Mongoose}


// Type Consumer {Object}
//  * key {String}
//  * getRequests {function(?)}

// Type CreateChainlogConfigOptions {Object}
//  * options.type {String}
//  * options.config {?}
//  * options.hardCap {Number}
//  * options.target {Number}
```
