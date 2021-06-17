'use strict'

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
            this._database = this._client.db(dbname)
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

    static _databaseName(endpoint) {
        let url = new URL(endpoint)
        let dbname = url.pathname.substring(1)

        if (dbname.length === 0) {
            throw Error('Missing database name from Mongodb endpoint')
        }

        return dbname
    }
}

module.exports = Mongodb
