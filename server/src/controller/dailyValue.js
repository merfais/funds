const Base = require('./base')
const {
  dailyValue,
} = require('../service')
const { CODE } = require('../constants')

class DailyValueController extends Base {
  constructor() {
    super()
    this.init({
      loggerPrefix: 'controller/dailyValue'
    })
  }

  get(ctx) {
    const data = this.pickIfFull(ctx, [
      '_id',
      'name',
      'name_like',
    ])
    const ext = this.pickIfExist(ctx, [
      'page',
      'size',
      'sort',
      'order',
    ])
    return dailyValue.validate({ ...data, ...ext }).then(invalidMsg => {
      if (invalidMsg) {
        return this.fail(ctx, invalidMsg)
      }
      return dailyValue.get(data, ext).then(res => {
        this.success(ctx, res)
      }).catch(err => {
        this.fail(ctx, err)
      })
    })
  }

  getNotOpen(ctx) {
    const data = this.pickIfFull(ctx, [
      'code',
    ])
    const ext = this.pickIfExist(ctx, [
      'page',
      'size',
      'sort',
      'order',
    ])
    return dailyValue.validate({ ...data, ...ext }).then(invalidMsg => {
      if (invalidMsg) {
        return this.fail(ctx, invalidMsg)
      }
      return dailyValue.getNotOpen(data, ext).then(res => {
        this.success(ctx, res)
      }).catch(err => {
        this.fail(ctx, err)
      })
    })

  }

  post(ctx) {
    const data = this.pickRequiredAll(ctx, ['name'])
    if (data === false) {
      return
    }
    return dailyValue.validate(data).then(invalidMsg => {
      if (invalidMsg) {
        return this.fail(ctx, invalidMsg)
      }
      return dailyValue.post(data).then(res => {
        this.success(ctx, res)
      }).catch(err => {
        this.fail(ctx, err)
      })
    })
  }

  login(ctx, conf) {
    const superAdmin = conf.get('superAdmin', ['coffeebi'])
    return this.success(ctx, { superAdmin })
  }

}

module.exports = new DailyValueController()
