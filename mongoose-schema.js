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

module.exports = {
    ConfigSchema,
    LogsStateSchema,
    MemoizeSchema
}
