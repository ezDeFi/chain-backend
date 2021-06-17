const _ = require('lodash');
const apiResponse = require("../helpers/apiResponse");
const LogsStateModel = require('../models/LogsStateModel')
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

exports.query = [
	async function (req, res) {
		try {
			const { key } = req.params
			const keys = key.split(',')
			const states = await LogsStateModel.find({ key: { $in: keys } }).lean()
			const ret = states
				.filter(s => !!s)
				.reduce((res, s, i) => ({...res, [s.key]: s.value}), {})

			return apiResponse.successResponseWithData(res, "Operation success", ret);
		} catch (err) {
			console.error(err)
			return apiResponse.ErrorResponse(res, err);
		}
	}
]
