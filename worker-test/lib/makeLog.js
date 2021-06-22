'use strict'

const ethers = require('ethers')

function _makeBlock(
    blockNumber,
    pairAddress,
    topics=[]
){
    return {
        blockNumber: blockNumber,
        blockHash: _makeBlockHash(blockNumber),
        transactionIndex: 1,
        removed: false,
        address: pairAddress,
        data: _makeData(blockNumber),
        topics: topics,
        transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000001',
        logIndex: 1
    }
}

function _makeBlockHash(blockNumber) {
    return ethers.utils.keccak256(blockNumber)
}

function _makeData(blockNumber) {
    return blockNumber.toString()
}

function makeLog(
    pairAddress,
    toBlock,
    topics=[],
    fromBlock=0,
) {
    let logs = []

    for (let n = fromBlock; n <= toBlock; ++n) {
        logs.push(
            _makeBlock(n, pairAddress, topics)
        )
    }

    return logs
}

module.exports = makeLog
