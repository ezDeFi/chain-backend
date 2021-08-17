'use strict'

module.exports = {
    startWorker: require('./start-worker'),
    createAccumulatorConsumer:  require('./factory/create-accumulator-consumer'),
    createSyncConsumer: require('./factory/create-sync-consumer'),
    createUpdateConsumer: require('./factory/create-update-consumer'),
    createChainlogConfig: require('./chainlog-service').createConfig
}
