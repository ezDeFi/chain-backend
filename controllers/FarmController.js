const { ethers } = require('ethers');
const apiResponse = require("../helpers/apiResponse");
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const sfarmAbi = require('../ABIs/SFarm.json').abi;
const timelockAbi = require('../ABIs/Timelock.json').abi;
const { getAdminsLogs, getFarmerLogs, getTokenLogs, getRouterLogs } = require('../services/get-logs');
const contractAddress = process.env.FARM
const SFarm = new ethers.Contract(process.env.FARM, sfarmAbi, provider)

const SWAP_FUNC_SIGNS = [
	'38ed1739',	// swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
]

exports.queryConfig = [
	async function (req, res) {
		try {
			const { node } = req.params

			const ret = await SFarm.queryConfig()
			
			const fromBlock = parseInt(process.env.FARM_GENESIS)
			const toBlock = await provider.getBlockNumber()
			
			const [admins, farmers, tokens, routers] = await Promise.all(
				[
			// TODO: the first original admin is missing here
					getAdminsLogs({fromBlock, toBlock}),
					getFarmerLogs({fromBlock, toBlock}),
					getTokenLogs({fromBlock, toBlock}),
					getRouterLogs({fromBlock, toBlock})
				],
			);
			
			
			return apiResponse.successResponseWithData(res, "Operation success", {
				stakeTokensCount: ret.stakeTokensCount_.toString(),
				admins,
				farmers,
				tokens,
				routers,
				delay: ret.delay_.toString(),
				baseToken: ret.baseToken_,
				earnToken: ret.earnToken_,
				subsidyRate: ret.subsidyRate_.toString(),
				subsidyRecipient: ret.subsidyRecipient_.toString(),
				sfarmAbi,
				timelockAbi,
				contractAddress,
			});
		} catch (err) {
			console.error(err)
			return apiResponse.ErrorResponse(res, err);
		}
	}
]

/**
 * Query
 * 
 * @returns {Object}
 */
exports.query = [
	async function (req, res) {
		try {
			const { address } = req.params
			const { stake, value } = await SFarm.query(address)
			return apiResponse.successResponseWithData(res, "Operation success", {
				stake: stake.toString(),
				value: value.toString(),
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Params for farmerExec
 * 
 * @returns {Object}
 */
 exports.farmerExec = [
	async function (req, res) {
		try {
			const txParams = JSON.parse(decodeURIComponent(req.params.tx))
			const { data } = txParams
			const funcSign = data.substr(2, 8)
			const resData = {}
			if (SWAP_FUNC_SIGNS.includes(funcSign)) {
				resData.receivingToken = '0x' + data.substr(data.length-40)
			}
			return apiResponse.successResponseWithData(res, "Operation success", resData);
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * withdraw params
 * 
 * @returns {Object}
 */
 exports.withdraw = [
	async function (req, res) {
		try {
			const { address, token, amount } = req.params
			return apiResponse.successResponseWithData(res, "Operation success", []);
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];
