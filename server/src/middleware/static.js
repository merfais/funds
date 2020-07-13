const path = require('path')
const staticCache = require('koa-static-cache')

class Static {

  constructor() {
  }

  init(conf) {
    let dir = conf.get('static.path', './public')
    if (!path.isAbsolute(dir)) {
      dir = path.resolve(__dirname, '../../', dir)
    }
    return staticCache({
      dir,
      maxAge: conf.get('static.maxAge', 365 * 24 * 60 * 60),
      dynamic: true,
    })
  }

}

module.exports = new Static()
