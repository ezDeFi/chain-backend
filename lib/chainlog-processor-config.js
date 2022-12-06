'use strict'
const _ = require('lodash')
const { rpcKnownError, delay, mergeUniqSortedLogs } = require('./util')

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
    const getProvider = () => {
        if (!Array.isArray(provider)) {
            return provider
        }
        const i = Math.floor(provider.length * Math.random())
        const test = async() => {
            let fromBlock = 23601532
        for (let index = 0; true; index++) {
            const filter ={
            address: undefined,
            fromBlock: fromBlock,
            toBlock: fromBlock+100,
            topics: [
                [
                    '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
                    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'
                ]
                ]
            }
            const logs = await provider[i].web3.eth.getPastLogs(filter)
            console.log(logs.length +','+ index)
            fromBlock = fromBlock+101
        }
        }
        test()
        return provider[i]
    }

    const getConcurrency = () => {
        return concurrency ?? 1
    }

    const getSize = () => {
        return Math.round(size ?? 1)
    }

    const getLogs = async (requests, safeBlock) => {
        if (!Array.isArray(requests)) {
            requests = [ requests ]
        } else if (!requests.length) {
            return []
        }

        let rs = await Promise.all(requests.map(async request => {
            if (request == null) {
                return {
                    provider: getProvider(),
                    logs: [],
                }
            }
            const { provider, logs } = await _tryGetLogs(request);
            if (!Array.isArray(logs)) {
                throw new Error('unexpected logs response: ' + JSON.stringify(logs));
            }
            return { provider, logs }
        }))

        if (requests.length != rs?.length) {
            throw new Error(`unexpected logs array length, expected: ${requests.length}, actual: ${rs?.length}`)
        }

        if (requests?.length > 1 && safeBlock != null) {
            rs.forEach(r => {
                r.maxBlock = _.maxBy(r.logs, 'blockNumber')?.blockNumber
            })
            const best = _.maxBy(rs, 'maxBlock')
            if (best?.maxBlock != null && safeBlock < best.maxBlock) {
                rs = await Promise.all(rs.map(async (r, i) => {
                    r.logs = r.logs.filter(log => log.blockNumber <= best.maxBlock)
                    if (r.maxBlock != null && r.maxBlock >= best.maxBlock) {
                        return r
                    }
                    const request = requests[i]
                    const fromBlock = _.max([request.fromBlock, r.maxBlock+1])
                    const toBlock = _.min([request.toBlock, best.maxBlock])
                    if (fromBlock <= toBlock) {
                        const { logs } = await _tryGetLogs({...request, fromBlock, toBlock}, best.provider)
                        if (logs?.length) {
                            console.warn('** CATCH', logs.length)
                        }
                        r.logs = mergeUniqSortedLogs([r.logs, logs])
                    }
                    return r
                }))
            }
        }

        return mergeUniqSortedLogs(rs.map(r => r.logs))
    }

    const _tryGetLogs = async (params, _provider) => {
        const RETRY = 8
        for (let i = 0; true; ++i) {
            try {
                const provider = _provider ?? getProvider()
                params.fromBlock = parseInt(params.fromBlock)
                params.toBlock = parseInt(params.toBlock)
                const test = async() => {
                    let fromBlock = 23601532
                    for (let index = 0; true; index++) {
                        const filter ={
                        address: undefined,
                        fromBlock: fromBlock,
                        toBlock: fromBlock+100,
                        topics: [
                            [
                                '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
                                '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'
                            ]
                            ]
                        }
                        const logs = await provider.web3.eth.getPastLogs(filter)
                        const log = await provider.web3.eth.getPastLogs(params)
                        console.log('FILTERRRRRRRRRRR',logs.length +','+ index)
                        console.log('PARAMMMMMMMMMMMs',log.length +','+ index)
                        fromBlock = fromBlock+101
                    }
                }
                test()
                console.log(await provider.web3.eth.getBlockNumber())
                if (provider.web3) {
                    console.log('INTO PROVIDERRRRRRRRR',)
                    let logs =  await provider.web3.eth.getPastLogs(params);
                    // console.log(logs.length)
                    return { provider, logs }
                }
                const logs = await provider.getLogs(params)
                // console.log(logs.length)
                return { provider, logs }
            } catch(err) {
                if (i < RETRY) {
                    const duration = Math.round((i+1) * (333 + Math.random()*1000))
                    console.warn(`retry after ${duration / 1000}s: `, err.reason ?? err.code ?? err.message)
                    await delay(duration)
                    continue
                }
                console.error('unable to get logs: out of retries', params)
                throw err
            }
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
