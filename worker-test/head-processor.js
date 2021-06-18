'use strict'

const assert = require('assert')
const ioc = require('@trop/ioc')
const {
    ChunkSize,
    EthersLogProvider,
    HeadProcessor,
    PastProcessor
} = require('../services')
const {
    Mongodb,
    ConsumerLoader,
    EthersProvider,
} = require('./mock-service')

describe('HeadProcessor', () => {
    let container
    let configCollection
    let logStateCollection
    let consumerLoader
    let ethersProvider
    let processor
    let pastProcessor

    before(async() => {
        let config = new ioc.Config({
            mongodb_endpoint: 'mongodb://somewhere.io/database'
        })

        container = await ioc.new_container(config, {
            'mongodb': Mongodb,
            'chunkSize': ChunkSize,
            'consumerLoader': ConsumerLoader,
            'ethersProvider': EthersProvider,
            'ethersLogProvider': EthersLogProvider,
            'headProcessor': HeadProcessor,
            'pastProcessor': PastProcessor
        })
        configCollection = container.get('mongodb').configCollection
        logStateCollection = container.get('mongodb').logStateCollection
        consumerLoader = container.get('consumerLoader')
        ethersProvider = container.get('ethersProvider')
        processor = container.get('headProcessor')
        pastProcessor = container.get('pastProcessor')
    })

    after(async() => {
        await container.close()
    })

    it('step 1', async() => {
        consumerLoader.mock(['consumers/pc-usdt-busd'])
        ethersProvider.mockGetLogs('step_1')

        let head = 0

        await processor.process(head)

        let config = await configCollection.findOne({}, { _id: 0 })
        let logState = await logStateCollection.findOne({}, {_id: 0})

        assert.deepStrictEqual(config, {
            key: 'lastHead',
            value: 8283952
        })
        assert.deepStrictEqual(logState, {
            key: 'pc-usdt-busd',
            range: {
                hi: 8283952,
                lo: -2000
            },
            value: undefined
        })
    })

    it('step 2', async() => {
        consumerLoader.mock(['consumers/pc-usdt-busd'])
        ethersProvider.mockGetLogs('step_1')
        await pastProcessor.process()

        let state = await logStateCollection.findOne({}, {_id: 0})

        assert.deepStrictEqual(state, {})
    })
})
