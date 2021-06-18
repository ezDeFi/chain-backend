'use strict'

const { TARGET_LOGS_PER_CHUNK } = require('../helpers/constants').getlogs

class EthersLogProvider {
    constructor(get) {
        this._chunkSize = get('chunkSize')
        this._ethersProvider = get('ethersProvider').native
    }

    async open() {}

    async close() {}

    async get({ address, fromBlock, toBlock, topics }, type='head') {
        try {
            console.log('hereeeeee<<<<<<<<');
            const logs = await this._ethersProvider.getLogs({
                address,
                topics,
                fromBlock,
                toBlock,
            })

            if (!Array.isArray(logs)) {
                throw new Error(JSON.stringify(logs));
            }

            if (logs.length < TARGET_LOGS_PER_CHUNK) {
                if (toBlock - fromBlock >= this._chunkSize.get(type) - 1) {
                    this._chunkSize.up(type)
                }
            }

            return logs
        } catch(err) {
            if (err.code == 'TIMEOUT') {
                this._chunkSize.down(type)
            }

            throw err
        }
    }
}

module.exports = EthersLogProvider
