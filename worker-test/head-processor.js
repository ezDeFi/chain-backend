'use strict'

const assert = require('assert')
const ioc = require('@trop/ioc')
const {
    ChunkSize,
    LogProvider,
    HeadProcessor
} = require('../services')
const {
    Mongodb,
    ConsumerLoader,
    EthersProvider,
} = require('./mock-service')

describe('HeadProcessor', () => {
    let container
    let configCollection
    let consumerLoader
    let ethersProvider
    let processor

    before(async() => {
        let config = new ioc.Config({
            mongodb_endpoint: 'mongodb://somewhere.io/database'
        })

        container = await ioc.new_container(config, {
            'mongodb': Mongodb,
            'chunkSize': ChunkSize,
            'consumerLoader': ConsumerLoader,
            'ethersProvider': EthersProvider,
            'logProvider': LogProvider,
            'headProcessor': HeadProcessor
        })
        configCollection = container.get('mongodb').configCollection
        consumerLoader = container.get('consumerLoader')
        ethersProvider = container.get('ethersProvider')
        processor = container.get('headProcessor')
    })

    after(async() => {
        await container.close()
    })

    it('step 1', async() => {
        consumerLoader.mock(['consumers/sync-pc-usdt-busd'])
        ethersProvider.mockGetLogs('step_1')

        let head = 0

        await processor.process(head)

        let dbHead = await configCollection.findOne({}, { _id: 0 })

        assert.deepStrictEqual(dbHead, { head })
    })
})
