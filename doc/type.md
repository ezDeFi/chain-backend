# Types

```js
// Type WorkerConfiguration {Object}
//  * consumerConstructors {Array<ConsumerConstructor>}
//  * mongoose {mongoose.Mongoose} There are reserved model's names and must
//    not use by outside of function `startWorker()`: 'Config', 'LogsState'.
//  * ethersProvider {ethers.providers.JsonRpcProvider}
//  * pastProcessorConfig {ProcessorConfig}
//  * headProcessorConfig {ProcessorConfig}

// Type ConsumerConstructor {function(config)}
//
// Input
//  * config.mongoose {mongoose.Mongoose}
//  
// Output {Consumer}


// Type ProcessorConfig {Object}
//  * getLogs {function ?}
//  * getConcurrency {function ?}
//  * getSize {function ?}


// Type AccumulatorConsumerConfig
//  * key {String}
//  * filter {ethers.Contract.Filter}
//  * genesis {String}
//  * mongo {MongoService}
//  * applyLogs {function ?}

// Type Consumer {Object}
//  * key {String}
//  * getRequests {function(?)}
```
