const _ = require('lodash');
const swapx = require('../services/swapx')
const apiResponse = require("../helpers/apiResponse");
const Bluebird = require('bluebird')
const PairModel = require('../models/PairModel')
const { STALE_MILIS } = require('../helpers/constants').time

exports.find = [
	async function (req, res) {
		try {
			const { inputToken, outputToken, amountIn } = req.params
			const { trader, gasPrice, gasToken } = req.query
			const noms = req.query.noms.split(',').map(nom => parseInt(nom))

			const context = swapx.createSwapContext({ gasPrice, gasToken })
			const routes = await context.findPath({ inputToken, outputToken, amountIn, trader, noms })

			return apiResponse.successResponseWithData(res, "Operation success", routes);
		} catch (err) {
			console.error(err)
			return apiResponse.ErrorResponse(res, err);
		}
	}
]

function percent(r) {
	return (r * 100).toFixed(2) + '%'
}

exports.pair = [
	async function (req, res) {
		try {
			const { key } = req.params
			if (!key) {
				var states = await PairModel.find({
					updatedAt: { $gte: new Date(new Date().getTime()-STALE_MILIS).toISOString() },
					rank: { $exists: true, $ne: null },
				}).sort({rank:-1}).limit(6).lean()
			} else {
				const keys = key.split(',')
				if (!key.length) {
					return apiResponse.successResponseWithData(res, "Operation success", {});
				}
				var states = await PairModel.find({
					updatedAt: { $gte: new Date(new Date().getTime()-STALE_MILIS).toISOString() },
					address: { $in: keys },
				}).lean()
			}

			if (!states) {
				return apiResponse.successResponseWithData(res, "Operation success", {});
			}

			states = states
				.reduce((states, s, i) => ({...states, [s.address]: {
					rank: percent(s.rank),
					direction: s.direction ? 'forward' : 'backward',
					rate01: percent(s.rate01),
					rate10: percent(s.rate10),
					factory: s.factory,
					token0: s.token0,
					token1: s.token1,
					r0: s.reserve0,
					r1: s.reserve1,
				}}), {})

			return apiResponse.successResponseWithData(res, "Operation success", states);
		} catch (err) {
			console.error(err)
			return apiResponse.ErrorResponse(res, err);
		}
	}
]
