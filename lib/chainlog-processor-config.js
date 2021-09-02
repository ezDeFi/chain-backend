'use strict'
const { rpcKnownError } = require('./util')

// Description
//  * Create a configuration which is pass to 'startWorker(config)' as input
//  'config.processorConfigs'.
//
// Input
//  * options {Object}
//  * options.type {String} 'HEAD' or 'PAST'.
//  * options.provider {ethers.providers.JsonRpcProvider}
//  * options.size {Number}
//  * options.concurrency {Number}
//  * options.hardCap {Number}
//  * options.target {Number}
//
// Output {Object}
//  * getLogs {getLogsFunction}
//  * getConcurrency {function() => Number}
//  * getSize {function() => Number}
function chainlogProcessorConfig({type, provider, size, concurrency, hardCap=4000, target=500}) {
    const getProvider = () => provider

    const getConcurrency = () => {
        return concurrency || 1
    }

    const getSize = () => {
        return size || 1
    }

    const _setSize = (newSize) => {
        const oldSize = size
        if (newSize > oldSize) {
            console.log(`CHUNK_SIZE (${type}) ++++ ${newSize}`)
        } else if (newSize < oldSize) {
            console.log(`CHUNK_SIZE (${type}) ---- ${newSize}`)
        } else {
            return  // no change
        }
        size = newSize
    }

    const getLogs = async ({ address, fromBlock, toBlock, topics }, concurrency = 1) => {
        // console.log(`getLogs:${type}`, {fromBlock, toBlock, address, topics})
        try {
            const logs = await provider.getLogs({
                address,
                topics,
                fromBlock,
                toBlock,
            });
            // console.log({logs})
            if (!Array.isArray(logs)) {
                throw new Error(JSON.stringify(logs));
            }
    
            // only adapt chunk size when the query is near full chunk size
            if (toBlock) {
                if ((toBlock-fromBlock+1) >= getSize()*2/3) {
                    _adapt(logs, concurrency)
                }
            }
            return logs;
        } catch(err) {
            _adapt(err, concurrency)
            throw err
        }
    }

    /// should only be called when call is full chunk size
    /// result can be an Error object, or the logs.length
    const _adapt = (result, concurrency = 1) => {
        const oldSize = getSize()

        const _chunkSizeUp = () => {
            let newSize = Math.floor(oldSize * Math.pow(1.05, 1/concurrency))
            if (newSize <= oldSize) {
                newSize = oldSize + 1
            }
            newSize = Math.min(hardCap, newSize)
            return _setSize(newSize)
        }
    
        const _chunkSizeDown = () => {
            let newSize = Math.floor(oldSize * Math.pow(0.9, 1/concurrency))
            newSize = Math.max(1, newSize)
            return _setSize(newSize)
        }

        if (rpcKnownError(result)) {
            return _chunkSizeDown()
        }
        if (result.length < target) {
            return _chunkSizeUp()
        }
    }

    return {
        getProvider,
        getLogs,
        getConcurrency,
        getSize,
    }
}

module.exports = chainlogProcessorConfig
