// Descriptions
//  * Validate the worker handles blockchain network that has only one genesis blocks.
//
// Pre-conditions
//  * Database has no state.
//  * Blockchain has only one logs from genesis blocks.
//
// Actions
//  * Start worker.

'use strict'

const assert = require('assert')
const {delay} = require('@trop/gear')
const {
    EthersProviderMock,
    mongooseMock,
    loadConsumer,
    chainlogWorkerFactory,
} = require('./lib')
const LogsStateModel = require('../models/LogsStateModel')

describe('consumer/pc-usdt-busd: on genesis blockchain network', () => {
    let worker
    let ethersProvider
    let key = 'pc-usdt-busd'

    before(async () => {
        await mongooseMock.open()
        ethersProvider = new EthersProviderMock()
    })

    after(async () => {
        await mongooseMock.close()

        if (worker) {
            await worker.close()
        }
    })

    it('should be succeed', async () => {
        let consumers = loadConsumer(['consumers/pc-usdt-busd'])

        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-1')
        worker = await chainlogWorkerFactory({
            consumers,
            ethersProvider
        })
        await delay(500)

        let state = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(state.value, '0')
    })
})
