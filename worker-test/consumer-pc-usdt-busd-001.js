// Descriptions
//  * Validate worker run on blockchain network that has number of blocks is
//    far smaller than configurations, some errors occurs.
//
// Pre-conditions
//  * Empty database.
//  * Blockchain already has 100 blocks.
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

describe.skip('consumer/pc-usdt-busd: succeed with few blocks', () => {
    let worker
    let consumers
    let ethersProvider
    let key = 'pc-usdt-busd'

    before(async () => {
        await mongooseMock.open()
        consumers = loadConsumer(['consumers/pc-usdt-busd'])
        ethersProvider = new EthersProviderMock()
    })

    after(async () => {
        await mongooseMock.close()

        if (worker) {
            await worker.close()
        }
    })

    it('should be succeed', async() => {
        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-100')
        worker = await chainlogWorkerFactory({
            consumers,
            ethersProvider
        })
        await delay(500)

        let actual = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(actual.value, '100')
    })
})
