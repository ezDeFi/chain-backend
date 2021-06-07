const _ = require('lodash')

const StateCacheModel = require("../models/StateCacheModel");
const mongoose = require("mongoose");
const { getAdminsLogs, getTokenLogs, getFarmerLogs, getRouterLogs } = require('./get-logs');
mongoose.set("useFindAndModify", false);

const getLogsUsingCache = async ({fromBlock, toBlock, getLogs, type}) => {
    const caches = await StateCacheModel.find({
        type,
        fromBlock: {
            $gte: fromBlock,
        },
        toBlock: {
            $lte: toBlock,
        },
    }).lean();
    
    const bestCache = _(caches).sortBy(cache => cache.toBlock - cache.fromBlock).last();
    
    const logs = await (async () => {
        if (!bestCache) {
            return getLogs({ fromBlock, toBlock });
        }
        
        const prevChunk = fromBlock < bestCache.fromBlock && {
            fromBlock,
            toBlock: bestCache.fromBlock - 1,
        } || null

        const nextChunk = bestCache.toBlock < toBlock && {
            fromBlock: bestCache.toBlock + 1,
            toBlock,
        } || null

        const [
            prevLogs,
            nextLogs,
        ] = await Promise.all([
            prevChunk && getLogs(prevChunk),
            nextChunk && getLogs(nextChunk),
        ]);

        const logs = {
            ...prevLogs,
            ...bestCache.logs,
            ...nextLogs,
        }

        return logs;
    })();
    
    // optional, no await
    (async () => {
        await StateCacheModel.create({
            type,
            fromBlock,
            toBlock,
            logs,
        });
        await StateCacheModel.deleteMany({
            _id: { $in: caches.map(cache => cache._id) },
        });
    })();
    
    return logs;
}

exports.getAdminLogsUsingCache = ({ fromBlock, toBlock }) => getLogsUsingCache({
    fromBlock, toBlock, getLogs: getAdminsLogs, type: 'getAdminsLogs'
})

exports.getTokenLogsUsingCache = ({ fromBlock, toBlock }) => getLogsUsingCache({
    fromBlock, toBlock, getLogs: getTokenLogs, type: 'getTokenLogs',
})

exports.getFarmerLogsUsingCache = ({ fromBlock, toBlock }) => getLogsUsingCache({
    fromBlock, toBlock, getLogs: getFarmerLogs, type: 'getFarmerLogs',
})

exports.getRouterLogsUsingCache = ({ fromBlock, toBlock }) => getLogsUsingCache({
    fromBlock, toBlock, getLogs: getRouterLogs, type: 'getRouterLogs',
})
