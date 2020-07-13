const Base = require('./base')
const { CODE } = require('../constants')

class UserService extends Base {
  constructor() {
    super()

    this.paramsType = {
      name: String,
      name_like: String,
      _id: {
        type: 'ObjectId',
        regExp: /^[a-fA-F0-9]{24}$/,
      }
    }
    // init最后再执行，有些逻辑是在base中写的
    this.init({
      loggerPrefix: 'service/fundInfo'
    })
  }

  get(params = {}, ext) {
  }

  post(data) {
  }

  patch() {}

  del() {}

}

module.exports = new UserService()
