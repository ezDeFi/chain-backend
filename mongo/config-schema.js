const {Schema} = require("mongoose")

module.export = new Schema(
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
