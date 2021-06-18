'use strict'

const path = require('path')
const fs = require('fs')

class ConsumerLoader {
    constructor(get) {
        this._mongodb = get('mongodb')
    }

    async open() {
        let self = this
        let dir = path.join(__dirname, '..', 'consumers')

        this._consumers = fs.readdirSync(dir)
            .filter(file => path.extname(file) === '.js')
            .map(file => {
                // todo: is it base name?
                let key = file.split('.').slice(0, -1).join('.')
                let filePath = path.join(dir, file)

                return require(filePath)(key, self._mongodb)
            })
    }

    async close() {}

    get list() {
        return this._consumers
    }
}

module.exports = ConsumerLoader
