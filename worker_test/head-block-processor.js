'use strict'

const assert = require('assert')
const ioc = require('@trop/ioc')
const {
    Mongodb,
    StateProvider,
    EthersProvider,
    HeadBlockProcessor
} = require('./types')

describe('HeadBlockProcessor', () => {
    let container
    let stateCollection
    let stateProvider
    let ethersProvider
    let processor

    before(async() => {
        let config = new ioc.Config({
            mongodb_endpoint: 'mongodb://somewhere.io/database'
        })

        container = await ioc.new_container(config, {
            'mongodb': Mongodb,
            'stateProvider': StateProvider,
            'ethersProvider': EthersProvider,
            'headProcessor': HeadBlockProcessor
        })
        stateCollection = container.get('mongodb').stateCollection
        stateProvider = container.get('stateProvider')
        ethersProvider = container.get('ethersProvider')
        processor = container.get('headProcessor')
    })

    after(async() => {
        await container.close()
    })

    it('step 1', async() => {
        stateProvider.mock(['step_1'])
        ethersProvider.mockGetLogs('step_1')

        let head = 0

        await processor.process(head)

        let dbHead = await stateCollection.findOne({}, { _id: 0 })

        assert.deepStrictEqual(dbHead, { head })
    })

    it('step 2', async() => {
        let head = 1

        await processor.process(head)

        let dbHead = await stateCollection.findOne({}, { _id: 0 })

        assert.deepStrictEqual(dbHead, { head })
    })
})
