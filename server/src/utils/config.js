const path = require('path')
const fs = require('fs')
const jsYaml = require('js-yaml')
const _ = require('lodash')

class Config {

  constructor() {
  }

  init(conf) {
    // 非线上环境跳过config.yaml的解析，配置直接从.devrc中读取
    if (process.env.NODE_ENV !== 'production') {
      Object.assign(this, conf)
      return this
    }
    const confPath = conf.confPath || path.resolve(__dirname, '../../config.yml')
    let config = {}
    try {
      config = jsYaml.load(fs.readFileSync(`${confPath}`, 'utf8'))
      if (!config || _.isEmpty(config)) {
        console.warn('读取到的配置是空值')
      }
    } catch (e) {
      console.error('读取配置失败：', e)
    }
    Object.assign(this, conf, config)
    return this
  }

  get(key, defautlValue) {
    return _.get(this, key, defautlValue)
  }

}

module.exports = new Config()
