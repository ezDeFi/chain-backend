require('dotenv').config()
const Bluebird = require('bluebird')
const { TOKENS } = require('../helpers/constants').bsc
const swapx = require('../services/swapx')
const stopwatch = require('../helpers/stopwatch')
const { ethers } = require('ethers')
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

const { JsonRpcProvider } = require('@ethersproject/providers')
provider = new JsonRpcProvider({
    timeout: 3000,
    url: process.env.RPC,
})

const CONTRACTS = {
    swapXView: new ethers.Contract('0x99Ab3d8DC4F2130F4E542506A0E9e87bA9ed7d7b', require('../ABIs/SwapXView.abi.json'), provider),
    swapX: new ethers.Contract('0xAAa6866475564E9070d0330DFCC637D16dfccE17', require('../ABIs/SwapX.abi.json'), provider),
    swapXProxy: new ethers.Contract('0x887907d19360b32744A56B931a022530567Fbcb3', require('../ABIs/SwapXProxy.abi.json'), provider),
}

function displayExecutionTime() {
    let databaseTime = stopwatch.timelapse('database')
    let findPathTime = stopwatch.timelapse('findPath')
    let databaseTimeRatio = databaseTime * 100 / findPathTime

    console.log(`Database time: ${databaseTimeRatio.toFixed(2)}% ${databaseTime} miliseconds`)
    console.log(`findPath time: ${findPathTime} miliseconds`)
}

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const inputToken = TOKENS.USDT
        const outputToken = TOKENS.CAKE
        const amountIn = '100'+'0'.repeat(18)
        const trader = '0xC06F7cF8C9e8a8D39b0dF5A105d66127912Bc980'
        const noms = process.env.NOMS ? process.env.NOMS.split(',').map(n => parseInt(n)) : [0, 1]

        const routes = await stopwatch.watch(
            swapx.findPath({
                inputToken,
                outputToken,
                amountIn,
                trader,
                noms,
            }),
            'findPath'
        )

        if (!process.env.VERIFY) {
            return
        }

        console.log('-------- VERIFING --------')

        const results = await Bluebird.map(routes, async route => {
            const { tokens, distribution, amountOut, estimatedGas } = route

            const flag = 0x0 // 0x40000
            const flags = new Array(tokens.length-1).fill(flag)
    
            const { data } = await CONTRACTS.swapX.populateTransaction.swapMulti(
                tokens,
                amountIn,
                0,
                distribution,
                flags,
                trader,
            )
    
            const params = [
                tokens[0],
                tokens[tokens.length-1],
                trader,
                amountIn,
                1,
                trader,
                data,
                {
                    gasLimit: estimatedGas * 2,
                    from: trader,
                }
            ]

            try {
                const returnAmount = await CONTRACTS.swapXProxy.callStatic.swap(...params)
                const accuracy = returnAmount.mul(10000).div(amountOut).toNumber() / 100
                const gas = await CONTRACTS.swapXProxy.estimateGas.swap(...params)

                return {
                    ...route,
                    returnAmount,
                    accuracy,
                    gas,
                }
            } catch(err) {
                console.error(err.reason || err)
            }
        })

        results.filter(r => r).map(({returnAmount, accuracy, gas, estimatedGas}) => {
            console.log('returnAmount', returnAmount.toString())
            console.log(`accuracy ${accuracy}%`)
            console.log('estimatedGas', gas.toString(), `= ${gas.mul(10000).div(estimatedGas).toNumber()/100}%`)
        })
    })
    .then(() => {
        if (process.env.DATABASE_TIME) {
            displayExecutionTime()
        }

        process.exit(0);
    })
    .catch(err => {
        console.error("App starting error:", err);
        process.exit(1);
    });
