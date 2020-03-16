const rp = require('request-promise')
const config = require('../config')

const defaultPrivateToken = 'Hb5Qay-YrE-hsAQg_P8t' // gitlab token

async function request(options) {
    setDefaultUri(options)
    checkURl(options)
    setDefaultMethod(options)
    setDefaultHeaders(options.headers)
    setBody(options)
    try {
        let response = {}
        let result = await rp(options, (err, responseResult) => {
            if (err) {
                console.error('Request Error url is', options.uri)
                // throw new Error(err)
                return
            }
            if (responseResult && typeof responseResult === 'object') { response = responseResult }
        })
        return parseResult(result, response.headers)
    } catch (error) {
        console.error(`Request Error url is ${options.uri} Error is ${error.message}`)
  /*       throw new Error(error) */
    }
}

function parseResult(result, headers) {
    if (typeof result === 'string' && headers && headers['content-type'].indexOf('application/json') !== -1) {
        return JSON.parse(result)
    }
    return result
}

function setDefaultUri(options) {
    if (typeof options === 'string') { options = { uri: options } }
    if (!options.uri && options.url) {
        options.uri = options.url
    }
}

function checkURl(options) {
    if (!options.uri || typeof options.uri !== 'string') {
        throw new Error('Request URL is Undefined')
    }
}

function setBody(options) {
    if (options.body && options.method === config.REQUEST_METHOD.GET) {
        options.qs = {...options.body}
    }
}

function setDefaultMethod(options) {
    if (!options.method || (options.method !== config.REQUEST_METHOD.GET && options.method.toUpperCase() === config.REQUEST_METHOD.GET)) {
        options.method = config.REQUEST_METHOD.GET
    }
}

function setDefaultHeaders(headers) {
    if (headers && typeof headers === 'object') {
        Object.assign(headers, { 'PRIVATE-TOKEN': defaultPrivateToken } )
    }
}

module.exports = request