var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var PairSchema = new Schema({
    address: {
        index: true,
        type: String,
        required: true,
    },
    factory:    { type: String, required: false },
    token0:     { type: String, required: false },
    token1:     { type: String, required: false },
    reserve0:   { type: String, required: false },
    reserve1:   { type: String, required: false },
    rate01:     { type: Number, required: false },
    rate10:     { type: Number, required: false },
    direction:  { type: Boolean, required: false },
    rank: {
        index: true,
        type: Number,
        require: false,
    },
}, { timestamps: true });

module.exports = mongoose.model("Pair", PairSchema);