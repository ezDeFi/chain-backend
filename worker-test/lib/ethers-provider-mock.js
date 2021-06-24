'use strict'

const path = require('path')
const EventEmitter = require('events')

class EthersProviderMock {
    constructor() {
        // {Array<Object>} Items must be sort incresement by attribute
        // `blockNumber`.
        this._logs = []
        this._eventEmitter = new EventEmitter()
    }

    async getLogs() {}

    getLogs({ address, fromBlock, toBlock, topics = undefined }) {
        if (fromBlock < 0 || toBlock < 0 || fromBlock > toBlock) {
            throw Error('Invalid block range')
        }

        return this._logs
            .filter(function byAddress(log) {
                return Array.isArray(address)
                    ? address.indexOf(log.address) >=0
                    : log.address === address
            })
            .filter(function byBlockNumber(log) {
                return (!fromBlock || log.blockNumber >= fromBlock)
                    && (!toBlock || log.blockNumber <= toBlock)
            })
    }

    // Output {Number} Block number from last log entry
    async getBlockNumber() {
        if (!Array.isArray(this._logs) || this._logs.length <= 0) {
            throw Error('Ethers log does not specific')
        }

        return this._logs[this._logs.length - 1].blockNumber
    }

    on(eventName, handler) {
        if (eventName !== 'block') {
            throw Error('Invalid event name to EthersProviderMock')
        }

        this._eventEmitter.addListener('block', handler)
    }

    removeAllListeners() {
        this._eventEmitter.removeAllListeners()
    }

    // Description
    //  * Set logs which is return by `getLogs()`.
    //  * Logs will be sorted by incresement `blockNumber`.
    //
    // Input
    //  * logs {Array<Object>} List of ETH logs.
    //  * logs {String} Relative path to data file from root directory.
    mockGetLogs(logs) {
        if (Array.isArray(logs)) {
            this._logs = this._sortLogs(logs)
        }
        else if (typeof logs === 'string') {
            let rawLogs = require(
                path.join(__dirname, '..', '..', logs)
            )

            this._logs = this._sortLogs(rawLogs)
        }
        else {
            throw Error('Invalid logs mocking')
        }
    }

    // Descriptions
    //  * Append logs to current logs.
    //  * Logs will be sorted b incresement `blockNumber`.
    //
    // Input
    //  * logs {Array<Object>} List of ETH logs.
    mockAppendLogs(logs) {
        if (!Array.isArray(logs) || logs.length === 0) {
            throw Error('Invalid logs to append')
        }

        let sortedLogs = this._sortLogs(logs)

        if (
            this._logs.length > 0 &&
            sortedLogs[0].blockNumber < this._logs[this._logs.length - 1].blockNumber
        ) {
            throw Error('Invalid logs to append')
        }

        this._logs = [...this._logs, ...sortedLogs]
    }

    // Input
    //  * blockNumber {Number}
    //  * logs {Array<Object>}
    //
    // Exception
    //  * Invalid block number fom log: Attribute `logs[].blockNumber` does
    //    not match with `blockNumber`.
    mockEmitNewBlockEvent(blockNumber, logs) {
        for (let log of logs) {
            if (log.blockNumber !== blockNumber) {
                throw Error('Invalid block number from logs')
            }
        }

        this._logs = [...this._logs, ...this._sortLogs(logs)]
        this._eventEmitter.emit('block', blockNumber)
    }

    _sortLogs(logs) {
        return logs.sort(function byBlockNumber(a, b) {
            return a.blockNumber <= b.blockNumber ? - 1: 1
        })
    }
}

module.exports = EthersProviderMock
