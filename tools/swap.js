require('dotenv').config()
const _ = require('lodash')
const { ZERO_ADDRESS, ZERO_HASH, ONE_HASH, TEN_HASH } = require('../helpers/constants').hexes
const Bluebird = require('bluebird')
const LogsStateModel = require('../models/LogsStateModel')
const ConfigModel = require('../models/ConfigModel')
const UniswapV2Router01 = require('../ABIs/UniswapV2Router01.json').abi
const UniswapV2Pair = require('../ABIs/UniswapV2Pair.json').abi
const { JsonRpcProvider } = require('@ethersproject/providers')
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        swap({
            inputToken: TOKENS.USDT,
            outputToken: TOKENS.CAKE,
            amountIn: '100'+'0'.repeat(18),
            trader: '0xC06F7cF8C9e8a8D39b0dF5A105d66127912Bc980',
            maxMids: 1,
        })
            .then(() => process.exit(0))
            .catch(err => {
                console.error("Execution error:", err.message);
                process.exit(1);
            });
    })
    .catch(err => {
        console.error("App starting error:", err.message);
        process.exit(1);
    });

const { ethers } = require('ethers')
const bn = ethers.BigNumber

const provider = new JsonRpcProvider({
	// timeout: 3000,
	url: process.env.RPC,
})

const TOKENS = {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    BSCX: '0x5Ac52EE5b2a633895292Ff6d8A89bB9190451587',

    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    DOT: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
}

const MIDS = Object.values(TOKENS)
const MULTI_MIDS = [ [[]], Object.values(TOKENS), [], [] ]
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

const CHUNK_TOTAL = 18*12

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

const DEXES_PRIORITY = [ 0, 5, 8, 1, 6, 9, 2, 10, 3, 7, 11, 4, 12, 13, 15, 14, 16, 17 ]

const CONTRACTS = {
    swapXView: new ethers.Contract('0x99Ab3d8DC4F2130F4E542506A0E9e87bA9ed7d7b', require('../ABIs/SwapXView.abi.json'), provider),
    swapX: new ethers.Contract('0xAAa6866475564E9070d0330DFCC637D16dfccE17', require('../ABIs/SwapX.abi.json'), provider),
    swapXProxy: new ethers.Contract('0x887907d19360b32744A56B931a022530567Fbcb3', require('../ABIs/SwapXProxy.abi.json'), provider),
}

const ROUTERS = {
    pancake: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    bakery: '0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F',
    pancake2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    // jul: '0xbd67d157502A23309Db761c41965600c2Ec788b2',
    // ape: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
}

const sum = (chunks) => chunks.reduce((sum, a) => sum + a, 0)
const count = (chunks) => chunks.reduce((count, chunk) => count + chunk ? 1 : 0, 0)

function tokenName(address) {
    const mid = Object.entries(TOKENS).find(([, a]) => a == address)
    if (mid) {
        return mid[0]
    }
}

function getRouterContract(swap) {
    if (CONTRACTS[swap]) {
        return CONTRACTS[swap]
    }
    if (!ROUTERS[swap]) {
        console.warn(`WARN: no router address for ${swap}`)
        return
    }
    return CONTRACTS[swap] = new ethers.Contract(ROUTERS[swap], UniswapV2Router01, provider)
}

