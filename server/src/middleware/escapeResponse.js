const _ = require('lodash')
const escape = require('escape-html')

class XssFilter {

  constructor() {
  }
  init() {
    return async (ctx, next) => {
      await next()
      if (ctx.response.is('html')) {
        return
      }
      const msg = _.get(ctx.body, 'msg')
      if (msg) {
        ctx.body.msg = escape(msg)
      }
      ctx.set({
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      })
    }
  }
}

module.exports = new XssFilter()
