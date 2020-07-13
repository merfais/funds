const _ = require('lodash')

module.exports = function genModel() {
  class Model {
    constructor() {
      for (let key in Model) {
        this[key] = Model[key]
      }
    }
  }
  Object.assign(Model, _.reduce({
    find(filter) {
      return this
    },
    findById(id) {
      return this
    },
    sort(obj) {
      return this
    },
    limit(num) {
      return this
    },
    skip(num) {
      return this
    },
    countDocuments() {
      return this
    },
    populate() {
      return this
    },
    updateOne() {
      return this
    },
    findOneAndUpdate() {
      return this
    },
    findByIdAndUpdate() {
      return this
    },
    deleteOne() {
      return this
    },
    create() {
      return Promise.resolve({})
    },
    exec(fn) {
      fn()
    },
  }, (acc, item, key) => {
    acc[key] = jest.fn().mockImplementation(item)
    return acc
  }, {}))
  return Model
}


