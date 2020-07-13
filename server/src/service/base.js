const { genLogger } = require('../utils/logger')
const { CODE } = require('../constants')

class Base {
  constructor() {
    this.paramsType = {}
    this.init()
  }

  init({
    loggerPrefix = 'service/base'
  } = {}) {
    this.logger = genLogger(loggerPrefix)
    Object.assign(this.paramsType, {
      page: {
        type: Number,
        regExp: /^\d+$/,
      },
      size: {
        type: Number,
        regExp: /^\d+$/,
      },
      order: String,
      sort: String,
    })
  }

  inject(obj) { // 注入依赖
    Object.assign(this, obj)
  }

  validate(data) {
    let invalidMsg = ''
    _.forEach(data, (value, field) => {
      const item = this.paramsType[field]
      if (item) {
        let valid = true
        let typeRequired
        if (Object.prototype.toString.call(item) === '[object Object]') {
          if (Object.prototype.toString.call(item.regExp) === '[object RegExp]') {
            if (Object.prototype.toString.call(item.type) === '[object String]') {
              typeRequired = item.type
            } else {
              typeRequired = Object.prototype.toString.call(item.type.prototype)
            }
            valid = item.regExp.test(value)
          }
        } else {
          typeRequired = Object.prototype.toString.call(item.prototype)
          const valueType = Object.prototype.toString.call(value)
          valid = typeRequired === valueType
        }
        if (!valid) {
          invalidMsg = {
            msg: `${field}字段类型错误, 需要${typeRequired}`,
            code: CODE.ILLEGAL_FIELD_TYPE,
          }
        }
      }
      return !invalidMsg
    })
    if (invalidMsg) {
      return Promise.resolve(invalidMsg)
    }
    if (this._validate) {
      return this._validate(data)
    }
    return Promise.resolve(invalidMsg)
  }

}

module.exports = Base
