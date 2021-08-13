const path = require("path")
const fs = require('fs')
const {startWorker} = require('../index')

function _loadConsumerFactories() {
    let consumerDir = path.join(__dirname, 'consumers')
    let files = fs.readdirSync(consumerDir)
    let consumerFiles = files.filter(file => {
        return /^sfarm-admins.js$/.test(file)
    })
    let factories = consumerFiles.map(file => {
        let filePath = path.join(consumerDir, file)
        let key = path.basename(filePath, '.js')
        let {createConsumerFactory} = require(filePath)

        return createConsumerFactory({
            key: key,
            farm: '0x8141AA6e0f40602550b14bDDF1B28B2a0b4D9Ac6',
            farmGenesis: '8967359'
        })
    })

    return factories
}

async function main() {
    await startWorker({
        consumerFactories: _loadConsumerFactories(),
        mongoEndpoint: 'mongodb://localhost/sfarm',
        bscEndpoint: 'https://bsc-dedicated-a29k3di6gz293snk.ezdefi.com'
    })
}

main().catch(console.error)
