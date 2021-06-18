'use strict'

const path = require('path')

class EthersProvider {
    constructor(_get) {
        this._provider = {
            getLogs: this._getLogs.bind(this)
        }
    }

    async open() {}

    async close() {}

    // {ethers.provider.JsonRpcProvider}
    get native() {
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
                path.join(__dirname, '..', 'log', logs)
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

module.exports = EthersProvider
