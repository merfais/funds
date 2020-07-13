const os = require('os')
const path = require('path')
const _ = require('lodash')
const Koa = require('koa');
const router = require('./router')
const serveStatic = require('./middleware/static')
const accessLogger = require('./middleware/logger')
const controllers = require('./controller')
const services = require('./service')
const models = require('./model')
const {
  config,
  logger,
  httpAgent,
} = require('./utils')

const appLogger = logger.genLogger('app')

global._ = _

module.exports = class App {
  constructor(conf) {
    this.init(conf)
    this.initApp()
  }

  init(conf) {
    this.conf = config.init(conf)
    this.logger = logger.init(this.conf)
    if (this.conf.get('mongodb.enable') !== false) {
      const mongo = require('./dbDriver/mongo')
      this.mongo = mongo.init(this.conf)
    } else if (this.conf.get('mysql.enable') !== false) {
      const mysql = require('./dbDriver/mysql')
      this.mysql = mysql.init(this.conf)
    }
    httpAgent.init(this.conf)
    // 注入services, mysql 依赖
    _.forEach(services, (serviceIns, serviceName) => {
      const service = _.omit(services, serviceName)
      serviceIns.inject({
        mysql: this.mysql,
        service,
        model: models,
      })
    })
    // 注入services依赖
    _.forEach(controllers, controllerIns => {
      controllerIns.inject({
        service: services,
      })
    })
  }

  initApp() {
    const app = new Koa()
    // error handling
    app.on('error', (err, ctx) => {
      appLogger.error('Error:', err, ctx)
    })

    // context binding
    app.context.logger = this.logger

    // middlewares
    app.use(accessLogger.init(this.conf))
    app.use(serveStatic.init(this.conf))
    app.use(router.init(this.conf))

    this.app = app
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(process.env.PORT || this.conf.port, (err) => {
        if (err) {
          appLogger.error('start app error:', err)
          reject(err)
          return
        }
        if (process.env.NODE_ENV === 'production') {
          appLogger.info(process.env)
        }
        appLogger.info('Server is running. listen at', this.conf.port)
        resolve()
      })
      this.server.on('close', (...args) => {
        appLogger.warn('server is stop', ...args)
      })
    })
  }

  stop() {
    if (this.mongo) {
      this.mongo.close()
    }
    if (this.mysql) {
      this.mysql.close()
    }
    // 数据库关闭后1s再断开server连接
    setTimeout(() => {
      this.server.close(err => {
        if (err) {
          appLogger.error('stop app error:', err)
        }
      })
    }, 1000)
  }
}

process.on('uncaughtException', function (err) {
  console.error('uncaughtException:', err)
})