async function _getAmountOut(swap, amountIn, reserveIn, reserveOut) {
    if (!amountIn || amountIn.isZero()) {
        return 0
    }
    const fee10000 = FEE10000[swap]
    const amountInWithFee = bn.from(10000).sub(fee10000).mul(amountIn)
    const numerator = amountInWithFee.mul(reserveOut)
    const denominator = bn.from(reserveIn).mul(10000).add(amountInWithFee)
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

const FEE10000 = { pancake2: 25, pancake: 20, bakery: 30, ape: 20, jul: 30 }

async function getFee10000(swap) {
    if (FEE10000[swap]) {
        return FEE10000[swap]
    }
    const key = `router-fee-${swap}`
    const savedValue = await ConfigModel.findOne({ key }).lean().then(m => m && m.value)
    if (savedValue) {
        return FEE10000[swap] = savedValue
    }
    const contract = getRouterContract(swap)
    const ret = await contract.callStatic.getAmountOut(100000, '1'+'0'.repeat(32), '1'+'0'.repeat(32))
    const value = Math.round(10000 - ret.toNumber() / 10)
    await ConfigModel.updateOne(
        { key },
        { value },
        { upsert: true },
    )
    return FEE10000[swap] = value
}

function bnDiv(a, b) {
    while(true) {
        try {
            return a.toNumber() / b.toNumber()
        } catch(err) {
            a = a.div(2)
            b = b.div(2)
        }
    }
}

function predictGas(hops) {
    return 130000 + hopsGas(hops)
}

function hopsGas(hops) {
    return hops * 120000
}

async function swap({ inputToken, outputToken, amountIn, trader, maxMids, gasPrice, gasToken }) {
    trader = trader || ZERO_ADDRESS
    maxMids = maxMids == null ? 3 : maxMids
    gasPrice = bn.from(gasPrice || '5'+'0'.repeat(9))
    gasToken = gasToken || TOKENS.WBNB

    const cachePairs = {}
    async function findPair(swap, inputToken, outputToken) {
        const keyF = `${swap}-PairCreated-${inputToken}-${outputToken}`
        if (cachePairs[keyF]) {
            return { address: cachePairs[keyF] }
        }
        const keyB = `${swap}-PairCreated-${outputToken}-${inputToken}`
        if (cachePairs[keyB]) {
            return { address: cachePairs[keyB], backward: true }
        }
        const object = await ConfigModel.findOne(({ key: { $in: [ keyF, keyB ] } })).lean()
        if (object) {
            cachePairs[object.key] = object.value
            return { address: object.value, backward: object.key == keyB }
        }
        return {}
    }

    const cacheReserves = {}
    async function getReserves(swap, inputToken, outputToken) {
        const { address, backward } = await findPair(swap, inputToken, outputToken)
        if (cacheReserves[address]) {
            const [ r0, r1 ] = cacheReserves[address]
            return backward ? [ r1, r0 ] : [ r0, r1 ]
        }
        const key = `pair-Sync-${address}`
        const reserve = await ConfigModel.findOne(({ key })).lean().then(m => m && m.value)
        if (!reserve) {
            cacheReserves[address] = []
            return []
        }
        const [ r0, r1 ] = reserve.split('/').map(r => bn.from('0x'+r))

        if (process.env.DEBUG) {
            const contract = new ethers.Contract(address, UniswapV2Pair, provider)
            if (contract) {
                const { _reserve0, _reserve1 } = await contract.callStatic.getReserves()
                const a = r0.mul(_reserve1)
                const b = r1.mul(_reserve0)
                const acc = a.mul(1000).div(b).sub(1000).toNumber()/10
                if (acc < -0.1 || acc > 0.1) {
                    console.error(`Reserve accurracy: ${acc}% ${swap} ${inputToken} ${outputToken}`)
                }
            }
        }

        cacheReserves[address] = [ r0, r1 ]
        return backward ? [ r1, r0 ] : [ r0, r1 ]
    }

    async function getAmountOut(swap, inputToken, outputToken, amountIn) {
        if (!ROUTERS.hasOwnProperty(swap)) {
            return 0
        }
        const [ rin, rout ] = await getReserves(swap, inputToken, outputToken)
        if (!rin || !rout) {
            return 0
        }
        const amountOut = await _getAmountOut(swap, amountIn, rin, rout)
        const slippage = amountOut.mul(rin).mul(100).div(amountIn).div(rout)
        if (slippage < 80) {
            return 0    // SLIPPAGE
        }
        return amountOut
    }

    let _cacheGasRoute
    async function getGasAsToken(token, wei) {
        if (_cacheGasRoute) {
            const { swap, path } = _cacheGasRoute
            const amountOut = await getRouteAmountOut(swap, path, wei)
            if (amountOut && !amountOut.isZero()) {
                return amountOut
            }
        }
        for (const mids of MULTI_MIDS) {
            for (const mid of mids) {
                const path = [ gasToken, ...mid, token ]
                for (const swap in ROUTERS) {
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
        return Bluebird.map(DEXES, async ({swap, mid}, i, n) => {
            if (!chunks[i]) return
            const amountIn = amount.mul(chunks[i]).div(CHUNK_TOTAL)
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
    console.error({midFee: midFee.toString()})

    async function getBestDistribution(inputToken, outputToken, amountIn) {
        function setChunk(chunks, index, value) {
            chunks = [...chunks]
            chunks[index] = value
            const before = sum(chunks) - chunks[index]
            if (!before) {
                return
            }
            const after = CHUNK_TOTAL - chunks[index]
            for (let i = 0; i < chunks.length; ++i) {
                if (i == index) continue
                chunks[i] = Math.floor(chunks[i] * after / before)
            }
            let remain = CHUNK_TOTAL - sum(chunks)
            for (let i = 0; i < DEXES.length && remain > 0; ++i) {
                const pi = DEXES_PRIORITY[i]
                if (pi != index && chunks[pi]) {
                    ++chunks[pi]
                    --remain
                }
            }
            if (CHUNK_TOTAL != sum(chunks)) {
                console.error("CHUNK_TOTAL != sum(chunks)", chunks, index, value)
                throw "CHUNK_TOTAL != sum(chunks)"
            }
            return chunks
        }

        function reduceChunk(chunks, index) {
            return setChunk(chunks, index, chunks[index] >> 1)
        }

        function amountOutSubFee(out) {
            return out.mid ? out.amountOut.sub(midFee) : out.amountOut
        }

        function sumOut(outs) {
            return outs.reduce((total, out) => {
                if (!out || !out.amountOut || out.amountOut.isZero()) {
                    return total
                }
                return total.add(out.amountOut)
            }, bn.from(0))
        }

        function sumOutSubFee(outs) {
            return outs.reduce((total, out) => {
                if (!out || !out.amountOut || out.amountOut.isZero()) {
                    return total
                }
                return total.add(amountOutSubFee(out))
            }, bn.from(0))
        }

        function leastIndex(outs) {
            return outs.reduce((least, out) => {
                if (!out || !out.amountOut || out.amountOut.isZero()) {
                    return least
                }
                const a = amountOutSubFee(out)
                return a < least ? a : least
            }, bn.from(0))
        }

        let chunks = new Array(DEXES.length).fill(Math.floor(CHUNK_TOTAL/DEXES.length))
        setChunk(chunks, chunks.length-1, chunks[chunks.length-1])
        let outs
        let amountOut

        for (let i = 0; i < 100; ++i) {
            let matrix = [ chunks ]
            for (let j in chunks) {
                if (chunks[j]) {
                    matrix.push(setChunk(chunks, j, 0), reduceChunk(chunks, j))
                }
            }
            matrix = matrix.filter(m => m)

            const matrixOuts = await Bluebird.map(matrix, chunks => getRouteAmountOuts(inputToken, outputToken, amountIn, chunks))
            // const matrixSumOut = matrixOuts.map(outs => sumOut(outs))
            const matrixSumOutSubFee = matrixOuts.map(outs => sumOutSubFee(outs))
            // console.error(matrixSumOutSubFee.map(s => s.toString()))

            const bestIndex = matrixSumOutSubFee.reduce((bestIndex, v, i) => v.gt(matrixSumOutSubFee[bestIndex]) ? i : bestIndex, 0)
            if (bestIndex == 0) {
                // console.error(matrix, matrixSumOutSubFee.map(s => s.toString()), matrixSumOutSubFee.map(s => s.toString()))
                amountOut = sumOut(matrixOuts[bestIndex])
                outs = matrixOuts[bestIndex]
                break
            }
            // console.error(bestIndex, matrixSumOutSubFee[bestIndex].toString(), matrixSumOutSubFee[0].toString())
            chunks = matrix[bestIndex]
            console.error(chunks)

            // console.error(outs.map(out => out && out.amountOut.toString()))
        }

        // console.error(chunks, outs.filter(out => out))
        return [ amountOut, chunks, outs.filter(out => out) ]
    }

    for (let nom = 0; nom <= (maxMids||3); ++nom) {
        await findBest(nom)
        return
    }

    async function findBest(nom) {
        const best = {
            amount: 0,
            distribution: [],
            path: [],
            pathRoutes: [],
        }

        for (const mids of MULTI_MIDS[nom]) {
            const tokens = _.flatten([inputToken, mids, outputToken])
                .filter((t, i, tokens) => t != tokens[i-1] != t)    // remove adjenced duplicates

            let pathAmountOut = bn.from(amountIn)
            const distribution = new Array(DEXES.length).fill('')
            const dexes = []
            for (let i = 1; i < tokens.length; ++i) {
                const [ amountOut, dist, routes ] = await getBestDistribution(tokens[i-1], tokens[i], pathAmountOut)

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
                best.distribution = distribution.map(d => '0x'+d)
                best.path = tokens
                best.pathRoutes = dexes
            }
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

        console.error('=========', {nom, hops, predictedGas})
        console.error(routeList)
        console.error('amountOut', best.amount.toString(), '-', fee.toString(), '=', best.amount.sub(fee).toString())

        const flag = 0x0 // 0x40000
        const flags = new Array(best.path.length-1).fill(flag)

        const { data } = await CONTRACTS.swapX.populateTransaction.swapMulti(
            best.path,
            amountIn,
            0,
            best.distribution,
            flags,
            trader,
        )

        const params = [
            inputToken,
            outputToken,
            trader,
            amountIn,
            1,
            trader,
            data,
            {
                gasLimit: predictedGas * 2,
                from: trader,
            }
        ]

        try {
            const returnAmount = await CONTRACTS.swapXProxy.callStatic.swap(...params)
            console.error('returnAmount', returnAmount.toString())
            const accuracy = returnAmount.mul(10000).div(best.amount).toNumber() / 100
            console.error(`accuracy ${accuracy}%`)
            const gas = await CONTRACTS.swapXProxy.estimateGas.swap(...params)
            console.error('estimatedGas', gas.toString(), `= ${gas.mul(10000).div(predictedGas).toNumber()/100}%`)
        } catch (err) {
            console.error('Error', err.reason || err)
            // await getRouteAmountOuts(inputToken, outputToken, amountIn, true)
        }
    }
}
