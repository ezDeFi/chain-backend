const _ = require('lodash')
const { ethers } = require('ethers');
const { findPair } = require('bsc_util')
const ConfigModel = require("../models/ConfigModel");
const LogsStateModel = require("../models/LogsStateModel");
const { LARGE_VALUE, ZERO_ADDRESS } = require("../helpers/constants").hexes;
const mongoose = require("mongoose");
const Bluebird = require('bluebird');
mongoose.set("useFindAndModify", false);

const ROUTERS = {
    pancake2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    pancake: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    bakery: '0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F',
    jul: '0xbd67d157502A23309Db761c41965600c2Ec788b2',
    ape: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
}

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC)
const abiIERC20 = require('../ABIs/IERC20.json').abi;
const abiPair = require('../ABIs/UniswapV2Pair.json').abi;
const abiRouter = require('../ABIs/UniswapV2Router01.json').abi;
const abiSFarm = require('../ABIs/SFarm.json').abi;
const sfarmAddress = ethers.utils.getAddress(process.env.FARM)
const SFarm = new ethers.Contract(sfarmAddress, abiSFarm, provider)

exports.getTokens = () => {
    return LogsStateModel.findOne({ key: `sfarm-tokens` }).lean().then(m => m && m.value);
}

exports.withdrawChainCmds = async (token, amount, from, verify) => {
    token = ethers.utils.getAddress(token)
    if (from) {
        from = ethers.utils.getAddress(from)
    }
    amount = ethers.BigNumber.from(amount)

    const tokens = Object.entries(await exports.getTokens())
        .filter(([,level]) => level >= 2)
        .map(([token]) => token)
    
    if (!tokens.includes(token)) {
        return Promise.reject("Token not support");
    }

    if (process.env.DEBUG) console.debug({tokens})
    const pcFarmService = require('../services/pancakeStakingFarm');

    const cToken = new ethers.Contract(token, abiIERC20, provider)
    const tokenBalance = await cToken.callStatic.balanceOf(sfarmAddress)

    if (process.env.DEBUG) console.debug({tokenBalance: tokenBalance.toString(), amount: amount.toString()})

    if (tokenBalance.gte(amount)) {
        return Promise.reject("Already sufficient")
    }
    const amountNeeded = amount.sub(tokenBalance)

    if (process.env.DEBUG) console.debug({amountNeeded: amountNeeded.toString()})

    for (const t of tokens) {
        if (t == token) {
            continue
        }
        for (const dex in ROUTERS) {
            const pairAddress = findPair(dex, token, t)
            const pID = await pcFarmService.getPoolId(pairAddress)
            if (!pID) {
                continue
            }
            const pair = new ethers.Contract(pairAddress, abiPair, provider)
            // const cT = new ethers.Contract(t, abiIERC20, provider)
            
            // TODO: track totalSupply by watch Transfer from and to 0x0
            // TODO: track pair reserve0 and reserve1
            let [
                totalSupply,
                liquidityHave,
                tokenReserve,
            ] = await Bluebird.all([
                pair.callStatic.totalSupply(),
                pair.callStatic.balanceOf(sfarmAddress),
                cToken.callStatic.balanceOf(pairAddress),
            ])

            const liquidityNeed = amountNeeded.mul(totalSupply).mul(1000).div(995).div(tokenReserve)
            if (liquidityNeed.isZero()) {
                continue
            }
            if (process.env.DEBUG) console.debug({liquidityNeed: liquidityNeed.toString()})

            const rls = []

            const liquidityMissing = liquidityNeed.sub(liquidityHave)
            if (liquidityMissing.gt(0)) {
                if (process.env.DEBUG) console.debug({liquidityMissing: liquidityMissing.toString()})
                const userInfo = await pcFarmService.userInfo(pID, sfarmAddress)
                if (!userInfo) {
                    continue
                }
                const userLiquidity = userInfo.amount
                if (!userLiquidity.isZero()) {
                    if (process.env.DEBUG) console.debug({userLiquidity: userLiquidity.toString()})
                    if (liquidityMissing.lte(userLiquidity)) {
                        if (verify) {
                            await pcFarmService.contract.callStatic.withdraw(pID, liquidityMissing, { from: sfarmAddress })
                        }
                        const tx = await pcFarmService.contract.populateTransaction.withdraw(pID, liquidityMissing, { from: sfarmAddress })
                        rls.push({
                            receivingToken: ZERO_ADDRESS,
                            execs: [{
                                router: pcFarmService.contract.address,
                                input: tx.data,
                            }],
                        })
                        liquidityHave = liquidityHave.add(liquidityMissing)
                    }
                }
            }

            if (liquidityHave.isZero()) {
                continue    // no liquidity to withdraw
            }

            const router = new ethers.Contract(ROUTERS[dex], abiRouter, provider)

            if (verify && rls.length == 0) {
                await router.callStatic.removeLiquidity(token, t, liquidityNeed, 0, 0, sfarmAddress, LARGE_VALUE, { from: sfarmAddress })
            }
            const tx = await router.populateTransaction.removeLiquidity(token, t, liquidityNeed, 0, 0, sfarmAddress, LARGE_VALUE, { from: sfarmAddress })
            rls.push({
                receivingToken: token,
                execs: [{
                    router: router.address,
                    input: tx.data,
                }]
            })

            if (process.env.DEBUG) {
                console.debug({
                    t,
                    pairAddress,
                    pID,
                    totalSupply: totalSupply.toString(),
                    tokenReserve: tokenReserve.toString(),
                    pairAmountIn: liquidityNeed.toString(),
                    rls: rls.map(JSON.stringify),
                })
            }

            if (verify) {
                await SFarm.callStatic.withdraw(token, amount, rls, { from })
            }

            return rls
        }
    }

    if (verify) {
        await SFarm.callStatic.withdraw(token, amount, [], { from })
    }
    return []
}
