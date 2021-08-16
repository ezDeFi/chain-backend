'use strict'

const assert = require('assert')
const {JsonRpcProvider} = require('@ethersproject/providers')
const {Mongoose} = require('mongoose')
const {standardizeStartConfiguration} = require('../validator')

describe('validator.standardizeStartConfiguration', () => {
    it('return valid config', () => {
        let config = {
            consumers: [
                {
                    key: 'key_1',
                    getRequests: function() {}
                }
            ],
            mongoose: new Mongoose('http://foo.bar/database'),
            ethersProvider: new JsonRpcProvider(),
            headProcessorConfig: {
                getLogs: function() {},
                getConcurency: function() {},
                getSize: function() {}
            },
            pastProcessorConfig: {
                getLogs: function() {},
                getConcurency: function() {},
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

    it('config.consumers is not an array throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumers: undefined,
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
                        getSize: function() {}
                    }
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "consumers"'
            }
        )
    })

    it('config.consumers[0] is not a consumer throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumers: [
                        {}
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
                        getSize: function() {}
                    }
                })
            },
            {
                name: 'ChainBackendError',
                message: 'invalid configuration "consumers[0]"'
            }
        )
    })

    it('config.mongoose is invalid throws error', () => {
        assert.throws(
            () => {
                standardizeStartConfiguration({
                    consumers: [
                        {
                            key: 'key_1',
                            getRequests: function() {}
                        }
                    ],
                    mongoose: undefined,
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
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
                    consumers: [
                        {
                            key: 'key_1',
                            getRequests: function() {}
                        }
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: undefined,
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
                        getSize: function() {}
                    },
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
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
                    consumers: [
                        {
                            key: 'key_1',
                            getRequests: function() {}
                        }
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {},
                    pastProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
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
                    consumers: [
                        {
                            key: 'key_1',
                            getRequests: function() {}
                        }
                    ],
                    mongoose: new Mongoose('http://foo.bar/database'),
                    ethersProvider: new JsonRpcProvider(),
                    headProcessorConfig: {
                        getLogs: function() {},
                        getConcurency: function() {},
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
})
