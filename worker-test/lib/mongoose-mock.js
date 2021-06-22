'use strict'

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

mongoose.set('useNewUrlParser', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useCreateIndex', true)
mongoose.set('useUnifiedTopology', true)

let mongod = new MongoMemoryServer()

// Description
//  * Connect to database then empty data.
async function open() {
    let url = await mongod.getUri()

    await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    await _clear()
}

async function close() {
    await mongoose.connection.close()
    await mongod.stop()
}

async function _clear() {
    for (let key in mongoose.connection.collections) {
        await mongoose.connection.collections[key].deleteMany()
    }
}

module.exports = {
    open,
    close,
}
