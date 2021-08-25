'use strict'


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

module.exports = {
    delay
}
