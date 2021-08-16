'use strict'

const assert = require('assert')
const {standardizeStartConfiguration} = require('../validator')

describe('validator.standardizeStartConfiguration', () => {
    it('return valid config', () => {
        let config = {
            createConsumerFunctions: [
                function () {}
            ],
            mongoEndpoint: 'mongodb://foo.bar/database',
            bscEndpoint: 'http://bar.foo',
        }
        let validConfig = standardizeStartConfiguration(config)

        assert.deepStrictEqual(validConfig, config)
    })

    it('config is undefined throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration(undefined)
            },
            {
                name: 'ChainBackendError',
                message: 'undefined configuration'
            }
        )
    })

    it('config.createConsumerFunctions is not an array throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    createConsumerFunctions: 135,
                    mongoEndpoint: 'mongodb://foo.bar/database',
                    bscEndpoint: 'http://bar.foo',
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "createConsumerFunctions"'
            }
        )
    })

    it('config.mongoEndpoint is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    createConsumerFunctions: [
                        function () {}
                    ],
                    mongoEndpoint: 'http://foo.bar/database',
                    bscEndpoint: 'http://bar.foo',
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "mongoEndpoint"'
            }
        )
    })
    
    it('config.bscEndpoint is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    createConsumerFunctions: [
                        function () {}
                    ],
                    mongoEndpoint: 'mongodb://foo.bar/database',
                    bscEndpoint: 'fpt://bar.foo',
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "bscEndpoint"'
            }
        )
    })
})
