require('dotenv').config()
const Bluebird = require('bluebird')
const { TOKENS } = require('../helpers/constants').bsc
const swapx = require('../services/swapx')
const { ethers } = require('ethers')
const bn = ethers.BigNumber.from
const bscUtil = require('bsc_util')

var MONGODB_URL = process.env.MONGODB_URL;
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		//don't show the log when it is test
		if(process.env.NODE_ENV !== "test") {
			console.log("Connected to %s", MONGODB_URL);
			console.log("App is running ... \n");
			console.log("Press CTRL + C to stop the process. \n");
		}
		testSwapRate()
			.then(() => {
				process.exit(0)
			})
			.catch(err => {
				console.error("App starting error:", err.message);
				process.exit(1);
			});
	})
	.catch(err => {
		console.error("App starting error:", err.message);
		process.exit(1);
	});

const swap = 'pancake2'
const tokenIn = TOKENS.WBNB
const tokenOut = TOKENS.BUSD

async function testSwapRate() {
	const context = swapx.createSwapContext({})

	const [ri, ro] = await context.getPairReserves(swap, tokenIn, tokenOut)
	console.error({ri, ro})

	const res = await context.swapRate(swap, tokenIn, swap, tokenOut)
	console.error({res})
	const [inF, outF] = res
	console.error({inF, outF})

	const PRECISION = 1000000
	console.error(
		bn(PRECISION).mul(outF).div(inF).toNumber() / PRECISION,
		bn(PRECISION).mul(ro).div(ri).toNumber() / PRECISION,
	)
	const forward = outF.mul(ri).mul(PRECISION).div(inF).div(ro).toNumber() / PRECISION
	// const backward = outB.mul(reserve1).mul(bn(PRECISION)).div(inB).div(reserve0).toNumber() / PRECISION
	console.error({forward})
}
