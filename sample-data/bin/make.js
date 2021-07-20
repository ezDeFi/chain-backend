'use strict'

const configLoader = require('../config-loader')
const make = require('../make')
const dataStorage = require('../data-storage')

function main() {    
    dataStorage.clear()
    console.log('clean all data files!')

    for (let configIndex = 0;; ++configIndex) {
        let config = configLoader.next()

        if (!config) {
            break
        }

        let listOfTokenPairStateList = make(config)

        for (let [index, stateList] of listOfTokenPairStateList.entries()) {
            let name = _getDataSetName(configIndex, index)

            dataStorage.write(name, stateList)
            console.log('make', name)
        }
    }

    console.log('finished!')
}

function _getDataSetName(configIndex, stateListIndex) {
    return 'data-' + configIndex + '-' + stateListIndex
}

main()
