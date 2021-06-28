require('dotenv').config()
const { TOKENS } = require('../helpers/constants').bsc
const swapx = require('../services/swapx')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        swapx.findPath({
            inputToken: TOKENS.USDT,
            outputToken: TOKENS.CAKE,
            amountIn: '100'+'0'.repeat(18),
            trader: '0xC06F7cF8C9e8a8D39b0dF5A105d66127912Bc980',
            noms: process.env.NOMS ? process.env.NOMS.split(',').map(n => parseInt(n)) : [0, 1, 2],
        })
            .then(() => process.exit(0))
            .catch(err => {
                console.error("Execution error:", err.message);
                process.exit(1);
            });
    })
    .catch(err => {
        console.error("App starting error:", err.message);
        process.exit(1);
    });
