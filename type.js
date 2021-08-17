// Type WorkerConfiguration {Object}
//  * consumerConstructors {Array<ConsumerConstructor>}
//  * mongoose {mongoose.Mongoose}
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
