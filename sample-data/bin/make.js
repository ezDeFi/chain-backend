'use strict'

const configLoader = require('../config-loader')
const make = require('../make')
const dataStorage = require('../data-storage')

function main() {    
    console.log('clean all data files...')
    dataStorage.clear()
    console.log('clean all data files: ok')

    for (let configIndex = 0;; ++configIndex) {
        let config = configLoader.next()

        if (!config) {
            break
        }

        console.log('make following configuration', configIndex + 1, '...')
        let listOfTokenPairStateList = make(config)
        console.log('make following configuration', configIndex + 1, 'done')

        for (let [index, stateList] of listOfTokenPairStateList.entries()) {
            let name = _getDataSetName(configIndex + 1, index + 1)

            dataStorage.write(name, stateList)
            console.log('write', name, 'ok')
        }        
    }

    console.log('finished!')
}

function _getDataSetName(configIndex, stateListIndex) {
    return 'pair-state-' + configIndex + '-' + stateListIndex
}

main()
