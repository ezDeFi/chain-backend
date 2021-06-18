'use strict'

const { JsonRpcProvider } = require('@ethersproject/providers')

class EthersProvider {
    constructor(get) {
        this._provider = new JsonRpcProvider({
            timeout: 3000,
            url: get('config').eth_rpc_endpoint
        })
    }

    async open() {}

    async close() {}

    // Output {ethers.providers.JsonRpcProvider}
    get native() {
        return this._provider
    }
}

module.exports = EthersProvider
