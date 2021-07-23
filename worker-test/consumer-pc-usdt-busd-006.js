// Descriptions
//  * Validate the worker handles blockchain network that has many blocks.
//  * Since there are many blocks, the worker does loops on processing.
//
// Pre-conditions
//  * Database has no state.
//  * Blockchain network has many blocks.
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

describe('consumer/pc-usdt-busd: on blockchain network that has many blocks', () => {
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

        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-60000')
        worker = await chainlogWorkerFactory({
            consumers,
            ethersProvider
        })
        await delay(500)

        let state = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(state.value, '60000')
    })
})
