'use strict'

const path = require('path')

const TOKEN_PAIR_ADDRESSES = []

// Desciptions
//  * Generate many token pair state set then write to files.
//
// Input
//  * directory {String} Where to put data files.
//  * count {Number} Number of token pair state set.
function generateData(directory, count=1) {
    for (let i = 1; i <= count; ++i) {
        let dataFilePath = _getDataFilePath(directory, i)

        _generateTokenPairStateSet(dataFilePath)
    }
}

function _getDataFilePath(directory, index) {
    let postfix = '-' + index.toString().padBegin(3, '0')

    return path.join(directory, postfix)
}

// Input
//  * dataFile {String} Generated data will be put into this file.
function _generateTokenPairStateSet(dataFile) {
    let pairs = []

    for (let address of TOKEN_PAIR_ADDRESSES) {
        let reserves = _generateTokenPairReserves(address)
        let pair = {address, reserves}

        pairs.push(pair)
    }

    _writeTokenPairStateSet(dataFile, pairs)
}

// Input
//  * pair {EthAddress} Address of token pair.
//
// Output {TokenPairReserves}
function _generateTokenPairReserves(address) {
    
}

// Input
//  * dataFile {String}
//  * pairs {Array<TokenPair>}
function _writeTokenPairStateSet(dataFile, pairs) {
    
}

module.exports = generateData
