// Descriptions
//  * Valiate that head processor should not update state from block that has
//    no sync event.
//
// Pre-conditions
//  * Database has state that point to block 4000.
//  * Blockchain network has latest sync log at block 4000.
//  * Blockchain network has latest block at 5000 and there are no sync event
//    at block 5000.
//
// Actions
//  * Perform head processing at block 5000.

'use strict'

const assert = require('assert')
const LogsStateModel = require('../models/LogsStateModel')
const chainlogHeadProcessor = require('../services/chainlog-head-processor')
const {createConfig} = require('../services/chainlog-config')
const {
    EthersProviderMock,
    mongooseMock,
    loadConsumer,
} = require('./lib')

describe('consumer/pc-usdt-busd: head processor should not update state from block that has no sync event', () => {
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
        LogsStateModel.create({
            key: key,
            value: '4000',
            range: {
                lo: 0,
                hi: undefined
            }
        })
    })

    after(async () => {
        await mongooseMock.close()
        ethersProvider.removeAllListeners()
    })

    it('should be succeed', async () => {
        await headProcessor.process(lastBlockNumber)

        let {value} = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(value, '4000')
    })
})
