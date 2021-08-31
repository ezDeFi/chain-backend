'use strict'

module.exports = {
    startWorker: require('./start-worker'),
    accumulationConsumerFactory: require('./factory/accumulation-consumer'),
    synchronizeConsumerFactory: require('./factory/synchronization-consumer'),
    updateConsumerFactory: require('./factory/update-consumer'),
    chartConsumerFactory: require('./factory/chart-consumer'),
    chainlogProcessorConfig: require('./chainlog-processor-config'),
}
