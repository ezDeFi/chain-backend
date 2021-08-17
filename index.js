'use strict'

module.exports = {
    startWorker: require('./start-worker'),
    createAccumulatorConsumer:  require('./factory/ac'),
    createSyncConsumer: require('./factory/sync'),
    createUpdateConsumer: require('./factory/update'),
    createChainlogConfig: require('./services/chainlog-config')
}
