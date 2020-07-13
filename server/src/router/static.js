const fs = require('fs')
const path = require('path')
const logger = require('../utils/logger').genLogger('router/static')


class Static {
  constructor() {
    this.monitor = false
    this.escape = false
    this.cache = null
    this.indexPath = null
    this.mtimeMs = 0
  }

  init(router, conf) {
    let dir = conf.get('static.path', './public')
    if (!path.isAbsolute(dir)) {
      dir = path.resolve(__dirname, '../../', dir)
    }
    const index = conf.get('static.index', 'index.html')
    this.indexPath = path.join(dir, index)

    router.get('*', async (ctx, next) => {
      await next()
      try {
        ctx.body = await this.readIndex()
      } catch (e) {
        logger.error(`未找到默认路由，path=${ctx.path}, static.path=${dir}, static.index=${index}`)
        logger.error(e)
      }
    })
    return this
  }

  readIndex() {
    return new Promise((resolve, reject) => {
      fs.stat(this.indexPath, (err, stats) => {
        if (err) {
          logger.error('读取静态资源入口文件状态失败:', err)
          resolve(true)
          return
        }
        if (stats.mtimeMs !== this.mtimeMs) {
          this.mtimeMs = stats.mtimeMs
          resolve(true)
          return
        }
        resolve(false)
      })
    }).then(hasChange => {
      if (this.cache && !hasChange) {
        return this.cache
      }
      return new Promise((resolve, reject) => {
        fs.readFile(this.indexPath, {'encoding': 'utf8'}, (err, data) => {
          if(err) return reject(err)
          this.cache = data
          resolve(data)
        })
      })
    })
  }

}

module.exports = new Static()
