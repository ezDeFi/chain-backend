var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var StateCacheSchema = new Schema({
    fromBlock: Number,
    toBlock: Number,
    type: String,
    logs: Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model("StateCache", StateCacheSchema);