var mongoose = require("mongoose");

var Schema = mongoose.Schema;

// TODO: rename to ChainState
var LogsStateSchema = new Schema({
    key: String,
    value: Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model("LogsState", LogsStateSchema);