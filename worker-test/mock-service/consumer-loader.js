'use strict'

const path = require('path')

class ConsumerLoader {
    constructor(get) {
        this._mongodb = get('mongodb')
    }

    async open() {}

    async close() {}

    // Output {Array<Object>}
    //  * [].key
    //  * [].getRequests {Function}
    //  * [].processLogs {Function}
    get list() {
        return this._consumers
    }

    // Input
    //  * states {Array<Object | String>}: List of object that meets interface
    //    of state.  If item is a string then load object from relative file
    //    from root directory.
    mock(states) {
        if (!Array.isArray(states)) {
            throw Error('Invalid states')
        }

        this._consumers = states.map(state => {
            return typeof state === 'string'
                ? this._loadStateFile(state)
                : state
        })
    }

    _loadStateFile(relativePath) {
        // todo: is it base name?
        let key = path.basename(relativePath, path.extname(relativePath))
        let filePath = path.join(__dirname, '..', '..', relativePath)

        return require(filePath)(key, this._mongodb)
    }
}

module.exports = ConsumerLoader
