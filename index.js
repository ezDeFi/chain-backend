'use strict'

const {standardizeStartConfiguration} = require('./validator')

// Input
//  * config {Object}
//  * config.consumers {Array<Consumer>}
//  * config.mongoEndpoint {String}
//  * config.bscEndpoint {String}
function startWorker(config) {
    let validConfig = standardizeStartConfiguration(config)
}

module.exports = {
    startWorker
}
