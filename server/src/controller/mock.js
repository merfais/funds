const Base = require('./base')


class Mock extends Base {
  constructor() {
    super()
    this.init({
      loggerPrefix: 'controller/mock'
    })
  }

  all(ctx) {
    this.success(ctx, {})
  }

  get(ctx) {
    const data = {
    }

    this.success(ctx, data)
  }

}

module.exports = new Mock()
