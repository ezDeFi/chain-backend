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
        logs = logs.filter(log => !topics.some((topic, i) => {
            if (!topic) {
                return false
            }
            if (Array.isArray(topic)) {
                return !topic.includes(log.topics[i])
            } else {
                return topic !== log.topics[i]
            }
        }))
    }
    return logs
}

exports.mergeTopics = (topicsList) => {
    const merged = [[], [], [], []]
    for (let i = 0; i < 4; ++i) {
        for (const topics of topicsList) {
            if (!topics[i]) {
                delete merged[i]
                break
            }
            for (const topic of _.flatten([topics[i]])) {
                if (topic && !merged[i].includes(topic)) {
                    merged[i].push(topic)
                }
            }
        }
        if (merged[i]) {
            merged[i] = _.flatten(merged[i])
            if (!merged[i].length) {
                delete merged[i]
            } else if (merged[i].length == 1) {
                merged[i] = merged[i][0]
            }
        }
    }
    while(merged.length && !merged[merged.length-1]) {
        merged.pop()
    }
    return merged
}

exports.mergeAddress = (requests) => {
    const address = []
    for (const request of requests) {
        if (!request.address) {
            return
        }
        for (const a of _.flatten([request.address])) {
            if (a && !address.includes(a)) {
                address.push(a)
            }
        }
    }
    if (!address.length) {
        return
    }
    if (address.length == 1) {
        return address[0]
    }
    return address
}

exports.capRequests = ({requests, fromBlock, toBlock}) => {
    requests = requests
        .filter(r => !toBlock || r.from <= toBlock)
        .filter(r => !r.to || r.to >= fromBlock)
    if (requests.length == 0) {
        console.log(`no request in range ${fromBlock} +${toBlock-fromBlock}`)
        return
    }
    return requests.map(request => ({
        address: request.address,
        topics: request.topics,
        fromBlock: _.max([fromBlock, request.from]),
        toBlock: _.max([toBlock, request.to]),
    }))
}

exports.mergeRequests = ({requests, fromBlock, toBlock}) => {
    requests = requests
        .filter(r => !toBlock || r.from <= toBlock)
        .filter(r => !r.to || r.to >= fromBlock)
    if (requests.length == 0) {
        console.log(`no request in range ${fromBlock} +${toBlock-fromBlock}`)
        return
    }
    const address = exports.mergeAddress(requests)
    const topics = exports.mergeTopics(requests.map(r => r.topics))
    console.error('mergeRequests', {address, fromBlock, toBlock, topics})
    return {address, fromBlock, toBlock, topics}
}

exports.partitionRequests = (requests) => {
    let parts = _.partition(requests, r => r.address)
    for (let i = 0; i < 4; ++i) {
        parts = _.flatten(parts.map(rr => _.partition(rr, r => r.topics[i])))
    }
    return parts.filter(rr => rr && rr.length)
}
