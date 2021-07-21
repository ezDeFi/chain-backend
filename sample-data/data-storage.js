'use strict'

const path = require('path')
const fs = require('fs')
const csvStringify = require('csv-stringify/lib/sync')
const csvParse = require('csv-parse/lib/sync')
const {toHeximal} = require('./number')

// Descriptions
//  * Write List of token pair state to a file `name` in directory `./data`.
//
// Input
//  * pairStates {Array<TokenPairState>}
function write(name, pairStates) {
    let filePath = path.join(write._DATA_DIR, name)
    let csvData = _stateListToCsv(pairStates)

    fs.writeFileSync(filePath, csvData)
}

// Descriptions
//  * Retrieve list of dataset's names that can be load by `read()`.
//
// Output {Array<String>}
function list() {
    return _list()
}

// Input
//  * name {String} Name of dataset that can be retrieve by `list()`.
//
// Output {Object}
//  * value.address {EthAddress} Address of token pair.
//  * value.reserve0 {HeximalString}
//  * value.reserve1 {HeximalString}
function read(name) {
    let filePath = _getDataFilePath(name)
    let fileData = fs.readFileSync(filePath)
    let rows = csvParse(fileData, {columns: true})
    let map = new Map(
        rows.map(row => [row.address, row])
    )

    return map
}

// {String}
write._DATA_DIR = path.join(__dirname, 'data')

// Descriptions
//  * Delete all data files from directory `./data`.
function clear() {
    let names = _list()

    for (let name of names) {
        let filePath = _getDataFilePath(name)

        fs.unlinkSync(filePath)
    }
}

// Input
//  * pairState {Array<TokenPairState>}
//
// Output {String} Data following CSV format as a string.
function _stateListToCsv(pairStates) {
    let rows = pairStates.map(state => {
        return [
            _removeHeximalPrefix(state.address),
            toHeximal(state.reserve0),
            toHeximal(state.reserve1),
        ]
    })
    
    rows.unshift(['address', 'reserve0', 'reserve1'])

    return csvStringify(rows)
}

// Descriptions
//  * Retrieve list of dataset's names.
//
// Output {Array<String>}
function _list() {
    let entries = fs.readdirSync(write._DATA_DIR, {
        withFileTypes: true
    })
    let fileEntries = entries.filter(entry => entry.isFile())
    let files = fileEntries.map(entry => entry.name)

    return files
}

// Input
//  * name {String} File name.
//
// Output {String} Absolute path to data file.
function _getDataFilePath(name) {
    return path.join(write._DATA_DIR, name)
}

// Input
//  * value {String} Heximal with or without prefix `0x`.
//
// Output {String} Heximal without prefix `0x`.
function _removeHeximalPrefix(value) {
    let prefix = value.slice(0, 2)

    if (prefix === '0x') {
        return value.slice(2)
    }
    else {
        return value
    }
}

module.exports = {
    clear,
    write,
    list,
    read
}
