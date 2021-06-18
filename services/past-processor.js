'use strict'

const Bluebird = require('bluebird')
const _ = require('lodash')
const { CONCURRENCY } = require('../helpers/constants').getlogs
const {mergeTopics} = require('./util')

class PastProcessor {
    constructor(get) {
        this._configCollection = get('mongodb').configCollection
        this._chunkSize = get('chunkSize')
        this._consumerLoader = get('consumerLoader')
        this._ethersLogProvider = get('ethersLogProvider')
    }

    async open() {}

    async close() {}

    async process() {
        const type = 'forward'

        const lastHead = await this._getLastHead()

        if (!lastHead) {
            throw Error('Invalid last head')
        }

        const maxRange = this._chunkSize.get(type)*CONCURRENCY
        let requests = await Bluebird.map(this._consumerLoader.list, consumer => consumer.getRequests({maxRange, lastHead}))
            .then(_.flatten)
            .filter(r => r.from <= lastHead)

        if (!requests.length) {
            return 3000 // no more requests, wait for 3s
        }

        const fromBlock = Math.min(...requests.map(r => r.from))
        const toBlock = Math.min(fromBlock + maxRange, lastHead)

        requests = requests.filter(r => r.from <= toBlock && (!r.to || r.to >= fromBlock))

        console.log('processPast', { lastHead, fromBlock, toBlock, requests })

        const chunks = this._chunkSize.split(fromBlock, toBlock, CONCURRENCY);
        const logs = await Bluebird.map(chunks, ({ from: fromBlock, to: toBlock }, i) => {
            return this._getLogsInRange({ requests, fromBlock, toBlock }, type)
        }, { concurrency: CONCURRENCY }).then(_.flatten);

        if (!logs) {
            return 10000 // failed, wait for 10s
        }

        await Bluebird.map(requests, request => request.processLogs({ request, logs, fromBlock, toBlock, lastHead }))
    }

    async _getLastHead() {
        let doc = await this._configCollection.findOne({
            key: 'lastHead'
        })

        return !doc ? undefined : doc.value
    }

    async _getLogsInRange({requests, fromBlock, toBlock}, type) {
        const inRangeRequests = requests.filter(r => r.from <= toBlock && (!r.to || r.to >= fromBlock))
        if (inRangeRequests.length == 0) {
            // console.log(`no request in range ${fromBlock} +${toBlock-fromBlock}`)
            return []
        }
        const address = inRangeRequests.filter(r => !!r.address).map(r => r.address)
        const topics = mergeTopics(inRangeRequests.map(r => r.topics))

        return await this._ethersLogProvider.get({ address, fromBlock, toBlock, topics}, type)
    }

}

module.exports = PastProcessor
