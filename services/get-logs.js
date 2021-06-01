const Bluebird = require('bluebird')
const _ = require('lodash')
const { ethers } = require('ethers')
const minBlock = parseInt(process.env.FARM_GENESIS)
const contractAddress = process.env.FARM
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const contractABI = require('../ABIs/SFarm.json').abi
const { memoize } = require('./memoize')
const SFarm = new ethers.Contract(process.env.FARM, contractABI, provider)

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

const _getAdminLogs = async ({ from, to }) => {
    const adminLogs = await provider.getLogs({
        ...SFarm.filters.AuthorizeAdmin(null, null),
        fromBlock: from,
        toBlock: to,
    });
    if (!Array.isArray(adminLogs)) {
        throw new Error(JSON.stringify(adminLogs));
    }
    return adminLogs;
}

exports.getAdminsLogs = async ({
    fromBlock, toBlock,
}) => {
    const blocks = getChunks(fromBlock, toBlock, 5000);
    const adminLogs = await Bluebird.map(
        blocks,
        ({ from, to }, i) => {
            const fn = i - 1 === blocks.length ?
                _getAdminLogs : memoize(_getAdminLogs, '_getAdminLogs')
            return fn({ from, to })
        }, { concurrency: 10 },
    ).then(_.flatten);
    
    return Object
        .entries(
            adminLogs
                .map(({ data, topics }) => ({
                    ['0x' + topics[1].substr(26)]: data,
                }))
                .reduce((a, b) => ({ ...a, ...b }), {}),
        )
        .filter(([_key, value]) => Number(value) === 1)
        .map(([key]) => key);
};

const _getFarmerLogs = async ({ from, to }) => {
    const farmerLogs = await provider.getLogs({
        ...SFarm.filters.AuthorizeFarmer(null, null),
        fromBlock: from,
        toBlock: to,
    });
    if (!Array.isArray(farmerLogs)) {
        throw new Error(JSON.stringify(farmerLogs));
    }
    return farmerLogs;
}

exports.getFarmerLogs = async ({
    fromBlock, toBlock,
}) => {
    const blocks = getChunks(fromBlock, toBlock, 5000);
    const farmerLogs = await Bluebird.map(blocks, ({ from, to }, i) => {
        const fn = i - 1 === blocks.length ?
            _getFarmerLogs : memoize(_getFarmerLogs, '_getFarmerLogs')
        return fn({ from, to })
    }, { concurrency: 10 }).then(_.flatten);

    return Object
        .entries(farmerLogs
            .map(({ data, topics }) => ({
                ['0x' + topics[1].substr(26)]: data,
            }))
            .reduce((a, b) => ({ ...a, ...b }), {}),
        )
        .filter(([_key, value]) => Number(value) === 1)
        .map(([key]) => key);
};

const _getRouterLogs = async ({ from, to }) => {
    const routerLogs = await provider.getLogs({
        ...SFarm.filters.AuthorizeRouter(null, null),
        fromBlock: from,
        toBlock: to,
    });
    if (!Array.isArray(routerLogs)) {
        throw new Error(JSON.stringify(routerLogs));
    }
    return routerLogs;
}

exports.getRouterLogs = async ({
    fromBlock, toBlock,
}) => {
    const blocks = getChunks(fromBlock, toBlock, 5000);
    const routerLogs = await Bluebird.map(blocks, ({ from, to }, i) => {
        const fn = i - 1 === blocks.length ?
            _getRouterLogs : memoize(_getRouterLogs, '_getRouterLogs')
        return fn({ from, to })
    }, { concurrency: 10 }).then(_.flatten);

    return Object
        .entries(routerLogs
            .map(({ data, topics }) => ({
                ['0x' + topics[1].substr(26)]: data,
            }))
            .reduce((a, b) => ({ ...a, ...b }), {}),
        )
        .filter(([_key, value]) => Number(value) === 1)
        .map(([key]) => key);
}

const _getTokenLogs = async ({ from, to }) => {
    const tokenLogs = await provider.getLogs({
        ...SFarm.filters.AuthorizeToken(null, null),
        fromBlock: from,
        toBlock: to,
    });
    if (!Array.isArray(tokenLogs)) {
        throw new Error(JSON.stringify(tokenLogs));
    }
    return tokenLogs;
}

exports.getTokenLogs = async ({
    fromBlock, toBlock,
}) => {
    const blocks = getChunks(fromBlock, toBlock, 5000);
    const tokenLogs = await Bluebird.map(blocks, ({ from, to }, i) => {
        const fn = i - 1 === blocks.length ?
            _getTokenLogs : memoize(_getTokenLogs, '_getTokenLogs')
        return fn({ from, to })
    }, { concurrency: 10 }).then(_.flatten);

    const groupedTokenLogs = tokenLogs
        .map(({ data, topics }) => ({
            ['0x' + topics[1].substr(26)]: data,
        }))
        .reduce((a, b) => ({ ...a, ...b }), {});
    
    return _(groupedTokenLogs)
        .entries()
        .map(([address, authMode]) => {
            return {
                address,
                authMode: Number(authMode),
            }
        })
        .filter(m => !!m.authMode)
        .value();
}