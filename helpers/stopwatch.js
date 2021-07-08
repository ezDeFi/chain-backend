'use strict'

// {Number} Total timelapse which is measure by `watch()`, unit milisecond.
let _timelapse = 0

// Descriptions
//  * Perform task and return it's result.
//  * Execution time of processing is add to total timelapse.
//
// Input
//  * task {Function | async Function}
//
// Output {Any} Result of `task()`
//
// Errors
//  * Error `Task is not a function`
async function watch(task) {
    if (typeof task !== 'function') {
        throw Error('Task is not a function')
    }

    let begin = Date.now()
    let result = await Promise.resolve(
        task()
    )
    let end = Date.now()

    _timelapse += end - begin

    return result
}

// Descriptions
//  * Set timelapse to zero
function reset() {
    _timelapse = 0
}

// Output {Number} Total timelapse which is measure by `watch()`, unit milisecond.
function timelapse() {
    return _timelapse
}

module.exports = {
    watch,
    reset,
    timelapse
}
