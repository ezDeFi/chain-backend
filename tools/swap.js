require('dotenv').config()
const _ = require('lodash')
const { ZERO_ADDRESS, ZERO_HASH, ONE_HASH, TEN_HASH } = require('../helpers/constants').hexes
const Bluebird = require('bluebird')
const LogsStateModel = require('../models/LogsStateModel')
const ConfigModel = require('../models/ConfigModel')
const { JsonRpcProvider } = require('@ethersproject/providers')
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        swap({
            inputToken: TOKENS.USDT,
            outputToken: TOKENS.BTCB,
            amountIn: '100'+'0'.repeat(18),
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
    BUNNY: '0xC9849E6fdB743d08fAeE3E34dd2D1bc69EA11a51',
    FEG: '0x389999216860AB8E0175387A0c90E5c52522C945',
    DOT: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
}

const FACTORY = {
    pancake: '0xBCfCcbde45cE874adCB698cC183deBcF17952812',
    bakery: '0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7',
    pancake2: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    jul: '0x553990F2CBA90272390f62C5BDb1681fFc899675',
    ape: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
}

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

function getRouterContract(swap) {
    if (CONTRACTS[swap]) {
        return CONTRACTS[swap]
    }
    if (!ROUTERS[swap]) {
        console.warn(`WARN: no router address for ${swap}`)
        return
    }
    return CONTRACTS[swap] = new ethers.Contract(ROUTERS[swap], require('../ABIs/UniswapV2Router01.json').abi, provider)
}

function _getAmountOut(swap, amountIn, reserveIn, reserveOut) {
    if (!amountIn || amountIn.isZero()) {
        return 0
    }
    const fee10000 = FEE10000[swap]
    const amountInWithFee = bn.from(10000).sub(fee10000).mul(amountIn)
    const numerator = amountInWithFee.mul(reserveOut)
    const denominator = bn.from(reserveIn).mul(10000).add(amountInWithFee)
    const amountOut = numerator.div(denominator)
    // const contract = getRouterContract(swap)
    // if (contract) {
    //     const contractOut = await contract.callStatic.getAmountOut(amountIn, reserveIn, reserveOut)
    //     if (!amountOut.eq(contractOut)) {
    //         console.error('getAmountOut: WRONG calculation', {swap, fee10000, amountOut: amountOut.toString(), contractOut: contractOut.toString()})
    //     }
    // }
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

async function swap({ inputToken, outputToken, amountIn }) {
    try {
        const reserves = await LogsStateModel.findOne(({ key: `pair-Sync`})).lean().then(m => m && m.value)

        const cachePairs = {}
        async function findPair(swap, inputToken, outputToken) {
            const keyF = `${swap}-PairCreated-${inputToken}-${outputToken}`
            if (cachePairs[keyF]) {
                return { pair: cachePairs[keyF] }
            }
            const keyB = `${swap}-PairCreated-${outputToken}-${inputToken}`
            if (cachePairs[keyB]) {
                return { pair: cachePairs[keyB], backward: true }
            }
            const object = await ConfigModel.findOne(({ key: { $in: [ keyF, keyB ] } })).lean()
            if (object) {
                cachePairs[object.key] = object.value
                return { pair: object.value, backward: object.key == keyB }
            }
            return {}
        }

        function getReserves(pair, backward) {
            const reserve = reserves[pair]
            if (!reserve) {
                return []
            }
            const [ r0, r1 ] = reserve.split('/').map(r => bn.from('0x'+r))
            return backward ? [ r1, r0 ] : [ r0, r1 ]
        }

        async function getAmountOut(swap, inputToken, outputToken, amountIn) {
            if (!ROUTERS.hasOwnProperty(swap)) {
                return 0
            }
            const { pair, backward } = await findPair(swap, inputToken, outputToken)
            const [ rin, rout ] = getReserves(pair, backward)
            if (!rin || !rout) {
                return 0
            }
            const amountOut = _getAmountOut(swap, amountIn, rin, rout)
            const slippage = amountOut.mul(rin).mul(100).div(amountIn).div(rout)
            if (slippage < 80) {
                return 0    // SLIPPAGE
            }
            return amountOut
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

        const DEXES = [
            { swap: 'pancake' },
            { swap: 'pancake', mid: TOKENS.WBNB },
            { swap: 'pancake', mid: TOKENS.CAKE },
            { swap: 'pancake', mid: TOKENS.BUSD },
            { swap: 'pancake', mid: TOKENS.USDT },
            { swap: 'bakery' },
            { swap: 'bakery', mid: TOKENS.WBNB },
            { swap: 'bakery', mid: TOKENS.BUSD },
            { swap: 'pancake2' },
            { swap: 'pancake2', mid: TOKENS.WBNB },
            { swap: 'pancake2', mid: TOKENS.CAKE },
            { swap: 'pancake2', mid: TOKENS.BUSD },
            { swap: 'pancake2', mid: TOKENS.USDT },
            { swap: 'jul' },
            { swap: 'jul', mid: TOKENS.WBNB },
            { swap: 'ape' },
            { swap: 'ape', mid: TOKENS.WBNB },
            { swap: 'ape', mid: TOKENS.BUSD },
        ]

        async function getRouteAmountOuts(inputToken, outputToken, amountIn) {
            return Bluebird.map(DEXES, async ({swap, mid}) => {
                if (mid) {
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
                return { swap, path, amountOut }
            })
        }

        async function getBestDistribution(inputToken, outputToken, amountIn, chunks) {
            const outs = await getRouteAmountOuts(inputToken, outputToken, amountIn.div(chunks))
            // console.error(outs.map(out => out && out.amountOut.toString()))

            chunks = chunks || 1
            const sorted = outs.filter(a => !!a).sort((b, a) => {
                if (a.amountOut.gt(b.amountOut)) {
                    return 1
                }
                if (a.amountOut.lt(b.amountOut)) {
                    return -1
                }
                return 0
            })
            const bests = sorted.slice(0, chunks)
            // console.error({sorted, bests})

            const distribution = outs.map(out => {
                if (!out) return '00'
                if (!bests.some(best => best.swap == out.swap && JSON.stringify(best.path) == JSON.stringify(out.path))) {
                    return '00'
                }
                return '01'
            })
            const amountOut = outs.reduce((amountOut, out) => {
                if (!out) return amountOut
                if (!bests.some(best => best.swap == out.swap && JSON.stringify(best.path) == JSON.stringify(out.path))) {
                    return amountOut
                }
                return out.amountOut.add(amountOut)
            }, bn.from(0))

            // console.error({ amountOut: amountOut.toString(), distribution })
            return [ amountOut, distribution ]
        }

        const MIDS = Object.values(TOKENS)
        const MULTI_MIDS = [ [], ...MIDS.map(m => [m]) ]
        for (let i = 0; i < MIDS.length; ++i) {
            for (let j = 0; j < MIDS.length; ++j) {
                if (i != j) {
                    MULTI_MIDS.push([MIDS[i], MIDS[j]])
                }
            }
        }
        // for (let i = 0; i < MIDS.length; ++i) {
        //     for (let j = 0; j < MIDS.length; ++j) {
        //         if (i == j) continue
        //         for (let k = 0; k < MIDS.length; ++k) {
        //             if (k != i && k != j) {
        //                 MULTI_MIDS.push([MIDS[i], MIDS[j], MIDS[k]])
        //             }
        //         }
        //     }
        // }
        // console.error({MULTI_MIDS})

        const best = {
            amountOut: 0,
            distribution: [],
            tokens: [],
        }

        for (const mids of MULTI_MIDS) {
            const tokens = _.flatten([inputToken, mids, outputToken])
                .filter((t, i, tokens) => t != tokens[i-1] != t)    // remove adjenced duplicates

            let amountOut = bn.from(amountIn)
            let distribution = new Array(DEXES.length).fill('')
            for (let i = 1; i < tokens.length; ++i) {
                [ amountOut, dist ] = await getBestDistribution(tokens[i-1], tokens[i], amountOut, 1)
                for (let j = 0; j < distribution.length; ++j) {
                    distribution[j] = dist[j] + distribution[j]
                }
            }
            // console.error({amountOut, distribution, tokens})
            if (amountOut.gt(best.amountOut)) {
                // console.error(amountOut.toString())
                best.amountOut = amountOut
                best.distribution = distribution.map(d => '0x'+d)
                best.tokens = tokens
            }
        }

        const flag = 0x0 // 0x40000
        const flags = new Array(best.tokens.length).fill(flag)
        const trader = '0xC06F7cF8C9e8a8D39b0dF5A105d66127912Bc980'

        console.error({...best, amountOut: best.amountOut.toString(), flags})

        const { data } = await CONTRACTS.swapX.populateTransaction.swapMulti(
            best.tokens,
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
                gasLimit: 1234000,
                from: trader,
            }
        ]

        try {
            const returnAmount = await CONTRACTS.swapXProxy.callStatic.swap(...params)
            console.error('returnAmount', returnAmount.toString())
            const gas = await CONTRACTS.swapXProxy.estimateGas.swap(...params)
            console.error('estimatedGas', gas.toString())
        } catch (err) {
            console.error('Error', err.reason || err)
            // await getRouteAmountOuts(inputToken, outputToken, amountIn, true)
        }
    } catch (err) {
        console.error(err)
    }
}
