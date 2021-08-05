const _ = require('lodash')
const { ZERO_ADDRESS, LARGE_VALUE } = require('../helpers/constants').hexes
const { TOKENS } = require('../helpers/constants').bsc
const Bluebird = require('bluebird')
const PairModel = require('../models/PairModel')
const UniswapV2Router01 = require('../ABIs/UniswapV2Router01.json').abi
const UniswapV2Pair = require('../ABIs/UniswapV2Pair.json').abi
const Aggregator = require('../ABIs/Aggregator.json').abi
const stopwatch = require('../helpers/stopwatch')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const { ethers } = require('ethers')
const bn = ethers.BigNumber.from
const bscUtil = require('bsc_util')
const { STALE_MILIS } = require('../helpers/constants').time

const DV_PRECISION = 1000000
const RATE_PRECISION = 1000000

const DV_THRESHOLD = 0.03
const RATE_THRESHOLD = 0.9

var provider
function getProvider() {
    if (!provider) {
        const { JsonRpcProvider } = require('@ethersproject/providers')
        provider = new JsonRpcProvider({
            timeout: 3000,
            url: process.env.RPC,
        })
    }
    return provider
}

const MIDS = [
    TOKENS.BTCB,
    TOKENS.ETH,
    TOKENS.DOT,
    TOKENS.USDC,
    TOKENS.DAI,
]

const MULTI_MIDS = [ [[]], MIDS.map(m => [m]), [], [] ]
for (let i = 0; i < MIDS.length; ++i) {
    for (let j = 0; j < MIDS.length; ++j) {
        if (i != j) {
            MULTI_MIDS[2].push([MIDS[i], MIDS[j]])
            for (let k = 0; k < MIDS.length; ++k) {
                if (k != i && k != j) {
                    MULTI_MIDS[3].push([MIDS[i], MIDS[j], MIDS[k]])
                }
            }
        }
    }
}

const DEXES = [
    { swap: 'pancake' },                        // 0
    { swap: 'pancake', mid: TOKENS.WBNB },      // 1
    { swap: 'pancake', mid: TOKENS.CAKE },      // 2
    { swap: 'pancake', mid: TOKENS.BUSD },      // 3
    { swap: 'pancake', mid: TOKENS.USDT },      // 4
    { swap: 'bakery' },                         // 5
    { swap: 'bakery', mid: TOKENS.WBNB },       // 6
    { swap: 'bakery', mid: TOKENS.BUSD },       // 7
    { swap: 'pancake2' },                       // 8
    { swap: 'pancake2', mid: TOKENS.WBNB },     // 9
    { swap: 'pancake2', mid: TOKENS.CAKE },     // 10
    { swap: 'pancake2', mid: TOKENS.BUSD },     // 11
    { swap: 'pancake2', mid: TOKENS.USDT },     // 12
    { swap: 'jul' },                            // 13
    { swap: 'jul', mid: TOKENS.WBNB },          // 14
    { swap: 'ape' },                            // 15
    { swap: 'ape', mid: TOKENS.WBNB },          // 16
    { swap: 'ape', mid: TOKENS.BUSD },          // 17
]

const SERVICES = {
    pancake: {
        factory: '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
        factoryBlock: 586851,
        router: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
        fee10000: 20,
    },
    bakery: {
        factory: '0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7',
        factoryBlock: 470617,
        router: '0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F',
        fee10000: 30,
    },
    pancake2: {
        factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        factoryBlock: 6809737,
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        fee10000: 25,
    },
    // jul: {
    //     factory: '0x553990F2CBA90272390f62C5BDb1681fFc899675',
    //     factoryBlock: 784352,
    //     router: '0xbd67d157502A23309Db761c41965600c2Ec788b2',
    //     fee10000: 30,
    // },
    ape: {
        factory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
        factoryBlock: 4855901,
        router: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
        fee10000: 20,
    },
}

const sum = (chunks) => chunks.reduce((sum, a) => sum + a, 0)
const count = (chunks) => chunks.reduce((count, chunk) => count + chunk ? 1 : 0, 0)

function tokenName(address) {
    const token = Object.entries(TOKENS).find(([, a]) => a == address)
    if (token) {
        return token[0]
    }
    return address
}

