// Descriptions
//  * Validate the worker on blockchain network that has no matched logs.
//
// Pre-conditions
//  * Database has no state.
//  * Blockchain has logs that does not match with USDT/BUSD pair.
//
// Actions
//  * Start worker.
//  * Emit new block event with not matched pair address.

'use strict'

const assert = require('assert')
const {delay} = require('@trop/gear')
const {
    EthersProviderMock,
    mongooseMock,
    loadConsumer,
    makeLog,
    chainlogWorkerFactory,
} = require('./lib')
const LogsStateModel = require('../models/LogsStateModel')

describe('consumer/pc-usdt-busd: on blockchain network that has no matched logs', () => {
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
        await startWorker()
        await emitNewBlockEvent()
    })

    async function startWorker() {
        let consumers = loadConsumer(['consumers/pc-usdt-busd'])

        ethersProvider.mockGetLogs('worker-test/log/zero-address-4000')
        worker = await chainlogWorkerFactory({
            consumers,
            ethersProvider
        })
        await delay(500)

        let state = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(state.value, null)
    }

    async function emitNewBlockEvent() {
        let pairAddress = '0x0000000000000000000000000000000000000000'
        let topics = [
            '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'
        ]
        let fromBlock = 4001
        let toBlock = 4001
        let logs = makeLog(pairAddress, toBlock, topics, fromBlock)

        ethersProvider.mockEmitNewBlockEvent(4001, logs)
        await delay(500)

        let state = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(state.value, null)
    }
})
