// Descriptions
//  * Validate that head processor should not process old block.
//
// Pre-conditions
//  * Database has state that point to block 5000.
//  * Blockchain network has latest sync event at block 5000 and there are
//    sync event at block 4000.
//
// Actions
//  * Perform head processing at block 4000.

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

describe('consumer/pc-usdt-busd: head processor should not process old block', () => {
    let headProcessor
    let ethersProvider
    let key = 'pc-usdt-busd'
    let chunkSize = 1000

    before(async () => {
        let consumers = loadConsumer(['consumers/pc-usdt-busd'])

        await mongooseMock.open()
        ethersProvider = new EthersProviderMock()
        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-5000')
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
            value: '5000',
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
        await headProcessor.process(4000)

        let {value} = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(value, '5000')
    })
})
