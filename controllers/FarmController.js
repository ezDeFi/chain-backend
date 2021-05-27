const { ethers } = require('ethers');

const apiResponse = require("../helpers/apiResponse");
var mongoose = require("mongoose");
const { stripZeros } = require('@ethersproject/bytes');
mongoose.set("useFindAndModify", false);

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/SFarm.json').abi
const contractAddress = process.env.FARM
const SFarm = new ethers.Contract(process.env.FARM, contractABI, provider)

exports.queryConfig = [
	async function (req, res) {
		try {
			const { node } = req.params

			const ret = await SFarm.queryConfig()
			
			const fromBlock = parseInt(process.env.FARM_GENESIS)
			const toBlock = fromBlock + 5000
			const tokenLogs = await provider.getLogs({
				...SFarm.filters.AuthorizeToken(null, null),
				fromBlock,
				toBlock,
			})

			// TODO: dedup tokenLogs by address
			const stakeTokens = tokenLogs.filter(l => l.data == '0x'+'2'.padStart(64,'0')).map(l => '0x'+l.topics[1].substr(26))
			const receivingTokens = tokenLogs.filter(l => l.data == '0x'+'1'.padStart(64,'0')).map(l => '0x'+l.topics[1].substr(26))

			// TODO: the first original admin is missing here
			const adminLogs = await provider.getLogs({
				...SFarm.filters.AuthorizeAdmin(null, null),
				fromBlock,
				toBlock,
			})

			const admins = adminLogs.filter(l => l.data == '0x'+'1'.padStart(64,'0')).map(l => '0x'+l.topics[1].substr(26))

			// TODO: the first original farmer is missing here
			const farmerLogs = await provider.getLogs({
				...SFarm.filters.AuthorizeFarmer(null, null),
				fromBlock,
				toBlock,
			})
			
			const farmers = farmerLogs.filter(l => l.data == '0x' + '1'.padStart(64, '0')).map(l => '0x' + l.topics[1].substr(26))

			return apiResponse.successResponseWithData(res, "Operation success", {
				stakeTokensCount: ret.stakeTokensCount_.toString(),
				stakeTokens,
				receivingTokens,
				admins,
				farmers,
				baseToken: ret.baseToken_,
				earnToken: ret.earnToken_,
				subsidyRate: ret.subsidyRate_.toString(),
				subsidyRecipient: ret.subsidyRecipient_.toString(),
				contractABI,
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
