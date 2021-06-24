// Descriptions
//  * Validate that loop of past processor find out lastest sync event.
//
// Pre-conditions
//  * Database has no state.
//  * Blockchain network has latest block at 5000.
//  * Blockchain network has sync event at block 4000 and there are no sync
//    event from block 4001 to 5000.
//
// Actions
//  * Perform head processing at block 5000.
//  * Perform loop of past processing.

'use strict'

const assert = require('assert')
const LogsStateModel = require('../models/LogsStateModel')
const ConfigModel = require('../models/ConfigModel')
const chainlogHeadProcessor = require('../services/chainlog-head-processor')
const chainlogPastProcessor = require('../services/chainlog-past-processor')
const {createConfig} = require('../services/chainlog-config')
const {
    EthersProviderMock,
    mongooseMock,
    loadConsumer,
} = require('./lib')

describe('consumer/pc-usdt-busd: loop of past processor find out lastest sync log', () => {
    let pastProcessor
    let headProcessor
    let ethersProvider
    let key = 'pc-usdt-busd'
    let chunkSize = 1000
    let lastBlockNumber = 5000

    before(async () => {
        let consumers = loadConsumer(['consumers/pc-usdt-busd'])

        await mongooseMock.open()
        ethersProvider = new EthersProviderMock()
        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-4000')
        ethersProvider.mockGetBlockNumber(lastBlockNumber)
        pastProcessor = chainlogPastProcessor.createProccesor({
            consumers,
            config: createConfig({
                type: 'PAST',
                config: {
                    provider: ethersProvider,
                    size: chunkSize,
                    concurrency: 1,
                },
                hardCap: chunkSize,
                target: chunkSize,
            })
        })
        headProcessor = chainlogHeadProcessor.createProccesor({
            consumers,
            config: createConfig({
                type: 'HEAD',
                config: {
                    provider: ethersProvider,
                    size: chunkSize,
                    concurrency: 1,
                },
                hardCap: chunkSize,
                target: chunkSize,
            })
        })
    })

    after(async () => {
        await mongooseMock.close()
        ethersProvider.removeAllListeners()
    })

    it('should be succeed', async () => {
        await processHeadBlock()
        await processPastLoop()
    })

    async function processHeadBlock() {
        await headProcessor.process(lastBlockNumber)

        let state = await LogsStateModel.findOne({key}).lean()
        let config = await ConfigModel.findOne({key: 'lastHead'}).lean()

        assert.strictEqual(state.value, null)
    }

    async function processPastLoop() {
        for (let n = 0; n < 5; ++n) {
            await pastProcessor.process()
        }

        let state = await LogsStateModel.findOne({key}).lean()
        let config = await ConfigModel.findOne({key: 'lastHead'}).lean()

        assert.strictEqual(state.value, '4000')
    }
})
