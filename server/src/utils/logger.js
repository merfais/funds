const util = require('util')
const dateformat = require('date-format')
const _ = require('lodash')
const chalk = require('chalk')

function formatArgs(args) {
  return util.format(_.map(args, arg => {
    if (_.isNumber(arg)) {
      return '%d'
    } else if (_.isObject(arg)) {
      return '%O'
    }
    return '%s'
  }).join(' '), ...args)
}

function consoleLogger(level, color, ...args) {
  // console logger 使用自定义的输出
  let format = args[0]
  let output
  if (/%[sdifjoOc%]/.test(format)) {
    // 带format参数
    output = util.format(...args)
  } else {
    // 未带format对特定的类型做格式化
    output = formatArgs(args)
  }
  const date = dateformat(new Date(), 'yyyy-MM-dd hh:mm:ss.SSS')
  const prefix = chalk[color](`[${date}][${level.toUpperCase()}] -`)
  console.log(prefix, output)
}

const levels = {
  trace: 'blue',
  debug: 'cyan',
  info: 'green',
  warn: 'yellow',
  error: 'red',
  fatal: 'magenta',
}

class Logger {

  constructor() {
    _.forEach(levels, (color, level) => {
      this[level] = () => {}
    })
    this.log = this.info
  }

  init(conf) {
    let loggerConf = conf.get('logger', {})
    const enableConsoleLogger = process.env.NODE_ENV === 'development'
      || process.env.DEBUG_LOG === conf.get('debug.logger.console', 'logger_console')
    // const enableFileLogger = process.env.NODE_ENV === 'production'
    //   || process.env.DEBUG_LOG === conf.get('debug.logger.file', 'logger_file')
    // let fileLogger
    // if (enableFileLogger) {
    //   fileLogger = createLogger(loggerConf)
    // }
    _.forEach(levels, (color, level) => {
      this[level] = (...args) => {
        // if (enableFileLogger) {
        //   fileLogger[level](formatArgs(args))
        // }
        if (enableConsoleLogger) {
          consoleLogger(level, color, ...args)
        }
      }
    })
    this.log = this.info
    return this
  }

}

const logger = new Logger()

logger.genLogger = (moduleName) => {
  return _.reduce(levels, (acc, color, level) => {
    acc[level] = moduleName
      ? (...args) => logger[level](`[${moduleName}] -`, ...args)
      : (...args) => logger[level](...args)
    return acc
  }, {})
}

module.exports = logger
