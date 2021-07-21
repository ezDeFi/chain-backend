'use strict'

const assert = require('assert')
const configLoader = require('../config-loader')

describe('configLoader', () => {
    beforeEach(() => {
        configLoader.reset()
    })

    it('get first configuration', () => {
        let config = configLoader.next()

        assert.notStrictEqual(config, undefined)
    })

    it('get all configurations', () => {
        for (;;) {
            let config = configLoader.next()

            if (config === undefined) {
                break
            }

            assert.notStrictEqual(config, undefined)
        }
    })
})
