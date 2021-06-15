const _ = require('lodash')
const { ethers } = require('ethers')
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/SFarm.json').abi
const LogsStateModel = require('../models/LogsStateModel')
const SFarm = new ethers.Contract(process.env.FARM, contractABI, provider)
const FARM_GENESIS = parseInt(process.env.FARM_GENESIS)

const ZERO_HASH = '0x'.padEnd(66, '0')

const FRESH_BLOCK = 'FRESH_BLOCK'

// let DEBUG_HEAD

const processMaskLogs = ({ logs }) => {
    return _.pickBy(logs
        .map(({ data, topics }) => ({
            ['0x' + topics[1].substr(26)]: parseInt(data),
        }))
        .reduce((a, b) => ({ ...a, ...b }), {})
    )
}

const filter = SFarm.filters.AuthorizeAdmin(null, null)
const filters = [filter]
const addresses = filters.map(f => f.address)

module.exports = (key) => {
    // reset the state
    // LogsStateModel.deleteOne({ key }).then(console.error).catch(console.error)

    const getLo = (state) => {
        if (!state) {
            return FARM_GENESIS
        }
        if (state.block) {
            return state.block + 1
        }
        return undefined    // LAST_SYNCED_BLOCK
    }

    return {
        key,

        getRequests: async () => {
            const state = await LogsStateModel.findOne({ key }).lean();
            const lo = getLo(state) || FRESH_BLOCK

            return filters.map(f => ({
                topics: f.topics,
                lo,
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

                const lo = getLo(state) || freshBlock

                if (lo == null) {  // ignore past crawling when we're up to head
                    return
                }
                if (lo > fromBlock) {
                    return  // ignore head logs when we're out-dated
                }

                logs = logs
                    .filter(l => addresses.includes(l.address))
                    .filter(log => log.topics[0] === filter.topics[0])
                    .filter(log => log.blockNumber >= lo)

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
                console.error(`ERROR in ${key}.processLogs, tracking last synced block ${freshBlock-1}`, err)
                return LogsStateModel.updateOne(
                    { key },
                    { block: freshBlock-1 },
                    { upsert: true },
                );
            }
        }
    }
}
