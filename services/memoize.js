const stringify = require('json-stable-stringify');
const MemoizeModel = require("../models/MemoizeModel");
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const memoize = (fn, fnName) => {
    return async (...args) => {
        const key = `${fnName}/${stringify(args)}`;
        const cachedValue = await MemoizeModel.findOne({ key }).lean().then(m => m && m.value);
        if (cachedValue) {
            return cachedValue;
        }
        const value = await fn(...args);
        await MemoizeModel.create({
            key,
            value,
        });
        return value;
    }
}

exports.memoize = memoize;