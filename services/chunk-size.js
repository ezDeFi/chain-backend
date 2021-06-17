'use strict'

const _ = require('lodash')
const {
    CONCURRENCY,
    CHUNK_SIZE_HARD_CAP
} = require('../helpers/constants').getlogs

class ChunkSize {
    constructor(_get) {
        this._chunkSize = {
            head: CHUNK_SIZE_HARD_CAP,
            forward: CHUNK_SIZE_HARD_CAP,
            backward: CHUNK_SIZE_HARD_CAP,
        }
    }

    async open() {}

    async close() {}

    get head() {
        return this._chunkSize.head
    }

    get forward() {
        return this._chunkSize.forward
    }

    get backward() {
        return this._chunkSize.backward
    }

    get(type) {
        return this._chunkSize[type]
    }

    split(from, to, count) {
        const size = Math.round((to - from) / count)
        const blocks = _.range(count).map(i => {
            const blockFrom = from + (size * i)
            const blockTo = blockFrom + size - 1
            return {
                from: blockFrom,
                to: blockTo,
            }
        });
        return blocks;
    }

    up(type) {
        const concurrency = (!type || type == 'head') ? 1 : CONCURRENCY
        const oldSize = this._chunkSize[type]
        let newSize = Math.floor(oldSize * Math.pow(5/3, 1/concurrency))
        if (newSize <= oldSize) {
            newSize = oldSize + 1
        }
        newSize = Math.min(CHUNK_SIZE_HARD_CAP, newSize)
        if (newSize > oldSize) {
            this._chunkSize[type] = newSize
            console.log(`getLogs: CHUNK_SIZE (${type}) increased to ${newSize}`)
        }
    }

    down(type) {
        const concurrency = (!type || type == 'head') ? 1 : CONCURRENCY
        const oldSize = this._chunkSize[type]
        let newSize = Math.floor(oldSize * Math.pow(1/2, 1/concurrency))
        newSize = Math.max(1, newSize)
        if (newSize < oldSize) {
            this._chunkSize[type] = newSize
            console.log(`getLogs: CHUNK_SIZE (${type}) decreased to ${this._chunkSize[type]}`)
        }
    }
}

module.exports = ChunkSize
