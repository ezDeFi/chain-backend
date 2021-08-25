'use strict'

const assert = require('assert')
const {JsonRpcProvider} = require('@ethersproject/providers')
const {Mongoose} = require('mongoose')
const {standardizeStartConfiguration} = require('../lib/validator')

describe('validator.standardizeStartConfiguration', () => {
    it('return valid config', () => {
        let config = {
            consumerConstructors: [
                function() {}
            ],
            mongoose: new Mongoose('http://foo.bar/database'),
            ethersProvider: new JsonRpcProvider(),
            headProcessorConfig: {
                getLogs: function() {},
                getConcurrency: function() {},
                getSize: function() {}
            },
            pastProcessorConfig: {
                getLogs: function() {},
                getConcurrency: function() {},
                getSize: function() {}
            }
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

    it('config.consumerConstructors is not an array throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: undefined,
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    }
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "consumerConstructors"'
            }
        )
    })

    it('config.consumerConstructors[0] is not a function throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    }
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "consumerConstructors[0]"'
            }
        )
    })

    it('config.mongoose is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        function() {}
                    ],
                    mongoose: undefined,
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    }
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "mongoose"'
            }
        )
    })
    
    it('config.ethersProvider is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        function() {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: undefined,
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    }
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "ethersProvider"'
            }
        )
    })

    it('config.headProcessorConfig is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        function() {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {},
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    }
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "headProcessorConfig"'
            }
        )
    })

    it('config.pastProcessorConfig is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        function() {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {}
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "pastProcessorConfig"'
            }
        )
    })

    it('config has additional properties throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        function() {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurrency: function() {},
                        getSize: function() {}
                    },
                    additionalProperty: {}
                })
            },
            {
                name: 'ChainBackendError',
                message: 'configuration has additional properties'
            }
        )
    })
})
