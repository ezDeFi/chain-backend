var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var PairSchema = new Schema({
    address: {
        index: true,
        type: String,
        required: true,
    },
    rank: {
        index: true,
        type: Number,
        require: false,
    },
    direction:  { type: Boolean, required: false },
    liquidity:  { type: String, required: false },
    factory:    { type: String, required: false },
    token0:     { type: String, required: false },
    token1:     { type: String, required: false },
    reserve0:   { type: String, required: false },
    reserve1:   { type: String, required: false },
}, { timestamps: true });

module.exports = mongoose.model("Pair", PairSchema);