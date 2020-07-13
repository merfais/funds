const { genLogger } = require('../utils/logger')
const { CODE } = require('../constants')

class Base {
  constructor() {
    this.init()
  }

  init({
    loggerPrefix = 'controller/base'
  } = {}) {
    this.logger = genLogger(loggerPrefix)
  }

  inject(obj) { // 注入依赖
    Object.assign(this, obj)
  }

  success(ctx, data = null) {
    const body = { code: 0, data }
    ctx.status = 200
    ctx.body = body
  }

  fail(ctx, error, code, status) {
    this.logger.error('返回error', error)
    let msg = '未知错误'
    if (_.isObject(error)) {
      msg = error.message || error.msg || msg
      code = code || error.code
    } else {
      msg = error || msg
    }
    code = code || -1
    ctx.body = { code, msg }
    ctx.status = status || 200
  }

  _tryGetField(ctx, field) {
    const body = ctx.request.body || {}
    const params = ctx.params || {}
    const query = ctx.query  || {}
    if (_.has(body, field)) {
      return body[field]
    }
    if (_.has(query, field)) {
      return query[field]
    }
    if (_.has(params, field)) {
      return params[field]
    }
    return undefined
  }

  pickRequiredAll(ctx, fields, rename) {
    let data = {}
    _.forEach(fields, field => {
      const rfield = _.get(rename, field, field)
      data[rfield] = this._tryGetField(ctx, field)
      if (data[rfield] === undefined) {
        this.fail(ctx, `缺少 ${field} 字段`, CODE.MISSING_FIELDS)
        data = false
        return false
      }
    })
    return data
  }

  pickRequiredSome(ctx, fields, rename) {
    let data = {}
    let allIsUndefined = true
    _.forEach(fields, field => {
      const rfield = _.get(rename, field, field)
      const value = this._tryGetField(ctx, field)
      if (value !== undefined) {
        allIsUndefined = false
        data[rfield] = value
      }
    })
    if (allIsUndefined) {
      this.fail(ctx, `至少要提供(${fields.join()})其中一个字段`, CODE.MISSING_FIELDS)
      data = false
    }
    return data
  }

  pickIfFull(ctx, fields, rename) {
    const body = ctx.request.body || {}
    const params = ctx.params || {}
    const query = ctx.query || {}
    return _.reduce(fields, (acc, field) => {
      const rfield = _.get(rename, field, field)
      if (!_.isEmpty(body[field]) || _.isNumber(body[field])) {
        acc[rfield] = body[field]
      } else if (!_.isEmpty(query[field]) || _.isNumber(query[field])) {
        acc[rfield] = query[field]
      } else if (!_.isEmpty(params[field]) || _.isNumber(params[field])) {
        acc[rfield] = params[field]
      }
      return acc
    }, {})
  }

  pickIfExist(ctx, fields, rename) {
    return _.reduce(fields, (acc, field) => {
      const rfield = _.get(rename, field, field)
      const value = this._tryGetField(ctx, field)
      if (value !== undefined) {
        acc[rfield] = value
      }
      return acc
    }, {})
  }

  pick(ctx, fields, rename) {
    return _.reduce(fields, (acc, dvalue, field) => {
      const rfield = _.get(rename, field, field)
      const value = this._tryGetField(ctx, field)
      if (value === undefined) {
        acc[rfield] = dvalue
      } else {
        acc[rfield] = value
      }
      return acc
    }, {})
  }

}

module.exports = Base
