'use strict'

const assert = require('assert')
const dataStorage = require('../data-storage')

describe('dataStorage.list', () => {
    it('return non empty list of dataset\'s name', () => {
        let names = dataStorage.list()

        assert.strictEqual(Array.isArray(names), true)
        assert.strictEqual(names.length > 0, true)
    })
})

describe('dataStorage.read', () => {
    it('first dataset return empty result', () => {
        let names = dataStorage.list()
        let pairStateMap = dataStorage.read(names[0])

        assert.strictEqual(pairStateMap instanceof Map, true)
        assert.strictEqual(pairStateMap.size, 0)
    })

    it('from second dataset return non empty result', () => {
        let names = dataStorage.list()
        let fromSecondNames = names.splice(1)
       
        for (let name of fromSecondNames) {
            let pairStateMap = dataStorage.read(name)

            assert.strictEqual(pairStateMap instanceof Map, true)
            assert.strictEqual(pairStateMap.size > 0, true)
        }
    })
})
