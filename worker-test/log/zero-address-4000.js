'use strict'

const {makeLog} = require('../lib')

let pairAddress = '0x0000000000000000000000000000000000000000'
let toBlockNumber = 4000
let topics = [
    '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'
]

module.exports = makeLog(pairAddress, toBlockNumber, topics)
