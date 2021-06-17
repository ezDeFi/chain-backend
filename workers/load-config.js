'use strict'

const seed = require('@trop/seed')

let schema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'name',
        'age'
    ],
    properties: {
        name: {
            type: 'string'
        },
    }
}
let defaultValues = {
    'age': 18,
    'address.country': 'Vietnam',
    'address.city': 'Ha Noi'
}

function loadConfig() {

    let conf = seed.load(schema, 'conf_file.yaml', defaultValues)
}

module.exports = loadConfig
