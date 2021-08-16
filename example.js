'use strict'

const { ethers } = require('ethers')
const {startWorker, createAccumulatorConsumer} = require('./index')
const { ZERO_HASH } = require('./helpers/constants').hexes
const contractABI = require('./ABIs/SFarm.json').abi

function createConsumer(config) {
    let key = 'consumer_1'
    let farm = '0x8141AA6e0f40602550b14bDDF1B28B2a0b4D9Ac6'
    let farmGenesis = '8967359'
    let SFarm = new ethers.Contract(farm, contractABI)

    return createAccumulatorConsumer({
        key: key,
        filter: SFarm.filters.AuthorizeAdmin(null, null),
        genesis: parseInt(farmGenesis),
        mongo: config.mongo,

        applyLogs: (value, logs) => {
            value = {...value}
            logs.forEach(log => {
                const address = ethers.utils.getAddress(
                    '0x'+log.topics[1].slice(26)
                )

                if (log.data != ZERO_HASH) {
                    value[address] = true
                } else {
                    delete value[address]
                }
            })

            return value
        }
    })
}

async function main() {
    await startWorker({
        createConsumerFunctions: [
            createConsumer
        ],
        mongoEndpoint: 'mongodb://localhost/bsc_data_1',
        bscEndpoint: 'https://bsc-dataseed.binance.org'
    })
}

main().catch(console.error)
