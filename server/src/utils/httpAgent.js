const axios = require('axios')
const qs = require('qs')
const _ = require('lodash')

class Agent {

  constructor() {}

  init(conf) {
    this.proxy = conf.get('proxy')
  }

  request(options) {
    options.method = options.method || 'get',
    options.timeout = options.timeout || 1000 * 5
    const header = options.header || {}
    const contentType =  header.contenttype
      || header.contentType
      || header.ContentType
      || header.CONTENTTYPE
      || header['content-type']
      || header['Content-Type']
      || header['CONTENT-TYPE']
    const isForm = contentType === ''
      || contentType === null
      || contentType === undefined
      || contentType === 'application/x-www-form-urlencoded'
    if (isForm && _.has(options, 'data')) {
      options.data = qs.stringify(options.data)
    }
    if (this.proxy && process.env.NODE_ENV !== 'production') {
      options.proxy = options.proxy || this.proxy
    }
    return axios.request(options).then(res => {
      if (_.has(res, 'data')) {
        return res.data
      }
      return res
    }).catch(err => {
      if (_.has(err, 'data')) {
        return Promise.reject(err.data)
      }
      return Promise.reject(err)
    })
  }
}

module.exports = new Agent()
