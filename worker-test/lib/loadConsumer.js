'use strict'

const path = require('path')

// Input
//  * relativePaths {Array<String>} List of path to Javascript files,
//    each file defines a consumer.
//
// Output {Array<Object>} List of consumers.
function loadConsumers(relativePaths) {
    if (!Array.isArray(relativePaths) || relativePaths.length === 0) {
        throw Error('Invalid consumer path')
    }

    let rootDir = path.join(__dirname, '..', '..')

    return relativePaths
        .map(relativePath => {
            let key = path.basename(relativePath, path.extname(relativePath))
            let filePath = path.join(rootDir, relativePath)

            return require(filePath)(key)
        })
}

module.exports = loadConsumers
