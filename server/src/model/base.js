// const { genLogger } = require('../utils/logger')

class Base {
  constructor() {
    this.init()
  }

  init({
    loggerPrefix = 'model/base'
  } = {}) {
    // this.logger = genLogger(loggerPrefix)
  }

  findById(id, fields) {
    const query = this.model.findById(id, fields)
    return this.queryPromisify(query)
  }

  findOne(filter, fields) {
    const query = this.model.findOne(filter, fields)
    return this.queryPromisify(query)
  }

  findOneAndCreate(filter, doc) {
    if (doc === undefined) {
      doc = filter
    }
    let query = this.model.findOneAndUpdate(filter, doc, {
      upsert: true,
      new: true,
    })
    return this.queryPromisify(query)
  }

  create(data) {
    return this.model.create(data)
  }

  updateById(id, data = {}) {
    const query = this.model.findByIdAndUpdate(id, data, {
      new: true,
    })
    return this.queryPromisify(query)
  }

  delById(_id) {
    const query = this.model.deleteOne({ _id })
    return this.queryPromisify(query)
  }

  genFindQuery(filter = {}, ext = {}) {
    let query
    if (filter._id) {
      // 按_id的精确查询，只返回单条数据
      query = [this.model.findById(filter._id)]
    } else {
      query = [this.model.find(filter)]
      if (ext.page !== 0 && !filter.$where) {
        query.push(this.model.find(filter).countDocuments())
      }
      if (ext.sort && this.fields[ext.sort]) {
        const order = ext.order || 'asc'
        query[0].sort({ [ext.sort]: order })
      }
      ext.page = Number.parseInt(ext.page)
      if (ext.page !== 0) {
        ext.page = ext.page || 1
        ext.size = ext.size || 10
      }
      if (ext.page) {
        const size = Number.parseInt(ext.size)
        query[0].skip((ext.page - 1) * size).limit(size)
      }
    }
    return query
  }

  genArrayUpdateData(type, data) {
    const opMap = {
      $addToSet: '$each',
      $push: '$each',
      $pull: '$in',
    }
    const op = opMap[type]
    if (op && _.isArray(data)) {
      return { [op]: data }
    }
    return data
  }

  queryPromisify(query) {
    return new Promise((resolve, reject) => {
      query.exec(function (err, docs) {
        if (err) {    // 报错信息日志在最外层记录
          reject(err)
        } else {
          resolve(docs)
        }
      })
    })
  }

}

module.exports = Base
