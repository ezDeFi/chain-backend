const _ = require('lodash');
const apiResponse = require("../helpers/apiResponse");
const LogsStateModel = require('../models/LogsStateModel')
const { JsonRpcProvider } = require('@ethersproject/providers')
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const { ethers } = require('ethers')
const contractABI = require('../ABIs/SwapXView.abi.json');
const VUE_APP_SWAPX_VIEW_ADDRESS = '0x99Ab3d8DC4F2130F4E542506A0E9e87bA9ed7d7b'

const provider = new JsonRpcProvider({
	timeout: 3000,
	url: process.env.RPC,
})
const swapXViewContract = new ethers.Contract(VUE_APP_SWAPX_VIEW_ADDRESS, contractABI, provider)

exports.query = [
	async function (req, res) {
		try {
			const { key } = req.params

			const tokens = [
                '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',	// CAKE
                // '0x55d398326f99059fF775485246999027B3197955',	// USDT
                // '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',	// BUSD
				'0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',	// WBNB
			]
			const amount = BigInt('123'.padEnd(18+3,'0'))
			const parts = Array(tokens.length-1).fill(2)
			const flags = Array(tokens.length-1).fill(0x40000)
			const gasPrices = Array(tokens.length-1).fill(0)

			const { returnAmounts, estimateGasAmount, distribution } = await swapXViewContract.callStatic.getExpectedReturnWithGasMulti(
				tokens, amount, parts, flags, gasPrices
			)
			const estimatedGas = await swapXViewContract.estimateGas.getExpectedReturnWithGasMulti(
				tokens, amount, parts, flags, gasPrices
			)

			return apiResponse.successResponseWithData(res, "Operation success", { returnAmounts, estimateGasAmount, distribution, estimatedGas });
		} catch (err) {
			console.error(err)
			return apiResponse.ErrorResponse(res, err);
		}
	}
]
