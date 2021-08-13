'use strict'

class ChainBackendError extends Error {
    constructor(message, source=undefined) {
        super(message)
        this.name = 'ChainBackendError'
        this.source = source
    }
}

module.exports = {
    ChainBackendError
}
