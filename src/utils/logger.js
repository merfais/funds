const path = require('path')
const util = require('util')
const log4js = require('log4js')
const dateformat = require('date-format');
const _ = require('lodash')

log4js.configure({
  appenders: {
    file: {
      type: 'dateFile',
      filename: path.resolve(__dirname, '../logs/fund.log'),
      compress: true,
      daysToKeep: 60,
      layout: {
        type: 'pattern',
        pattern: '[%d{yyyy-MM-dd hh:mm:ss.SSS}][%p]-%m'
      }
    },
  },
  categories: {
    default: {
      appenders: ['file'],
      level: 'info',
    }
  }
})


const keys = [
  'all',
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'mark',
  'off'
]

const fileLogger = log4js.getLogger()

_.forEach(keys, func => {
  module.exports[func] = (...args) => {
    fileLogger[func].apply(fileLogger, args)
    // console logger 使用自定义的输出
    let format = args[0]
    if (/%[sdifjoOc%]/.test(format)) {
      // 带format参数
      args = util.formatWithOptions({ colors: true }, ...args)
    } else {
      // 未带format对特定的类型做格式化
      format = _.map(args, arg => {
        if (_.isNumber(arg)) {
          return '%d'
        } else if (_.isInteger(arg)) {
          return '%f'
        } else if (_.isObject(arg)) {
          return '%O'
        }
        return '%s'
      }).join(' ')
      args = util.formatWithOptions({ colors: true }, format, ...args)
    }
    const date = dateformat('yyyy-MM-dd hh:mm:ss.SSS', new Date())
    console.log(`[${date}][${func.toUpperCase()}]-`, args)
  }
})
