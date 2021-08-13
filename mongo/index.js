'use strict'

const {Mongoose} = require('mongoose')
const ConfigSchema = require('./config-schema')
const LogsStateSchema = require('./logs-state-schema')
const MemoizeSchema = require('./memoize-schema')

async function open(endpoint) {
    let mongoose = new Mongoose()

    await mongoose.connect(endpoint, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true
    })

    return {
        ConfigModel: mongoose.model("Config", ConfigSchema),
        LogsStateModel: mongoose.model("LogsState", LogsStateSchema),
        ConfigModel: mongoose.model("Memoize", MemoizeSchema)
    }
}

module.exports = {
    open
}
