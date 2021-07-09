const { ethers } = require('ethers');
const apiResponse = require("../helpers/apiResponse");
const Bluebird = require('bluebird')
const { ZERO_ADDRESS } = require("../helpers/constants").hexes
const LogsStateModel = require('../models/LogsStateModel')
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const sfarmService = require('../services/sfarm')

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/SFarm.json').abi;
const routerABI = require('../ABIs/UniswapV2Router01.json').abi;
const factoryABI = require('../ABIs/UniswapV2Factory.json').abi;
const pairABI = require('../ABIs/UniswapV2Pair.json').abi;
const _ = require('lodash');
const contractAddress = process.env.FARM
const SFarm = new ethers.Contract(process.env.FARM, contractABI, provider)

const SWAP_FUNC_SIGNS = [
	'38ed1739',	// swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
]

const ADD_LIQUIDITY_SIGNS = [
	'e8e33700',	// addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)
]

const REMOVE_LIQUIDITY_SIGNS = [
	'baa2abde', // removeLiquidity
]

const DEPOSIT_SIGNS = [
	'e2bbb158', // deposit(uint256,uint256)
	'441a3e70', // withdraw(uint256,uint256)
]

const APPROVE_SIGNS = [
	'095ea7b3',	// approve(address,uint256)
]

exports.state = [
	async function (req, res) {
		try {
			const { key } = req.params
			const keys = key.split(',').map(k => 'sfarm-'+k)

			console.error({keys})

			const states = await Bluebird.all([
				LogsStateModel.find({ key: { $in: keys } }).lean(),
			]).then(_.flatten)

			const ret = states
				.filter(s => !!s)
				.reduce((res, s, i) => ({...res, [s.key]: s.value}), {})

			return apiResponse.successResponseWithData(res, "Operation success", ret);
		} catch (err) {
			console.error(err)
			return apiResponse.ErrorResponse(res, err.toString());
		}
	}
]

exports.queryConfig = [
	async function (req, res) {
		try {
			const ret = await SFarm.queryConfig()

			return apiResponse.successResponseWithData(res, "Operation success", {
				stakeTokensCount: ret.stakeTokensCount_.toString(),
				delay: ret.delay_.toString(),
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
 * Params for farmerExec
 * 
 * @returns {Object}
 */
 exports.farmerExec = [
	async function (req, res) {
		try {
			const txParams = JSON.parse(decodeURIComponent(req.params.tx))
			const { data, to } = txParams
			const funcSign = data.substr(2, 8)
			console.error({funcSign, txParams})
			const resData = {}
			if (SWAP_FUNC_SIGNS.includes(funcSign)) {
				resData.receivingToken = '0x' + data.substr(data.length-40)
			} else if (ADD_LIQUIDITY_SIGNS.includes(funcSign)) {
				// pair = IRouter(txParams.to).factory().getPair(tokenA, tokenB)
				const tokenA = '0x'+data.substr(10+24, 40)
				const tokenB = '0x'+data.substr(10+24+40+24, 40)
				const router = new ethers.Contract(to, routerABI, provider)
				const factoryAddress = await router.factory()	// cache router => factory
				const factory = new ethers.Contract(factoryAddress, factoryABI, provider)
				const pairAddress = await factory.getPair(tokenA, tokenB)	// cache (factory,tokenA,tokenB) => pair
				resData.receivingToken = pairAddress
			} else if (REMOVE_LIQUIDITY_SIGNS.includes(funcSign)) {
				const token0 = '0x'+data.substr(10+24, 40)
				resData.receivingToken = token0
			} else if (DEPOSIT_SIGNS.includes(funcSign)) {
				resData.receivingToken = ZERO_ADDRESS
				// TODO check to is ROUTER_OWNERSHIP_PRESERVED
			} else if (APPROVE_SIGNS.includes(funcSign)) {
				const token = ethers.utils.getAddress(to)
				const spender = ethers.utils.getAddress('0x'+data.substr(10+24, 40))
				resData.message = `Contract (${spender}) need to be approved to spend token (${token}) by SFarm admins.`
			} else {
				console.error(funcSign, txParams)
				return apiResponse.ErrorResponse(res, 'UNIMPLEMENTED');
			}
			return apiResponse.successResponseWithData(res, "Operation success", resData);
		} catch (err) {
			//throw error in json response with status 500. 
			console.error(err)
			return apiResponse.ErrorResponse(res, err.toString());
		}
	}
];

const FARM_SERVICES = {
	'0x73feaa1eE314F8c655E354234017bE2193C9E24E': 'pancakeStakingFarm',
}

/**
 * withdraw params
 * 
 * @returns {Object}
 */
 exports.withdraw = [
	async function (req, res) {
		try {
			const { token, amount, from } = req.params
			const verify = req.query.verify
			const rls = await sfarmService.withdrawChainCmds(token, amount, from, verify)
			return apiResponse.successResponseWithData(res, "Operation success", rls);
		} catch (err) {
			//throw error in json response with status 500. 
			console.error(err)
			return apiResponse.ErrorResponse(res, err.toString());
		}
	}
];
