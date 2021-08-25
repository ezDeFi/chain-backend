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
    const size = Math.round((to - from) / count)
    const blocks = _.range(count).map(i => {
        const fromBlock = from + (size * i)
        const toBlock = fromBlock + size - 1
        return { fromBlock, toBlock}
    });
    return blocks;
}

module.exports = {
    delay,
    splitChunks,
}
