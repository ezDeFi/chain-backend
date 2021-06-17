'use strict'

const path = require('path')

class ConsumerLoader {
    constructor() {}

    async open() {}

    async close() {}

    // Output {Array<Object>}
    //  * [].key
    //  * [].getRequests {Function}
    //  * [].processLogs {Function}
    get list() {
        return this._states
    }

    // Input
    //  * states {Array<Object | String>}: List of object that meets interface
    //    of state.  If item is a string then load object from relative file
    //    from root directory.
    mock(states) {
        if (!Array.isArray(states)) {
            throw Error('Invalid states')
        }

        this._states = states.map(state => {
            return typeof state === 'string'
                ? this._loadStateFile(state)
                : state
        })
    }

    _loadStateFile(relativePath) {
        return require(
            path.join(__dirname, '..', '..', relativePath)
        )
    }
}

module.exports = ConsumerLoader
