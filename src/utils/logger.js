const path = require('path')
const util = require('util')
const log4js = require('log4js')
const datefns = require('date-fns')
const _ = require('lodash')
const chalk = require('chalk')

log4js.configure({
  appenders: {
    file: {
      type: 'dateFile',
      filename: path.resolve(__dirname, '../../logs/fund.log'),
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


const keys = {
  all: 'grey',
  trace: 'blue',
  debug: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red',
  fatal: 'magenta',
  mark: 'grey',
  off: 'grey',
}

const fileLogger = log4js.getLogger()
const consoleLogger = (level, color, ...args) => {
  // console logger 使用自定义的输出
  let format = args[0]
  let output
  if (/%[sdifjoOc%]/.test(format)) {
    // 带format参数
    output = util.formatWithOptions({ colors: true }, ...args)
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
    output = util.formatWithOptions({ colors: true }, format, ...args)
  }
  const date = datefns.format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')
  const prefix = chalk[color](`[${date}][${level.toUpperCase()}] -`)
  console.log(prefix, output)
}

module.exports.log = (...args) => consoleLogger('log', 'whiteBright', ...args)

_.forEach(keys, (color, level) => {
  module.exports[level] = (...args) => {
    fileLogger[level].apply(fileLogger, args)
    consoleLogger(level, color, ...args)
  }
})
