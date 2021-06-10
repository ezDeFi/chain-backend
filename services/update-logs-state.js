const Bluebird = require('bluebird')
const _ = require('lodash')
const { ethers } = require('ethers')
const minBlock = parseInt(process.env.FARM_GENESIS)
const contractAddress = process.env.FARM
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/SFarm.json').abi
const { memoize } = require('../services/memoize')
const ConfigModel = require("../models/ConfigModel");
const LogsStateModel = require('../models/LogsStateModel')
const Queue = require('promise-queue')
const queue = new Queue(1, Infinity)
const mongoose = require("mongoose");
const { delay } = require('bluebird')
mongoose.set("useFindAndModify", false);

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
    const logs = await provider.getLogs({
        topics,
        fromBlock,
        toBlock,
    });
    if (!Array.isArray(logs)) {
        throw new Error(JSON.stringify(logs));
    }
    return logs;
}

const updateLogsState = async ({ configs }) => {
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

    const notSyncedConfig = configsArray.find(config =>
        !config.stateExists
    );

    const latestCachedBlock = await ConfigModel.findOne({
        key: 'latestCachedBlock'
    }).lean().then(m => m && m.value);

    if (notSyncedConfig && latestCachedBlock) {
        const filter = await notSyncedConfig.getFilter();
        const topics = filter.topics;
        const fromBlock = filter.fromBlock || minBlock;
        const toBlock = latestCachedBlock;
        const blocks = getChunks(fromBlock, toBlock, 1000);
        const logs = await Bluebird.map(blocks, ({ from: fromBlock, to: toBlock }, i) => {
            const fn = i + 1 === blocks.length ?
                _getLogs : memoize(_getLogs, '_getAllLogs')
            return fn({ fromBlock, toBlock, topics })
        }, { concurrency: 10 }).then(_.flatten);
        return await notSyncedConfig.processLogs({ logs });
    }

    const toBlock = await provider.getBlockNumber();

    const uncachedChunk = {
        fromBlock: latestCachedBlock ? latestCachedBlock + 1 : minBlock,
        toBlock
    }

    const topics = [
        await Bluebird.map(configsArray, async config => {
            return config.getFilter().then(m => m.topics)
        }).then(_.flatten),
    ];

    const blocks = getChunks(uncachedChunk.fromBlock, uncachedChunk.toBlock, 1000);
    const logs = await Bluebird.map(blocks, ({ from: fromBlock, to: toBlock }, i) => {
        const fn = i + 1 === blocks.length ?
            _getLogs : memoize(_getLogs, '_getAllLogs')
        return fn({ fromBlock, toBlock, topics })
    }, { concurrency: 10 }).then(_.flatten);

    await ConfigModel.updateOne(
        { key: 'latestCachedBlock' },
        { value: toBlock },
        { upsert: true },
    )

    await Bluebird.map(configsArray, async config => {
        await config.processLogs({ logs });
    });
}

exports.updateLogsState = updateLogsState;