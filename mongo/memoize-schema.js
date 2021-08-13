const {Schema} = require("mongoose")

module.exports = new Schema(
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
