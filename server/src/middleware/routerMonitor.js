const logger = require('../utils/logger').genLogger('middleware/routerMonitor')

class Monitor {
  constructor() {
    this.uaReg = {
      browser: /Mozilla|Chrome|Safari|WebKit/i,
      nodejs: /axios|node-fetch/i,
      go: /go-http-client/i,
      java: /java/i,
      shell: /curl|wget/i,
      python: /python-requests/i,
    }
  }

  init(conf) {
    this.conf = conf
    return async (ctx, next) => {
      await next()
      const retCode = this.getCode(ctx)
      const header = ctx.header || {}
      const { aService, aInterface } = this.getAServiceInterface(header)
      if (aService === 'unknown') {
        logger.info('未解析的ua', ctx.href, JSON.stringify(ctx.header))
      }
      // 异常通知
      this.alarm(ctx, retCode, aService, aInterface)
      // 上报逻辑放到middleware/logger中，那里计算的时间更准确
      ctx._monitorData = {
        retCode,
        status: retCode,
        aService,
        aInterface,
      }
    }
  }

  getAServiceInterface(header) {
    let aService = 'unknown'
    let aInterface = 'unknown'
    const ua = header['user-agent'] || ''
    _.forEach(this.uaReg, (reg, agent) => {
      const matched = ua.match(reg)
      if (matched) {
        aService = agent
        aInterface = matched[0]
        return false
      }
    })
    return { aService, aInterface }
  }

  getCode(ctx) {
    const body = ctx.body || {}
    let code = body.code
    if (code === null || code === undefined) {
      code = ctx.status
    }
    return code === 200 ? 0 : code
  }

  alarm(ctx, retCode, aService, aInterface) {
    const enable = this.conf.get('codeAlarm.enable')
    if (!enable || retCode === 0 || aService === 'browser') {
      return
    }
    const body = ctx.body || {}
    const code = body.code
    const status = ctx.status
    const receiver = [...new Set(this.conf.get('codeAlarm.receiver', []))].join()
    const date = new Date().toLocaleString()
    const href = ctx.href
    const errorMsg = body.msg
    const msg = `返回码：${code}\n`
      + `状态码：${status}\n`
      + `错误描述：${errorMsg}\n`
      + `调用方：${aService}:${aInterface}\n`
      + `请求地址：${href}`
    const data = {
      id: `i${code}${status}${aService}${aInterface}${href}`,
      title: 'API返回码异常告警',
      receiver,
      date,
      msg,
    }
    // sendAlarm(data)
  }

}

module.exports = new Monitor()
