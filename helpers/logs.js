'use strict'

// Input
//  * logs {Array<Object>}
//  * filter {Object}
//  * filter.key {String}
//  * filter.address {Array<String> || String}
//  * filter.topics {Array[4]}
//  * filter.from {Number}
//  * filter.to {Number}
//
// Output {Array<Object>} List of logs that match request
function filterLogs(logs, filter) {
    let { address, topics, from, to } = filter
    let result = logs.filter(log => (from <= log.blockNumber))

    if (to) {
        result = result.filter(log => (log.blockNumber <= to))
    }

    if (address) {
        if (Array.isArray(address)) {
            result = result.filter(log => address.includes(log.address))
        } else {
            result = result.filter(log => (address === log.address))
        }
    }

    if (topics) {
        result = result.filter(log => {
            return !topics.some((topic, i) => topic && log.topics[i] !== topic)
        })
    }

    return result
}

module.exports = {
    filterLogs
}
