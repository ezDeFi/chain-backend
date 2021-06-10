const _ = require('lodash')
const { ethers } = require('ethers')
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/SFarm.json').abi
const LogsStateModel = require('../models/LogsStateModel')
const SFarm = new ethers.Contract(process.env.FARM, contractABI, provider)

const processMaskLogs = ({ logs }) => {
    return _.pickBy(logs
        .map(({ data, topics }) => ({
            ['0x' + topics[1].substr(26)]: parseInt(data),
        }))
        .reduce((a, b) => ({ ...a, ...b }), {})
    )
}

const filter = SFarm.filters.AuthorizeAdmin(null, null)

module.exports = {
    getFilters: () => {
        return [filter]
    },

    processLogs: async ({ logs }) => {
        const stateValue = processMaskLogs({
            logs: logs.filter(log => log.topics[0] === filter.topics[0])
        });
    
        const lastState = await LogsStateModel.findOne({
            key: this.key,
        }).lean();

        return LogsStateModel.updateOne(
            { key: this.key },
            {
                value: {
                    ...(lastState && lastState.value),
                    ...stateValue,
                }
            },
            { upsert: true },
        );
    }
}
