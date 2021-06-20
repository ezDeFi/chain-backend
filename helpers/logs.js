const _ = require('lodash')

exports.filterLogs = (logs, request) => {
    const { address, topics, from, to } = request
    logs = logs.filter(log => from <= log.blockNumber)
    if (to) {
        logs = logs.filter(log => log.blockNumber <= to)
    }
    if (address) {
        if (Array.isArray(address)) {
            logs = logs.filter(log => address.includes(log.address))
        } else {
            logs = logs.filter(log => address === log.address)
        }
    }
    if (topics) {
        logs = logs.filter(log => !topics.some((topic, i) => topic && log.topics[i] !== topic))
    }
    return logs
}

exports.mergeTopics = (topics) => {
    return topics
        .map(ts => ts.map(t => _.isArray(t) ? t : [t])) // wrap all single topic to array
        .reduce((topics, ts, it) => {
            ts.forEach((t, i) => {
                t.forEach(ti => {
                    if (!topics[i].includes(ti)) {
                        topics[i].push(ti)
                    }
                })
            })
            return topics
        })
}
