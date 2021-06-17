'use strict'

const path = require('path')
const mongodb = require('mongo-mock')

class Mongodb {
    constructor(get) {
        this._mongodb_endpoint = get('config').mongodb_endpoint
    }

    async open() {
        mongodb.max_delay = 0
        this._client = await mongodb.MongoClient.connect(
            this._mongodb_endpoint
        )
        this._db = this._client.db()
    }

    async close() {
        await this._db.close()
        await this._client.close()
    }

    // mongodb.Collection
    get stateCollection() {
        return this._db.collection('state')
    }
}

class StateProvider {
    constructor() {}

    async open() {}

    async close() {}

    // Output {Array<Object>}
    //  * [].key
    //  * [].getRequests {Function}
    //  * [].processLogs {Function}
    get() {
        return this._states
    }

    // Input
    //  * states {Array<Object | String>}: List of object that meets interface
    //    of state.  If item is a string then load object from relative file
    //    from `worker_test/state`.
    mock(states) {
        if (!Array.isArray(states)) {
            throw Error('Invalid states')
        }

        this._states = states.map(state => {
            return typeof state === 'string'
                ? this._loadStateFile(state)
                : state
        })
    }

    _loadStateFile(relativePath) {
        return require(
            path.join(__dirname, 'state', relativePath)
        )
    }
}

class EthersProvider {
    constructor(get) {
        this._provider = {
            getLogs: this._getLogs.bind(this)
        }
    }

    async open() {}

    async close() {}

    // {ethers.provider.JsonRpcProvider}
    get provider() {
        return this._provider
    }

    // Input
    //  * logs {Array<Object>} List of ETH logs, `provider.getLogs()` return
    //    that value.
    //  * logs {String} Relative path to log data file from `worker_test/log`.
    //    `provider.getLogs()` return that value.
    mockGetLogs(logs) {
        if (Array.isArray(logs)) {
            this._logs = logs
        }
        else if (typeof logs === 'string') {
            this._logs = require(
                path.join(__dirname, 'log', logs)
            )
        }
        else {
            throw Error('Invalid logs')
        }
    }

    _getLogs({ address, fromBlock, toBlock, topics = undefined }) {
        return this._logs
    }
}

class HeadBlockProcessor {
    constructor(get) {
        this._stateProvider = get('stateProvider')
        this._ethersProvider = get('ethersProvider').provider
        this._stateCollection = get('mongodb').stateCollection
    }

    async open() {}

    async close() {}

    // Input
    //  * head {Number}
    //
    // Output {Array<Object>}: List of ETH logs.
    async process(head) {
        await this._stateCollection.updateOne(
            {},
            { head },
            { upsert: true }
        )

        return this._ethersProvider.getLogs({})
    }
}

class PastBlockProcessor {
    constructor(states, ethersProvider, mongodb) {
        this._states = states
        this._ethersProvider = ethersProvider
        this._mongodb = mongodb
    }

    async process() {}
}

class Worker {
    constructor(headProcessor, pastProcessor) {
        this._headProcessor = headProcessor
        this._pastProcessor = pastProcessor
    }

    // Description
    //  * Run forever to process past and head blocks.
    start() {}
}

module.exports = {
    Worker,
    Mongodb,
    StateProvider,
    EthersProvider,
    HeadBlockProcessor,
    PastBlockProcessor,
}
