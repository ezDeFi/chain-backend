'use strict'

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
    get configCollection() {
        return this._db.collection('configs')
    }
}

module.exports = Mongodb
