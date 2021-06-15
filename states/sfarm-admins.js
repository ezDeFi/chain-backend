const _ = require('lodash')
const { ethers } = require('ethers')
const { FRESH_BLOCK } = require('../helpers/constants').getlogs
const { ZERO_HASH } = require('../helpers/constants').hexes
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/SFarm.json').abi
const LogsStateModel = require('../models/LogsStateModel')
const SFarm = new ethers.Contract(process.env.FARM, contractABI, provider)
const FARM_GENESIS = parseInt(process.env.FARM_GENESIS)

const filter = SFarm.filters.AuthorizeAdmin(null, null)
const filters = [filter]
const addresses = filters.map(f => f.address)

module.exports = (key) => {
    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    const getNextFrom = (state) => {
        if (!state) {
            return FARM_GENESIS
        }
        if (state.block) {
            return state.block + 1
        }
        return undefined    // use FRESH_BLOCK
    }

    return {
        key,

        getRequests: async (maxRange) => {
            const state = await LogsStateModel.findOne({ key }).lean();
            const from = getNextFrom(state) || FRESH_BLOCK

            return filters.map(f => ({
                topics: f.topics,
                from,
            }))
        },

        processLogs: async ({ logs, fromBlock, toBlock, freshBlock }) => {
            try {
                const state = await LogsStateModel.findOne({ key }).lean();
                console.error('processLogs', {state})

                const { value: oldValue, block: oldBlock } = {...state}
                if (!!oldBlock && oldBlock+1 < fromBlock) {
                    throw new Error(`FATAL: ${key} missing block range: ${oldBlock}-${fromBlock}`)
                }

                const from = getNextFrom(state) || freshBlock

                if (from == null) {  // ignore past crawling when we're up to head
                    return
                }
                if (from > fromBlock) {
                    return  // ignore head logs when we're out-dated
                }

                logs = logs
                    .filter(l => addresses.includes(l.address))
                    .filter(log => log.topics[0] === filter.topics[0])
                    .filter(log => log.blockNumber >= from)

                let value = {...oldValue}

                // up to head
                if (!freshBlock) {
                    var block = toBlock
                }

                const changes = {}

                // assume that the logs is sorted by blockNumber and transactionIndex
                for (let i = logs.length-1; i >= 0; --i) {
                    const log = logs[i]
                    const admin = '0x'+log.topics[1].slice(26)
                    if (!changes.hasOwnProperty(admin)) {
                        const enable = log.data != ZERO_HASH
                        changes[admin] = enable
                    }
                }

                if (!!block && Object.keys(changes) == 0) {
                    return  // no data change
                }

                value = Object.assign(value, changes)

                return LogsStateModel.updateOne(
                    { key },
                    { value, block },
                    { upsert: true },
                );
            } catch (err) {
                if (!freshBlock) {
                    console.error(`ERROR in ${key}.processLogs, skip!`, err)
                    return
                }
                const block = freshBlock-1
                console.error(`ERROR in ${key}.processLogs, tracking last synced block ${block}`, err)
                return LogsStateModel.updateOne(
                    { key },
                    { block },
                    { upsert: true },
                );
            }
        }
    }
}
