'use strict'
const _ = require('lodash')

// Description
// * Asynchronous waiting.
//
// Input
// * period / Number - Non-negative integer, number of miliseconds
//   for waiting.
//
// Output
// * Promise<undefined>
async function delay(period) {
    return new Promise((resolve) => {
        setTimeout(resolve, period)
    })
}

function splitChunks (from, to, count) {
    const size = Math.floor((to - from + 1) / count)
    const blocks = _.range(count).map(i => {
        const fromBlock = from + (size * i)
        const toBlock = fromBlock + size - 1
        return { fromBlock, toBlock }
    });
    return blocks;
}

function rpcKnownError (err) {
    return err && ['TIMEOUT', 'SERVER_ERROR'].includes(err.code)
}

function compareLog(a, b) {
    if (a.blockNumber < b.blockNumber) {
        return -2
    } else if (a.blockNumber > b.blockNumber) {
        return 2
    }
    if (a.logIndex < b.logIndex) {
        return -1
    } else if (a.logIndex > b.logIndex) {
        return 1
    }
    return 0
}

function mergeTwoUniqSortedLogs(a, b) {
    if (!a?.length) {
        return b ?? []
    }
    if (!b?.length) {
        return a ?? []
    }
    const r = []
    const i = {
        a: 0,
        b: 0
    }
    while (i.a < a.length || i.b < b.length) {
        if (a[i.a] == null) {
            r.push(b[i.b++])
            continue
        }
        if (b[i.b] == null) {
            r.push(a[i.a++])
            continue
        }
        const c = compareLog(a[i.a], b[i.b])
        if (c < 0) {
            r.push(a[i.a++])
            continue
        }
        if (c == 0) {
            i.a++
        }
        r.push(b[i.b++])
    }
    return r;
}

function mergeUniqSortedLogs(a) {
    if (!a?.length) {
        return []
    }
    let r = a[0]
    for (let i = 1; i < a.length; ++i) {
        r = mergeTwoUniqSortedLogs(r, a[i])
    }
    return r ?? []
}

module.exports = {
    delay,
    splitChunks,
    rpcKnownError,
    compareLog,
    mergeTwoUniqSortedLogs,
    mergeUniqSortedLogs,
}
