const swapx = require('../services/swapx')
const apiResponse = require("../helpers/apiResponse");

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
