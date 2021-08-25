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
            processorConfigs: {
                merge: {
                    getLogs: function() {},
                    getConcurrency: function() {},
                    getSize: function() {}
                },
                partition: {
                    getLogs: function() {},
                    getConcurrency: function() {},
                    getSize: function() {}
                },
            },
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
                    processorConfigs: {
                        merge: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                        partition: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                    },
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
                    processorConfigs: {
                        merge: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                        partition: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                    },
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
                    processorConfigs: {
                        merge: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                        partition: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                    },
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
                    processorConfigs: {
                        merge: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                        partition: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                    },
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "ethersProvider"'
            }
        )
    })

    it('config.processorConfigs.merge is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        function() {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    processorConfigs: {
                        merge: {},
                        partition: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                    },
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "processorConfigs"'
            }
        )
    })

    it('config.processorConfigs.partition is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumerConstructors: [
                        function() {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    processorConfigs: {
                        merge: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                        partition: {},
                    },
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "processorConfigs"'
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
                    processorConfigs: {
                        merge: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
                        partition: {
                            getLogs: function() {},
                            getConcurrency: function() {},
                            getSize: function() {}
                        },
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
