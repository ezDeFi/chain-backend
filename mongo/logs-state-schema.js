const {Schema} = require("mongoose")

module.exports = new Schema(
    {
        key:    { type: String,                 required: true },
        value:  { type: Schema.Types.Mixed,     required: true },
        range:  { type: Schema.Types.Mixed,     required: false },
    }, 
    { 
        timestamps: true 
    }
)
