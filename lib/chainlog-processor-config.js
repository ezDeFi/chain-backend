'use strict'
const { rpcKnownError, delay } = require('./util')

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
        return concurrency ?? 1
    }

    const getSize = () => {
        return Math.round(size ?? 1)
    }

    const _setSize = (newSize) => {
        const oldSize = size
        if (newSize > oldSize) {
            console.log(`CHUNK_SIZE (${type}) ++++ ${newSize.toFixed(2)}`)
        } else if (newSize < oldSize) {
            console.log(`CHUNK_SIZE (${type}) ---- ${newSize.toFixed(2)}`)
        } else {
            return  // no change
        }
        size = newSize
    }

    const getLogs = async ({ address, fromBlock, toBlock, topics }, concurrency = 1) => {
        // console.log(`getLogs:${type}`, {fromBlock, toBlock, address, topics})
        const logs = await _tryGetLogs({
            address,
            topics,
            fromBlock,
            toBlock,
        });
        // console.log({logs})
        if (!Array.isArray(logs)) {
            throw new Error('unexpected logs response: ' + JSON.stringify(logs));
        }

        // only adapt chunk size when the query is near full chunk size
        if (toBlock) {
            if ((toBlock-fromBlock+1) >= size*2/3) {
                _adapt(logs, concurrency)
            }
        }
        return logs;
    }

    const _tryGetLogs = async (params) => {
        const RETRY = 8
        for (let i = 0; true; ++i) {
            try {
                return await provider.getLogs(params);
            } catch(err) {
                if (i < RETRY) {
                    const duration = Math.round((i+1) * (333 + Math.random()*1000))
                    console.warn(`retry after ${duration / 1000}s: `, err.reason ?? err.code ?? err.message)
                    await delay(duration)
                    continue
                }
                console.error('unable to get logs: out of retries', { address, fromBlock, toBlock, topics })
                _adapt(err, concurrency)
                throw err
            }
        }
    }

    /// should only be called when call is full chunk size
    /// result can be an Error object, or the logs.length
    const _adapt = (result, concurrency = 1) => {
        const changeRate = 1 / Math.pow(concurrency, 1/4)

        const _chunkSizeUp = () => {
            let newSize = size * Math.pow(1.05, changeRate)
            newSize = Math.min(hardCap, newSize)
            return _setSize(newSize)
        }
    
        const _chunkSizeDown = () => {
            let newSize = size * Math.pow(0.9, changeRate)
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
