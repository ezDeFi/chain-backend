'use strict'

const dataStorage = require('./data-storage')

module.exports = {
    listPairStateMap: dataStorage.list,
    readPairStateMap: dataStorage.read
}