const CONTRACTS = {
}
function getRouterContract(swap) {
    if (CONTRACTS[swap]) {
        return CONTRACTS[swap]
    }
    if (!SERVICES[swap].router) {
        console.warn(`WARN: no router address for ${swap}`)
        return
    }
    return CONTRACTS[swap] = new ethers.Contract(SERVICES[swap].router, UniswapV2Router01, getProvider())
}

function getSwapFromFactory(address) {
    return Object.entries(SERVICES).find(([swap, { factory }]) => factory == address)[0]
}

async function getAmountOutByReserves(swap, amountIn, reserveIn, reserveOut) {
    if (!amountIn || amountIn.isZero()) {
        return 0
    }
    const fee10000 = SERVICES[swap].fee10000
    const amountInWithFee = bn(10000).sub(fee10000).mul(amountIn)
    const numerator = amountInWithFee.mul(reserveOut)
    const denominator = bn(reserveIn).mul(10000).add(amountInWithFee)
    const amountOut = numerator.div(denominator)
    if (process.env.DEBUG) {
        const contract = getRouterContract(swap)
        if (contract) {
            const contractOut = await contract.callStatic.getAmountOut(amountIn, reserveIn, reserveOut)
            if (!amountOut.eq(contractOut)) {
                console.error('getAmountOut: WRONG calculation', {swap, fee10000, amountOut: amountOut.toString(), contractOut: contractOut.toString()})
            }
        }
    }
    return amountOut
}

// async function getFee10000(swap) {
//     if (FEE10000[swap]) {
//         return FEE10000[swap]
//     }
//     const key = `router-fee-${swap}`
//     const savedValue = await ConfigModel.findOne({ key }).lean().then(m => m && m.value)
//     if (savedValue) {
//         return FEE10000[swap] = savedValue
//     }
//     const contract = getRouterContract(swap)
//     const ret = await contract.callStatic.getAmountOut(100000, '1'+'0'.repeat(32), '1'+'0'.repeat(32))
//     const value = Math.round(10000 - ret.toNumber() / 10)
//     await ConfigModel.updateOne(
//         { key },
//         { value },
//         { upsert: true },
//     )
//     return FEE10000[swap] = value
// }

// function bnDiv(a, b) {
//     while(true) {
//         try {
//             return a.toNumber() / b.toNumber()
//         } catch(err) {
//             a = a.div(2)
//             b = b.div(2)
//         }
//     }
// }

function predictGas(hops) {
    return 130000 + hopsGas(hops)
}

function hopsGas(hops) {
    return hops * 120000
}

