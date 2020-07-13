const _ = require('lodash')

class Logger {

  constructor() {
  }

  init(conf) {
    return async (ctx, next) => {
      if ( ctx.method === 'HEAD'
        && _.get(ctx, 'header.connection') === 'close'
      ) {
        return next()
      }
      const start = process.hrtime()
      ctx.logger.info(`--> req ${ctx.method} ${ctx.url}`);
      await next()
      const end = process.hrtime(start)
      const time = end[0] * 1e3 + end[1] / 1e6
      let code = _.get(ctx, 'body.code')
      if (/static/.test(ctx.url)) {
        code = ctx.status
      }
      ctx.logger.info(`res <-- ${ctx.status} ${code} ${time}ms ${ctx.method} ${ctx.url}`);
      this.report(ctx, end[0] * 1e6 + end[1] / 1e3)
    }
  }

  report(ctx, time) {
    const monitorData = ctx._monitorData || {}
    if (_.isEmpty(monitorData)) {
      return
    }
    const serviceData = {
      ...monitorData,
      pInterface: ctx._matchedRoute || '',
      time,
    }
    // sendServiceData(serviceData)
    const body = ctx.body || {}
    const header = ctx.header || {}
    const data = {
      method: ctx.method,
      path: ctx.path,
      query: ctx.query,
      params: ctx.params,
      route: ctx._matchedRoute,
      ua: header['user-agent'] || '',
      code: body.code,
      msg: body.msg,
      status: ctx.status,
      cost: time / 1e3,
    }
    // sendApiResponse(data)
  }

}

module.exports = new Logger()
