// Descriptions
//  * Validate the worker on many new block events.
//
// Pre-conditions
//  * Database has no state.
//  * Blockchain already has few blocks.
//
// Actions
//  * Start worker.
//  * Emit many new block events.

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

describe('consumer/pc-usdt-busd: handle many new block events', () => {
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
        await emitManyNewBlockEvents()
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

        assert.strictEqual(state.value, '4000')
    }

    async function emitManyNewBlockEvents() {
        let pairAddress = '0xD1F12370b2ba1C79838337648F820a87eDF5e1e6'
        let topics = [
            '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'
        ]

        for (let n = 4001; n < 4016; ++n) {
            let fromBlock = n
            let toBlock = n
            let logs = makeLog(pairAddress, toBlock, topics, fromBlock)

            ethersProvider.mockEmitNewBlockEvent(n, logs)
            await delay(250)

            let state = await LogsStateModel.findOne({key}).lean()

            assert.strictEqual(state.value, n.toString())
        }
    }
})
