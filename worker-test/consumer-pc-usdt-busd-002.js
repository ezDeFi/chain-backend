// Descriptions
//  * Validate the worker handles present blockchain network properly.
//  * Worker should handles new block event.
//
// Pre-conditions
//  * Database has state point to block 5000.
//  * Blockchain already has 5000 blocks.
//
// Actions
//  * Start worker.
//  * Emit new block event at 5001.

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

describe('consumer/pc-usdt-busd: on present blockchain network', () => {
    let worker
    let consumers
    let ethersProvider
    let key = 'pc-usdt-busd'

    before(async () => {
        await mongooseMock.open()
        consumers = loadConsumer(['consumers/pc-usdt-busd'])
        ethersProvider = new EthersProviderMock()
        LogsStateModel.create({
            key: key,
            value: '5000',
            range: {
                lo: 0,
                hi: 5000
            }
        })
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
        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-5000')
        worker = await chainlogWorkerFactory({
            consumers,
            ethersProvider
        })
        await delay(500)

        let state = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(state.value, '5000')
    }

    async function emitNewBlockEvent() {
        let pairAddress = '0xD1F12370b2ba1C79838337648F820a87eDF5e1e6'
        let topics = [
            '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'
        ]
        let fromBlock = 5001
        let toBlock = 5001
        let logs = makeLog(pairAddress, toBlock, topics, fromBlock)

        ethersProvider.mockEmitNewBlockEvent(5001, logs)
        await delay(500)

        let state = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(state.value, '5001')
    }
})
