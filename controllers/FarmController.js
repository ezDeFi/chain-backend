const { ethers } = require('ethers');

const apiResponse = require("../helpers/apiResponse");
var mongoose = require("mongoose");
const { stripZeros } = require('@ethersproject/bytes');
mongoose.set("useFindAndModify", false);

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT)
const SFarm = new ethers.Contract(process.env.SFARM_ADDRESS, require('../ABIs/SFarm.json').abi, provider)

exports.queryGlobal = [
	async function (req, res) {
		try {
			const ret = await SFarm.queryGlobal()
			
			const fromBlock = 0
			const tokenLogs = await provider.getLogs({
				...SFarm.filters.AuthorizeToken(null, null),
				fromBlock,
			})
			
			// TODO: dedup tokenLogs by address
			const stakedTokens = tokenLogs.filter(l => l.data == '0x'+'2'.padStart(64,'0')).map(l => '0x'+l.topics[1].substr(26))
			const receivingTokens = tokenLogs.filter(l => l.data == '0x'+'1'.padStart(64,'0')).map(l => '0x'+l.topics[1].substr(26))

			return apiResponse.successResponseWithData(res, "Operation success", {
				stakeTokensCount: ret.noStakeTokens.toString(),
				totalStake: ret.totalStake.toString(),
				totalValue: ret.totalValue.toString(),
				stakedTokens,
				receivingTokens,
			});
		} catch (err) {
			console.error(err)
			return apiResponse.ErrorResponse(res, err);
		}
	}
]

exports.contract = [
	async function (req, res) {
		try {
			// const { node } = req.params
			// if (node != "127.0.0.1:8545") {
			// 	return apiResponse.successResponseWithData(res, "Operation success", "");
			// }
			return apiResponse.successResponseWithData(res, "Operation success", process.env.SFARM_ADDRESS);
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

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
