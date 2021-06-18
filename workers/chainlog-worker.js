'use strict'

const ioc = require('@trop/ioc')

require('dotenv').config()

const {
    ChunkSize,
    ConsumerLoader,
    EthersProvider,
    EthersLogProvider,
    Mongodb,
    HeadProcessor,
    PastProcessor,
    ChainlogWorker
} = require('../services')

async function main() {
    let config = new ioc.Config({
        mongodb_endpoint: process.env['MONGODB_URL'],
        eth_rpc_endpoint: process.env['RPC']
    })
    let container = await ioc.new_container(config, {
        'mongodb': Mongodb,
        'chunkSize': ChunkSize,
        'consumerLoader': ConsumerLoader,
        'ethersProvider': EthersProvider,
        'ethersLogProvider': EthersLogProvider,
        'headProcessor': HeadProcessor,
        'pastProcessor': PastProcessor,
        'chainlogWorker': ChainlogWorker
    })

    container.get('chainlogWorker')
        .start()
        .catch(err => {
            console.error(err)
            process.exit(1)
        })
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
