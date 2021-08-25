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

function applySchemaList(mongoose) {
    mongoose.model("Config", ConfigSchema),
    mongoose.model("LogsState", LogsStateSchema),
    mongoose.model("Memoize", MemoizeSchema)
}

module.exports = {
    applySchemaList
}