function createSwapContext({gasPrice, gasToken, getState}) {
    const cacheState = {}
    async function getStateDB(address) {
        if (cacheState.hasOwnProperty(address)) {
            return cacheState[address]
        }
        const value = await stopwatch.watch(
            PairModel.findOne({
                updatedAt: { $gte: new Date(new Date().getTime()-STALE_MILIS).toISOString() },
                address,
            }).lean(),
            'database',
        )
        return cacheState[address] = value
    }

    gasPrice = bn(gasPrice || '5'+'0'.repeat(9))
    gasToken = ethers.utils.getAddress(gasToken || TOKENS.WBNB)
    getState = getState || getStateDB

    function findPair(swap, inputToken, outputToken) {
        return {
            address: ethers.utils.getAddress(bscUtil.findPair(swap, inputToken, outputToken)),
            backward: inputToken.toLowerCase() > outputToken.toLowerCase(),
        }
    }

    const cacheAccuracy = {}
    async function getPairReserves(swap, inputToken, outputToken) {
        const { address, backward } = await findPair(swap, inputToken, outputToken)
        const pair = await getState(address)
        if (!pair || !pair.reserve0 || !pair.reserve1) {
            return []
        }
        const [ r0, r1 ] = [ pair.reserve0, pair.reserve1 ]
    
        if (process.env.DEBUG && !cacheAccuracy.hasOwnProperty(address)) {
            const contract = new ethers.Contract(address, UniswapV2Pair, getProvider())
            if (contract) {
                const { _reserve0, _reserve1 } = await contract.callStatic.getReserves()
                const a = r0.mul(_reserve1)
                const b = r1.mul(_reserve0)
                const acc = a.mul(1000).div(b).sub(1000).toNumber()/10
                cacheAccuracy[address] = acc
                if (acc < -0.1 || acc > 0.1) {
                    console.error(`Reserve accurracy: ${acc}% ${swap} ${inputToken} ${outputToken}`)
                }
            }
        }
    
        return backward ? [ r1, r0 ] : [ r0, r1 ]
    }
    
    async function getAmountOut(swap, inputToken, outputToken, amountIn) {
        if (!SERVICES.hasOwnProperty(swap)) {
            return 0
        }
        const [ rin, rout ] = await getPairReserves(swap, inputToken, outputToken)
        if (!rin || !rout) {
            return 0
        }
        const amountOut = await getAmountOutByReserves(swap, amountIn, rin, rout)
        const slippage = amountOut.mul(rin).mul(100).div(amountIn).div(rout)
        if (slippage < 80) {
            return 0    // SLIPPAGE
        }
        return amountOut
    }

    async function findPath ({ inputToken, outputToken, amountIn, trader, noms }) {
        inputToken = ethers.utils.getAddress(inputToken)
        if (inputToken == TOKENS.BNB) {
            inputToken = TOKENS.WBNB
        }
        outputToken = ethers.utils.getAddress(outputToken)
        if (outputToken == TOKENS.BNB) {
            outputToken = TOKENS.WBNB
        }
        amountIn = bn(amountIn)
        trader = ethers.utils.getAddress(trader || ZERO_ADDRESS)
        noms = noms == null ? [0, 1] : noms
    
        let _cacheGasRoute
        async function getGasAsToken(token, wei) {
            if (token == gasToken) {
                return wei
            }
            if (_cacheGasRoute) {
                const { swap, path } = _cacheGasRoute
                const amountOut = await getRouteAmountOut(swap, path, wei)
                if (amountOut && !amountOut.isZero()) {
                    return amountOut
                }
            }
            for (const mids_nom of MULTI_MIDS) {
                for (const mids of mids_nom) {
                    if (gasToken == mids[0] || mids[mids.length-1] == token) {
                        continue
                    }
                    const path = [gasToken, ...mids, token]
    
                    for (const swap in SERVICES) {
                        const amountOut = await getRouteAmountOut(swap, path, wei)
                        if (amountOut && !amountOut.isZero()) {
                            _cacheGasRoute = { swap, path }
                            return amountOut
                        }
                    }
                }
            }
        }
    
        async function getRouteAmountOut(swap, path, amount) {
            for (let i = 1; i < path.length; ++i) {
                if (!amount || amount.isZero()) {
                    return
                }
                amount = await getAmountOut(swap, path[i-1], path[i], amount)
            }
            return amount
        }
    
        function getRouteAmountOuts(inputToken, outputToken, amount, chunks) {
            const total = sum(chunks)
            return Bluebird.map(DEXES, async ({swap, mid}, i, n) => {
                if (!chunks[i]) return
                const amountIn = amount.mul(chunks[i]).div(total)
                if (!amountIn || amountIn.isZero()) {
                    return
                }
                let path = [inputToken, outputToken]
                if (mid) {
                    if (path.includes(mid)) {
                        return
                    }
                    path = [inputToken, mid, outputToken]
                }
                const amountOut = await getRouteAmountOut(swap, path, amountIn)
                if (!amountOut || amountOut.isZero()) {
                    return
                }
                return { swap, amountOut, mid }
            })
        }
    
        const midFee = await getGasAsToken(outputToken, gasPrice.mul(hopsGas(1)))
        console.log({midFee: midFee.toString()})
    
        async function getBestDistribution(inputToken, outputToken, amountIn) {
            function amountOutSubFee(out) {
                return out.mid ? out.amountOut.sub(midFee) : out.amountOut
            }
    
            function sumOut(outs) {
                return outs.reduce((total, out) => {
                    if (!out || !out.amountOut || out.amountOut.isZero()) {
                        return total
                    }
                    return total.add(out.amountOut)
                }, bn(0))
            }
    
            function sumOutSubFee(outs) {
                return outs.reduce((total, out) => {
                    if (!out || !out.amountOut || out.amountOut.isZero()) {
                        return total
                    }
                    return total.add(amountOutSubFee(out))
                }, bn(0))
            }
    
            const zeroOutput = s => (!s || !s.amountOut || s.amountOut.isZero())
    
            // weed out all failed chunks
            async function clearFailedChunks(chunks) {
                let outs
                while (true) {
                    outs = await getRouteAmountOuts(inputToken, outputToken, amountIn, chunks)
                    const hasFailedChunks = outs.some((out, i) => chunks[i] && zeroOutput(out))
                    if (!hasFailedChunks) {
                        return [ chunks, outs ]
                    }
                    chunks = chunks.map((c, ci) => c && zeroOutput(outs[ci]) ? c >> 1 : c)
                    if (!chunks.some(c => c)) {
                        return []  // all chunks is cleared but no success
                    }
                    // console.error(chunks)
                }
            }
    
            let [ chunks, outs ] = await clearFailedChunks(new Array(DEXES.length).fill(128))
            if (!chunks) {
                return []
            }
    
            for (let _no_use_ = 0; _no_use_ < 64; ++_no_use_) {
                let matrix = [ ]
                // TODO: reduce by priority and last amountOut
                for (let i in chunks) {
                    if (!chunks[i]) {
                        continue
                    }
                    const removedOneChunks = [...chunks]
                    removedOneChunks[i] = 0
                    matrix.push(removedOneChunks)
                    const halfOneChunks = [...chunks]
                    halfOneChunks[i] >>= 1
                    matrix.push(halfOneChunks)
                }
                if (matrix.length == 0) {
                    break
                }
    
                const matrixOuts = await Bluebird.map(matrix, chunks => getRouteAmountOuts(inputToken, outputToken, amountIn, chunks))
    
                // const matrixSumOut = matrixOuts.map(outs => sumOut(outs))
    
                // insert the previous outs to the end of the array
                const matrixSumOutSubFee = [...matrixOuts, outs].map(outs => sumOutSubFee(outs))
                // console.error(matrixSumOutSubFee.map(s => s.toString()))
    
                const bestIndex = matrixSumOutSubFee.reduce((bestIndex, v, i) => v.gt(matrixSumOutSubFee[bestIndex]) ? i : bestIndex, 0)
                if (bestIndex == matrix.length) {
                    break   // the last item in the array is the last success outs
                }
    
                chunks = matrix[bestIndex]
                outs = matrixOuts[bestIndex]
                // console.error(chunks, bestIndex)
            }
    
            const amountOut = sumOut(outs)
            // console.error({amountOut: amountOut.toString()})
    
            // console.error(chunks, outs.filter(out => out))
            return [ amountOut, chunks, outs.filter(out => out) ]
        }
    
        return await Bluebird.map(noms, findBest).filter(best => best)
    
        async function findBest(nom) {
            if (nom >= MULTI_MIDS.length) {
                throw new Error('nom out of range: ' + nom)
            }
            const best = {
                amount: bn(0),
                distribution: [],
                path: [],
                pathRoutes: [],
            }
    
            for (const mids of MULTI_MIDS[nom]) {
                if (inputToken == mids[0] || mids[mids.length-1] == outputToken) {
                    continue
                }
                const tokens = [inputToken, ...mids, outputToken]
    
                let pathAmountOut = bn(amountIn)
                const distribution = new Array(DEXES.length).fill('')
                const dexes = []
                for (let i = 1; i < tokens.length; ++i) {
                    const [ amountOut, dist, routes ] = await getBestDistribution(tokens[i-1], tokens[i], pathAmountOut)
                    if (!amountOut) {
                        break
                    }
    
                    for (let j = 0; j < distribution.length; ++j) {
                        distribution[j] = dist[j] + (distribution[j] << 8)
                    }
    
                    dexes.push(routes)
                    pathAmountOut = amountOut
                }
                // console.error({amountOut, distribution, tokens})
                if (pathAmountOut.gt(best.amount)) {
                    // console.error(amountOut.toString())
                    best.amount = pathAmountOut
                    best.distribution = distribution
                    best.path = tokens
                    best.pathRoutes = dexes
                }
            }
    
            if (!best.amount || best.amount.isZero()) {
                return
            }
    
            let hops = 0
            const routeNames = best.pathRoutes.map(dx => dx.map(d => {
                if (!d.mid) {
                    hops++
                    return d.swap
                }
                hops += 2
                return `${d.swap} over ${tokenName(d.mid)}`
            }))
            const routeList = []
            for (let i = 0; i < best.path.length; ++i) {
                routeList.push(tokenName(best.path[i]))
                if (i < routeNames.length) {
                    routeList.push(routeNames[i])
                }
            }
    
            const predictedGas = predictGas(hops)
            const fee = await getGasAsToken(outputToken, gasPrice.mul(predictedGas))
    
            console.log('=========', {nom, hops, predictedGas})
            console.log(routeList)
            console.log('amountOut', best.amount.toString(), '-', fee.toString(), '=', best.amount.sub(fee).toString())
    
            return {
                amountOut: best.amount.toString(),
                tokens: best.path,
                distribution: best.distribution,
                estimatedGas: predictedGas,
                feeInOutputToken: fee.toString(),
            }
        }
    }

    async function swapRate(nativeSwap, tokenIn, swap, tokenOut) {
        try {
            const from = process.env.SWAPPER

            const amount = bn(process.env.SWAP_AMOUNT)

            const aggregator = new ethers.Contract(process.env.AGGREGATOR, Aggregator, getProvider())
            if (tokenIn == TOKENS.WBNB) {
                const amountOuts = await aggregator.callStatic.swap(
                    TOKENS.BNB,
                    0,
                    [{
                        router: getRouterContract(swap).address,
                        amount: 0,
                        path: [ TOKENS.WBNB, ZERO_ADDRESS ],
                    }],
                    tokenOut,
                    1,
                    LARGE_VALUE,
                    '0x1000000000000000000000000000000000000000000000000000000000000001',
                    { from, value: amount },
                )
                console.error(swap, tokenName(tokenIn), tokenName(tokenOut), amountOuts.map(a => a.toString()))
                return [ amountOuts[0], amountOuts[2] ]
            }
            if (!nativeSwap) {
                throw new Error('missing param: nativeSwap')
            }

            const amountOuts = await aggregator.callStatic.swap(
                TOKENS.BNB,
                0,
                [{
                    router: getRouterContract(nativeSwap).address,
                    amount: 0,
                    path: [ TOKENS.WBNB, tokenIn ],
                }, {
                    router: getRouterContract(swap).address,
                    amount: 0,
                    path: [ tokenIn, ZERO_ADDRESS ],    // swap to tokenOut and send to msg.sender
                }],
                tokenOut,
                1,
                LARGE_VALUE,
                '0x1000000000000000000000000000000000000000000000000000000000000011',
                { from, value: amount },
            )
            console.error(swap, tokenName(tokenIn), tokenName(tokenOut), amountOuts.map(a => a.toString()))
            return [ amountOuts[1], amountOuts[3] ]
        } catch(err) {
            if (!err.reason || !err.reason.endsWith(': K')) {
                console.error(swap, tokenName(tokenIn), tokenName(tokenOut), err)
            }
            throw err
        }
    }

    async function getDeviation(states) {
        const changes = new Map()

        const pairs = new Set()
        await Bluebird.map(states.keys(), async (address) => {
            const state = await getState(address)
            // console.error({address, pair})
            if (!state) {
                return
            }
            const { token0, token1 } = state
            if (!token0 || !token1) {
                return
            }
            // console.error({token0, token1})

            const key = `${token0} ${token1}` 
            pairs.add(key)
        })

        await Bluebird.map(pairs.keys(), async key => {
            const [token0, token1] = key.split(' ')
            // console.error({token0, token1})

            const rs = await Bluebird.map(Object.keys(SERVICES), async swap => {
                const address = bscUtil.findPair(swap, token0, token1)
                const state = await getState(address)
                if (state) {
                    const { reserve0, reserve1 } = state
                    if (reserve0 && reserve1) {
                        return [ reserve0, reserve1, address ]
                    }
                }
            })
            .filter(r => !!r)

            const [s0, s1] = rs.reduce(([s0, s1], [r0, r1]) => {
                return [
                    s0.add(bn(r0)),
                    s1.add(bn(r1)),
                ]
            }, [bn(0), bn(0)])

            await Bluebird.map(rs, async ([r0, r1, address]) => {
                const state = await getState(address)
                // assert(!!state)
                const num = bn(r0).mul(s1)
                const denom = bn(r1).mul(s0)
                const direction = num.gt(denom)
                const deviation = direction ? num.sub(denom) : denom.sub(num)
                const dv = deviation.mul(bn(DV_PRECISION)).div(num).toNumber() / DV_PRECISION
                changes.set(address, {
                    dv,
                    direction,
                })
            })
        })

        console.log('states:', states.size, ' pairs:', pairs.size, ' changes:', changes.size)

        return changes
    }

    async function getRank(changes) {
        const toNativeSwap = new Map()
        await Bluebird.map(changes.keys(), async address => {
            const change = changes.get(address)
            const { dv } = change
            if (!dv || dv < DV_THRESHOLD) {
                // ignore pools with low rank
                return
            }
            console.error({address, dv})

            const state = await getState(address)
            if (!state) {
                return
            }
            const { rate01, rate10, token0, token1 } = state
            if (!rate01 || !rate10) {
                // setup to calculate the rates
                if (token0 && token0 != TOKENS.WBNB) {
                    toNativeSwap.set(token0, undefined)
                }
                if (token1 && token1 != TOKENS.WBNB) {
                    toNativeSwap.set(token1, undefined)
                }
            }
        })

        // setup to calculate the rates
        await Bluebird.map(Array.from(toNativeSwap.keys()), async token => {
            const swaps = await Bluebird.map(Object.keys(SERVICES), async swap => {
                const riro = await getPairReserves(swap, token, TOKENS.WBNB)
                if (!riro || !riro.length) return
                return {
                    swap,
                    r: bn(riro[0]),
                }
            }).filter(s => !!s)

            // console.error({swaps})

            const best = swaps.reduce(
                (best, {swap, r}) => r.gt(best.r) ? {swap, r} : best,
                {swap: undefined, r: bn(0)},
            )
            toNativeSwap.set(token, best.swap)
        })

        console.error({toNativeSwap})

        await Bluebird.map(changes.keys(), async address => {
            const change = changes.get(address)
            const { dv, direction } = change
            if (!dv || dv < DV_THRESHOLD) {
                // ignore pools with low rank
                delete change.dv
                delete change.direction
                return
            }
            const state = await getState(address)
            if (!state) {
                return
            }
            let { rate01, rate10 } = state
            if (!rate01 || !rate10) {
                // calculate the rates
                const { token0, token1, reserve0, reserve1, factory } = state
                const [[inF, outF], [inB, outB]] = await Bluebird.map([[token0, token1], [token1, token0]],
                    ([tokenIn, tokenOut]) => {
                        const nativeSwap = toNativeSwap.get(tokenIn)
                        if (!nativeSwap && tokenIn != TOKENS.WBNB) {
                            console.error('native swap missing', {address, state})
                            throw new Error('native swap missing')
                        }
                        const swap = getSwapFromFactory(factory)
                        return swapRate(nativeSwap, tokenIn, swap, tokenOut)
                    }
                )
                // console.error({inF, outF, inB, outB})
                // console.error(
                //     bn(RATE_PRECISION).mul(outF).div(inF).toNumber() / RATE_PRECISION,
                //     bn(RATE_PRECISION).mul(reserve1).div(reserve0).toNumber() / RATE_PRECISION,
                // )
                rate01 = outF.mul(reserve0).mul(RATE_PRECISION).div(inF).div(reserve1).toNumber() / RATE_PRECISION
                rate10 = outB.mul(reserve1).mul(RATE_PRECISION).div(inB).div(reserve0).toNumber() / RATE_PRECISION
                console.error({rate01, rate10})
                if (rate01 >= 1 || rate10 >= 1) {
                    console.error('UNEXPECTED RATE', {rate01, rate10})
                }
                change.rate01 = rate01
                change.rate10 = rate10
            }
            if (rate01 < RATE_THRESHOLD || rate10 < RATE_THRESHOLD) {
                var rank = null
                delete change.direction
            } else {
                var rank = dv * (direction ? rate01 : rate10)
                console.error({dv, direction, rate01, rate10, rank})
            }
            change.rank = rank
            delete change.dv
            changes.set(address, change)
        })

        return changes
    }

    async function updateRank(states) {
        const changes = await getDeviation(states)
        await getRank(changes)

        changes.forEach((change, address, changes) => {
            if (!Object.keys(change).length) {
                changes.delete(address)
            }
        })

        console.error({changes})

        await Bluebird.map(changes.entries(), ([address, value]) =>
            PairModel.updateOne({ address }, value, { upsert: true })
        )
    }

    return {
        updateRank,
        swapRate,
        getPairReserves,
        getAmountOut,
        findPath,
    }
}

exports.SERVICES = SERVICES
exports.createSwapContext = createSwapContext
