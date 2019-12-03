const fs = require('fs')
const util = require('util')
const path = require('path')
const _ = require('lodash')
const logger = require('./logger')

function appendFile(path, data, withLineBreak) {
  return new Promise((resolve, reject) => {
    const sid = `[${Math.random().toString(16).slice(2, 6)}]`
    logger.info(sid, `===> 写入文件: ${path}`)
    let str = data
    if (!_.isString(data)) {
      str = util.inspect(data)
    }
    if (withLineBreak) {
      str += '\n'
    }
    fs.appendFile(path, str, err => {
      if (err) {
        logger.error(sid, `<=== 写入文件[${path}]失败`)
        logger.error(sid, err)
        reject(err)
      } else {
        logger.info(sid, `<=== 写入文件[${path}]成功`)
        resolve()
      }
    })
  })
}

function fromFile(path) {
  return new Promise(resolve => {
    logger.log(chalk.green('begin read from file: ') + `${path}`)
    fs.readFile(path, (err, data) => {
      if (err) {
        throw err
      }
      try {
        data = JSON.parse(data)
      } catch(err) {
        throw err
      }
      logger.log(chalk.green('read success'))
      resolve(data)
    })
  })
}

module.exports = {
  appendFile,
}
