'use strict'

const Bluebird = require('bluebird')
const _ = require('lodash')

class HeadProcessor {
    constructor(get) {
        this._configCollection = get('mongodb').configCollection
        this._chunkSize = get('chunkSize')
        this._logProvider = get('logProvider')
        this._consumerLoader = get('consumerLoader')
    }

    async open() {}

    async close() {}

    // Output {todo: ?}
    async process(head) {
        // todo: lead to incorrect result because of round to 32bits
        const maxRange = (this._chunkSize.head>>1) + 1

        let lastHead = await this._getLastHead()

        if (!lastHead) {    // init the first sync
            lastHead = head - maxRange
            await this._configCollection.updateOne(
                { key: 'lastHead' },
                { value: lastHead },
                { upsert: true },
            )
        }

        if (head <= lastHead) {
            return  // nothing to do
        }

        const requests = await Bluebird
            .map(this._consumerLoader.list, consumer => {
                return consumer.getRequests({maxRange, lastHead})
            })
            .then(_.flatten)
            .filter(r => r.from > lastHead)

        if (!requests.length) {
            return true
        }

        console.log('processHead', { head, lastHead, requests })

        const fromBlock = lastHead + 1

        if (fromBlock + maxRange <= head) {
            var toBlock = fromBlock + maxRange - 1
            var hasMoreBlock = true
        }

        const address = requests.filter(r => !!r.address).map(r => r.address)
        const topics = mergeTopics(requests.map(r => r.topics))
        const logs = await this._logProvider.get({ address, topics, fromBlock, toBlock })

        if (!logs) {
            return false // failed
        }

        if (!toBlock) {
            toBlock = Math.max(head, ...logs.map(l => l.blockNumber))
        }

        await Bluebird.map(requests, request => {
            return request.processLogs({ request, logs, fromBlock, toBlock, lastHead, head })
        })
        await this._configCollection.updateOne(
            { key: 'lastHead' },
            { value: toBlock },
            { upsert: true },
        )

        return !!hasMoreBlock
    }

    async _getLastHead() {
        let doc = await this._configCollection.findOne({
            key: 'lastHead'
        })

        return !doc ? undefined : doc.value
    }
}

module.exports = HeadProcessor
