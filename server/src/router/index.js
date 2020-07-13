const _ = require('lodash')
const KoaRouter = require('koa-router')
const compose = require('koa-compose')
const routerMonitor = require('../middleware/routerMonitor')
const escape = require('../middleware/escapeResponse')
const apiRouter = require('./api')
const staticRouter = require('./static')

function generate(instance, conf) {
  const options = {}
  if (instance.prefix) {
    options.prefix = instance.prefix
  }
  const router = KoaRouter(options);
  if (instance.escape !== false) {
    router.use(escape.init(conf))
  }
  if (instance.monitor !== false) {
    router.use(routerMonitor.init(conf))
  }
  instance.init(router, conf)
  return router.routes()
}

class Router {

  constructor() {}

  init(conf) {
    return compose([
      generate(apiRouter, conf),
      generate(staticRouter, conf),
    ])
  }

}

module.exports = new Router()
