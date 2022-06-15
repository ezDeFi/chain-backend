'use strict'

const {Schema} = require("mongoose")

let ConfigSchema = new Schema(
    {
        key: {
            index: true,
            type: String,
            required: true,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
        },
    }, 
    { 
        timestamps: true 
    }
)
let LogsStateSchema = new Schema(
    {
        key:    { type: String,                 required: true },
        value:  { type: Schema.Types.Mixed,     required: true },
        range:  { type: Schema.Types.Mixed,     required: false },
    }, 
    { 
        timestamps: true 
    }
)
let MemoizeSchema = new Schema(
    {
        key: {
            index: true,
            type: String,
            required: true,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
        },
    }, 
    { 
        timestamps: true 
    }
)

function applySchemaList(mongoose, prefix = "") {
    mongoose.model(prefix + "Config", ConfigSchema),
    mongoose.model(prefix + "LogsState", LogsStateSchema),
    mongoose.model(prefix + "Memoize", MemoizeSchema)
}

module.exports = {
    applySchemaList
}
