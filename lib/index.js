'use strict'

module.exports = {
    startWorker: require('./start-worker'),
    accumulationConsumer:  require('./factory/accumulation-consumer'),
    synchronizeConsumerFactory: require('./factory/synchronization-consumer'),
    updateConsumerFactory: require('./factory/update-consumer'),
    chainlogProcessorConfig: require('./chainlog-processor-config')
}
