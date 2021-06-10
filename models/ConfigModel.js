var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var ConfigSchema = new Schema({
    key: {
        index: true,
        type: String,
        required: true,
    },
    value: {
        type: Schema.Types.Mixed,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Config", ConfigSchema);