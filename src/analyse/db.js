const _ = require('lodash')
const {
  db,
  logger,
} = require('../utils')

function insertRegularInvest(data) {
  return db.insert('regular_invest_v', data)
}

function selectDailyValue(where, orderSort) {
  return db.select('fund_daily_state', [
    'code',
    'date',
    'value',
    'bonus',
    'bonus_des',
    'redemption',
    'purchase',
    'raw_state',
  ], where, { orderSort }).then(data => {
    return data.result
  })
}

// 取数据库中基金列表
function selectFundList(where) {
  return db.select('fund_info', ['code'], where).then(data => {
    return data.result
  })
}


module.exports = {
  selectRegularInvest,
  selectDailyValue,
  selectFundList,
}
