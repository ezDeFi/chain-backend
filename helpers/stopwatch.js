'use strict'

// Descriptions
//  * To measure time.
//
// Example 1
//  stopwatch.start('database')
//  ....
//  stopwatch.stop('database')
//  let timelapse = stopwatch.timelapse('database)
//
// Example 2
//  let result = stopwatch.watch(async () => {...}, 'database')
//  let timelapse = stopwatch.timelapse('database')

// {Map<String, Number>}
//
// Map of stopwatch's name and it's timelapse. Key is
// stopwatch's name and value is timelapse.
let _timelapse_map = new Map()

// {Map<String, Nunber}
//
// Map of start stopwatche's time. Key is stopwatch's name and value is start
// time.  This is use by `start()` and `stop()` to measure fragmention of
// time.
let _timestart_map = new Map()

function _validateStopwatchName(name) {
    if (typeof name !== 'string') {
        throw Error('Name is not a string')
    }
}

// Descriptions
//  * Perform task and return it's result.
//  * Execution time of task is add to total timelapse.
//  * Specify environment variable `STOPWATCH=1` to enable measurement.
//
// Input
//  * name {String} Name of stopwatch.
//  * task {Function | Promise} Task to execute.
//
// Output {Any} Result of `task()`
//
// Errors
//  * Error `Task is not a function`
//  * Error `Name is not a string`
async function watch(task, name) {
    _validateStopwatchName(name)

    if (!process.env.STOPWATCH) {
        return await _executeTask(task)
    }

    let currentTimelapse = _timelapse_map.get(name) || 0
    let begin = Date.now()
    let result = await _executeTask(task)
    let end = Date.now()
    let timelapse = currentTimelapse + (end - begin)

    _timelapse_map.set(name, timelapse)

    return result
}

// Descriptions
//  * Start time measurement of a stopwatch.
//  * The measurement can be interrupt by `stop()` or reset by `reset()`.
//
// Input
//  * name {String} Name of stopwatch.
//
// Error
//  * Error `Stopwatch is in progress`
function start(name) {
    _validateStopwatchName(name)

    if (_timestart_map.has(name)) {
        throw Error('Stopwatch is in progress')
    }

    _timestart_map.set(name, Date.now())
}

// Descriptions
//  * Interrupt time measurement of a stopwatch then add to total timelapse.
//  * The measurement can be resume by `start()` or reset by `reset()`.
//
// Input
//  * name {String} Name of stopwatch.
//
// Error
//  * Error `Stopwatch did not start`
function stop(name) {
    _validateStopwatchName(name)

    let start = _timestart_map.get(name)

    if (start === undefined) {
        throw Error('Stopwatch did not start')
    }

    let currentTimelapse = _timelapse_map.get(name) || 0
    let end = Date.now()
    let timelapse = currentTimelapse + (end - start)

    _timelapse_map.set(name, timelapse)
    _timestart_map.delete(name)
}

// Descriptions
//  * Set timelapse of a stopwatch to zero
//
// Input
//  * name {String} Name of stopwatch.
function reset(name) {
    _validateStopwatchName(name)
    _timelapse_map.set(name, 0)
}

// Descriptions
//  * Retrieve timelapse of a stopwatch.
//
// Input
//  * name {String} Name of stopwatch.
//
// Output
//  * {Number} Total timelapse of a stopwatch in miliseconds.
//  * {undefined} There is no stopwatch.
function timelapse(name) {
    _validateStopwatchName(name)

    return _timelapse_map.get(name)
}

// Descriptions
//  * Perform a task and return it's result.
//
// Input
//  * task {Function | Promise}
//
// Output {any} Result of task.
//
// Errors
//  * Error `Task is not a function or promise`
async function _executeTask(task) {
    if (typeof task === 'function') {
        return task()
    }
    return task
}

module.exports = {
    watch,
    start,
    stop,
    reset,
    timelapse
}
