const _ = require('lodash')
const mongoose = require('mongoose')
const logger = require('../utils/logger').genLogger('dbDriver/mongo')

class Mongo {
  constructor() {
    mongoose.set('useFindAndModify', false)
  }

  init(conf) {
    let {
      username,
      password,
      host,
      port,
      database,
      options,
    } = conf.get('mongodb', {})
    let auth = ''
    if (username) {
      auth = username
    }
    if (password) {
      auth += `:${password}`
    }
    auth = auth ? `${auth}@` : ''
    let domain = host
    if (port) {
      domain += `:${port}`
    }
    database = database || 'shutu'
    const url = `mongodb://${auth}${domain}/${database}`
    options = options || {}
    if (!_.has(options, 'authSource')) {
      options.authSource = database
    }
    if (!_.has(options, 'useNewUrlParser')) {
      options.useNewUrlParser = true
    }
    if (!_.has(options, 'useUnifiedTopology')) {
      options.useUnifiedTopology = true
    }
    logger.info('连接mongodb:', url)
    mongoose.connect(url, options).catch(err => {
      logger.error('初始化mongodb连接出错：', err)
    })
    this.connection = mongoose.connection
    this.connection.on('error', err => {
      logger.error('mongodb出现错误:', err)
    })
    this.connection.on('connecting', (...args) => {
      logger.info('开始连接mongodb', ...args)
    })
    this.connection.on('connected', (...args) => {
      logger.info('连接mongodb成功', ...args)
    })
    this.connection.on('disconnected', (...args) => {
      logger.warn('mongodb断开连接', ...args)
    })
    this.connection.on('reconnected', (...args) => {
      logger.info('重新连接mongodb成功', ...args)
    })
    this.connection.on('reconnectFailed', (...args) => {
      logger.info('重新连接mongodb失败', ...args)
    })
    return this
  }

  close() {
    mongoose.disconnect()
  }

}

module.exports = new Mongo()
