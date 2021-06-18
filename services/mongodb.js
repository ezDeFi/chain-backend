'use strict'

const {MongoClient} = require('mongodb')

class Mongodb {
    constructor(get) {
        this._endpoint = get('config').mongodb_endpoint
    }

    async open() {
        let dbname = Mongodb._databaseName(this._endpoint)

        this._client = await MongoClient.connect(this._endpoint, {
            useUnifiedTopology: true
        })

        try {
            this._db = this._client.db(dbname)
            await this._createIndexes()
        }
        catch (err) {
            await this._client.close()
            this._client = undefined
            throw err
        }
    }

    async close() {
        await this._db.close()
        await this._client.close()
    }

    // mongodb.Collection
    get configCollection() {
        return this._db.collection('configs')
    }

    // mongodb.Collection
    get logStateCollection() {
        return this._db.collection('logsstates')
    }

    static _databaseName(endpoint) {
        let url = new URL(endpoint)
        let dbname = url.pathname.substring(1)

        if (dbname.length === 0) {
            throw Error('Missing database name from Mongodb endpoint')
        }

        return dbname
    }

    async _createIndexes() {
        await this._createConfigIndexes()
        await this._createLogStateIndexes()
    }

    async _createConfigIndexes() {
        await this.configCollection.createIndex(
            {key: 1},
            {unique: true}
        )
    }

    async _createLogStateIndexes() {
        await this.logStateCollection.createIndex(
            {key: 1},
            {unique: true}
        )
    }
}

module.exports = Mongodb
