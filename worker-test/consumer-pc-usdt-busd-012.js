// Descriptions
//  * Valiate that past processor should not update state if there is an existed
//    in database.
//
// Pre-conditions
//  * Database has state point to block 5000.
//  * Blockchain network has latest block at 5000 and there are sync events
//    from block 0 to 5000.
//
// Actions
//  * Perform past processing at block 4000.

'use strict'

const assert = require('assert')
const LogsStateModel = require('../models/LogsStateModel')
const chainlogPastProcessor = require('../services/chainlog-past-processor')
const {createConfig} = require('../services/chainlog-config')
const {
    EthersProviderMock,
    mongooseMock,
    loadConsumer,
} = require('./lib')

describe('comsumer/pc-usdt-busd: past processor should not update state if there is a exists in database', () => {
    let pastProcessor
    let ethersProvider
    let key = 'pc-usdt-busd'
    let chunkSize = 1000

    before(async () => {
        let consumers = loadConsumer(['consumers/pc-usdt-busd'])

        await mongooseMock.open()
        ethersProvider = new EthersProviderMock()
        ethersProvider.mockGetLogs('worker-test/log/pc-usdt-busd-5000')
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
        for (let n = 0; n < 5; ++n) {
            await pastProcessor.process()
        }

        let {value} = await LogsStateModel.findOne({key}).lean()

        assert.strictEqual(value, '5000')
    })
})
