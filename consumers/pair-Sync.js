const _ = require('lodash');
const { ethers } = require('ethers')
const contractABI = require('../ABIs/UniswapV2Pair.json').abi
const update = require('./factory/update')
const { ZERO_ADDRESS } = require('../helpers/constants').hexes
const { TOKENS } = require('../helpers/constants').bsc
const PairModel = require('../models/PairModel')
const Bluebird = require('bluebird')
const { SERVICES, createSwapContext } = require('../services/swapx')
const bn = ethers.BigNumber.from
const bscUtil = require('bsc_util')

module.exports = (key) => {
    // reset the state
    // require('../models/LogsStateModel').deleteOne({ key }).then(console.error).catch(console.error)
    // PairModel.deleteMany({}).then(console.error).catch(console.error)

    const pair = new ethers.Contract(ZERO_ADDRESS, contractABI)
    const filter = pair.filters.Sync(null, null)
    delete filter.address

    return update({
        key,
        filter,

        applyLogs: async (value, logs) => {
            if (!logs.length) {
                return value
            }

            const changes = new Map()

            logs.forEach(log => {
                const { address, data } = log
                const x = data.substr(2, 64).replace(/^0+/, '');
                const y = data.substr(66).replace(/^0+/, '');
                const reserve0 = '0x'+x
                const reserve1 = '0x'+y
                changes.set(address, { reserve0, reserve1 })
            })

            // console.error({changes})

            const cacheState = new Map()
            async function getState(address) {
                if (cacheState.has(address)) {
                    return cacheState.get(address)
                }
                const value = await PairModel.findOne({ address }).lean()
                if (!value) {
                    return
                }
                if (changes.has(address)) {
                    const { reserve0, reserve1 } = changes.get(address)
                    value.reserve0 = reserve0
                    value.reserve1 = reserve1
                }
                cacheState.set(address, value)
                return value
            }

            const context = createSwapContext({ getState })

            await Bluebird.map(Array.from(changes.keys()), async (address) => {
                const pair = await getState(address)
                // console.error({address, pair})
                if (!pair) {
                    return
                }
                const { token0, token1 } = pair
                if (!token0 || !token1) {
                    return
                }
                // console.error({token0, token1})

                const rs = await Bluebird
                    .map(Object.keys(SERVICES), async swap => {
                        const address = bscUtil.findPair(swap, token0, token1)
                        const pair = await getState(address)
                        if (pair && pair.reserve0 && pair.reserve1) {
                            // console.error({address, pair})
                            return [ address, pair.reserve0, pair.reserve1 ]
                        }
                    })
                    .filter(r => !!r)
                
                // console.error({rs})

                if (!rs.length) {
                    if (!changes.delete(address)) {
                        console.error('Failed to ingore uninterested pair reserves', address)
                    }
                    return
                }

                if (rs.length == 1) {
                    const [address] = rs[0]
                    const pair = changes.get(address) || {}
                    pair.rank = null
                    pair.liquidity = null
                    changes.set(address, pair)
                    return
                }

                const lqs = await Bluebird
                    .map([[token0, pair.reserve0], [token1, pair.reserve1]], ([token, r]) => {
                        return Bluebird.map(Object.keys(SERVICES), async swap => {
                            if (token == TOKENS.WBNB) return
                            const riro = await context.getPairReserves(swap, token, TOKENS.WBNB)
                            if (!riro || !riro.length) return
                            const [ri, ro] = riro
                            return {
                                swap,
                                token,
                                amount: bn(r).mul(bn(ro)).div(bn(ri)),
                            }
                        })
                    })
                    .then(_.flatten)
                    .filter(lq => !!lq)

                if (lqs && lqs.length) {
                    // console.error(lqs.map(lq => ({...lq, amount: lq.amount.toString()})))
                    const avg = lqs.reduce((sum, lq) => sum.add(lq.amount), bn(0)).div(bn(lqs.length))
                    // console.error(address, lqs.length, avg.toString())
                    pair.liquidity = avg.toString()
                } else {
                    pair.liquidity = null
                }
                changes.set(address, pair)

                const [s0, s1] = rs.reduce(([s0, s1], [, r0, r1]) => {
                    return [
                        s0.add(bn(r0)),
                        s1.add(bn(r1)),
                    ]
                }, [bn(0), bn(0)])

                // console.error(s0.toString(), s1.toString(), rs)

                return Bluebird.map(rs, ([address, r0, r1]) => {
                    // console.error({address, r0, r1})
                    const num = bn(r0).mul(s1)
                    const denom = bn(r1).mul(s0)
                    const delta = num.gt(denom) ? num.sub(denom) : denom.sub(num)
                    const value = changes.get(address) || {}
                    value.rank = delta.isZero() ? null : num.mul(bn(1000000)).div(delta).toNumber()
                    // console.error({address, value})
                    changes.set(address, value)
                })

                // console.error(num.toString(), denom.toString(), delta.toString(), rank.toString())

                // console.error({rs, s0: s0.toString(), s1: s1.toString()})
            })

            // console.error({changes})

            await Bluebird.map(changes.entries(),
                ([address, value]) => PairModel.updateOne({ address }, value, { upsert: true })
            )

            return value || true
        }
    })
}
