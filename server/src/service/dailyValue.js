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

  getNotOpen(params, ext) {
    return this.mysql.select({
      tableName: this.mysql.table.dailyAbnormal,
    }).then(({ result }) => {
      return result
    })
  }

  /**
   * 基金净值表中未开放申购和赎回的基金筛选出来，暂存到异常净值表中
   */
  transferNotOpen() {
    // const sql = `select code, count(code) from fund_daily_state group by code`
    const selectStr = this.mysql.format(this.mysql.buildSelect({
      tableName: this.mysql.table.fundDailyState,
      fields: ['code', { count: [ 'code', 'count' ] }],
      where: {
        redemption: {
          operator: '!=',
          value: '开发赎回'
        },
        purchase: {
          operator: '!=',
          value: '开放申购'
        },
      },
      ext: {
        groupBy: 'code',
        orderSort: { count: 'asc' },
      }
    }))
    const sqlStr = `insert into ${this.mysql.table.dailyAbnormal} ${selectStr}`
    this.mysql.query(sqlStr).then(({ result }) => {
      return result
    })
  }

  post(data) {
  }

  patch() {}

  del() {}

}

module.exports = new UserService()
