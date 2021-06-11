const Bluebird = require('bluebird')
const _ = require('lodash')
const { ethers } = require('ethers')
const FARM_GENESIS = parseInt(process.env.FARM_GENESIS)
const provider = new ethers.providers.JsonRpcProvider({
	timeout: 3000,
	url: process.env.RPC,
})
const ConfigModel = require("../models/ConfigModel");
const LogsStateModel = require('../models/LogsStateModel')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const TARGET_LOGS_PER_CHUNK = 500;
let CHUNK_SIZE = 30 // 1000

const getChunks = (from, to, chunkSize) => {
    const roundedFrom = Math.floor(from / chunkSize) * chunkSize
    const roundedTo = (Math.floor(to / chunkSize) + 1) * chunkSize
    const numberOfBlocks = (roundedTo - roundedFrom) / chunkSize

    const blocks = _.range(numberOfBlocks).map(i => {
        const blockFrom = roundedFrom + (chunkSize * i)
        const blockTo = roundedFrom + (chunkSize * i) + chunkSize - 1
        return {
            from: blockFrom < from ? from : blockFrom,
            to: blockTo > to ? to : blockTo,
        }
    });
    return blocks;
}

const _getLogs = async ({ fromBlock, toBlock, topics }) => {
    console.error('_getLogs', fromBlock, toBlock, topics)
    try {
        const logs = await provider.getLogs({
            topics,
            fromBlock,
            toBlock,
        });
        if (!Array.isArray(logs)) {
            throw new Error(JSON.stringify(logs));
        }
        if (logs.length < TARGET_LOGS_PER_CHUNK) {
            if (toBlock - fromBlock >= CHUNK_SIZE - 1) {
                CHUNK_SIZE = CHUNK_SIZE <= 1 ? 2 : CHUNK_SIZE = Math.floor(CHUNK_SIZE * 5 / 3)
                console.error('getLogs: CHUNK_SIZE increased to', CHUNK_SIZE)
            }
        }
        return logs;
    } catch(err) {
        if (err.code != 'TIMEOUT') {
            throw err
        }
        if (CHUNK_SIZE > 1) {
            CHUNK_SIZE >>= 1
        }
        console.error('getLogs: CHUNK_SIZE decreased to', CHUNK_SIZE)
    }
}

const mergeTopics = (topics) => {
    return topics
        .map(ts => ts.map(t => _.isArray(t) ? t : [t])) // wrap all single topic to array
        .reduce((topics, ts, it) => {
            ts.forEach((t, i) => {
                t.forEach(ti => {
                    if (!topics[i].includes(ti)) {
                        topics[i].push(ti)
                    }
                })
            })
            return topics
        })
}

function getFirstForwardRangeLogs(pastRequests) {
    const forwardLos = pastRequests
        .filter(r => !r.backward)
        .map(r => r.lo)
        .sort((a, b) => a - b)
    const fLo = forwardLos[0]
    const fHi = Math.min(forwardLos.find(a => a > fLo), fLo + CHUNK_SIZE)

    if (fLo >= fHi) {
        return undefined
    }

    const forwardRequests = pastRequests
        .filter(r => r.lo < fHi && r.hi > fLo)

    const topics = mergeTopics(forwardRequests.map(r => r.topics))
    return _getLogs({ fromBlock: fLo, toBlock: fHi-1, topics })
}

const processNewState = async ({ configs, head }) => {
    const configsArray = await Promise.resolve(
        _.entries(configs).map(([key, value]) => {
            return {
                ...value,
                key,
            };
        })
    ).then(async configsArray => {
        return Bluebird.map(configsArray, async config => {
            return {
                ...config,
                stateExists: await LogsStateModel.exists({ key: config.key }),
            };
        })
    });

    let fromBlock = 1 + await ConfigModel.findOne({
        key: 'lastSyncedBlock'
    }).lean().then(m => m && m.value);
    if (fromBlock < FARM_GENESIS) {
        fromBlock = FARM_GENESIS
    }

    while (fromBlock < head) {
        const requests = _.flatten(configsArray.map(c => c.getRequests()))

        const headRequests = requests.filter(r => !r.lo)


        if (fromBlock + CHUNK_SIZE - 1 < head) {
            var toBlock = fromBlock + CHUNK_SIZE - 1
        }

        const topics = mergeTopics(headRequests.map(r => r.topics))
        const logs = await _getLogs({ fromBlock, toBlock, topics })

        if (!logs) {
            continue
        }

        await Bluebird.map(configsArray, async config => {
            await config.processLogs({ logs, fromBlock, toBlock });
        });

        if (!toBlock) {
            // catch the best head
            var toBlock = Math.max(head, ...logs.map(l => l.blockNumber))
        }

        await ConfigModel.updateOne(
            { key: 'lastSyncedBlock' },
            { value: toBlock },
            { upsert: true },
        )

        fromBlock = toBlock + 1
    }
}

exports.processNewState = processNewState;
exports.processPastState = processPastState;