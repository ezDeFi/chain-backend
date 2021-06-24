// Descriptions
//  * Validate the worker handles past blockchain network properly.
//  * The worker should not handle new blocks at the past.
//
// Pre-conditions
//  * Database has state that point to block 5000.
//  * Blockchain has 4000 blocks
//
// Actions
//  * Start worker.
//  * Emit new block event at 4001.

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

describe('consumer/pc-usdt-busd: on the past blockchain network', () => {
    let worker
    let ethersProvider
    let key = 'pc-usdt-busd'

    before(async () => {
        await mongooseMock.open()
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
        let consumers = loadConsumer(['consumers/pc-usdt-busd'])

        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-4000')
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
        let fromBlock = 4001
        let toBlock = 4001
        let logs = makeLog(pairAddress, toBlock, topics, fromBlock)

        ethersProvider.mockEmitNewBlockEvent(4001, logs)
        await delay(500)

        let state = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(state.value, '5000')
    }
})
