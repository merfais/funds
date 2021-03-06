const _ = require('lodash')
const {
  db,
  logger,
} = require('../utils')


// 取数据库中基金列表
function selectFundList(where) {
  return db.select('fund_info', ['code', 'value_updated_at'], where).then(data => {
    return data.result
  })
}

// 数据库基金列表插入
const cache = {}
const cacheMax = 400
function insertThroughCache(table, data) {
  if (!cache[table]) {
    cache[table] = data
  } else {
    cache[table] = cache[table].concat(data)
  }
  logger.log(`本次插入数据长度：${data.length}, 已缓存数据长度：${cache[table].length}`)
  if (cache[table].length >= cacheMax) {
    logger.info(`清空${table}数据缓存，并开始写入数据库`)
    data = cache[table]
    cache[table] = []
    return db.insert(table, data)
  } else {
    logger.log(`缓存数据长度未达到${cacheMax}, 直接返回`)
    return Promise.resolve()
  }
}

function insertFundList(data) {
  return db.insert('fund_info', data)
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

function insertDailyState(data) {
  return insertThroughCache('fund_daily_state',data)
}

function setFundStartAt() {
  const startAt = `
    update fund_info t1,
      (SELECT code, min(date) date from fund_daily_state GROUP BY code) t2
    set t1.start_at = t2.date
    WHERE t1.code = t2.code
  `
  return db.query(startAt, 'fund_info', 'update')
}

function flushInsertCache() {
  logger.info('清空cache写入数据库')
  return Promise.all(_.map(cache, (data, table) => {
    let r = Promise.resolve()
    if (data.length) {
      r = db.insert(table, data)
      cache[table] = []
    }
    return r
  }))
}

function selectRegularInvest() {

}

function insertRegularInvest(data) {
  return db.insert('regular_invest_v', data)
}

function updateFundList() {
  // const sqlStr = 'UPDATE ?? t1 SET ?? = (SELECT MAX(t2.??) FROM ?? t2 WHERE t1.?? = t2.??)'
  const sqlStr = 'update ?? t1, '
    + '(select ??, max(??) date from ?? group by ??) t2 '
    + 'set t1.?? = t2.date '
    + 'where t1.?? = t2.??'

  const data = [
    'fund_info',
    'code',
    'date',
    'fund_daily_state',
    'code',
    'value_updated_at',
    'code',
    'code',
  ]
  const queryStr = db.format(sqlStr, data)
  // logger.log(queryStr)
  logger.info('更新基金净值最后更新日期')
  return db.pool.query(sqlStr, data).then(([result, rows]) => {
    logger.info('基金列表更新成功', result.info)
  }).catch(err => {
    logger.error('基金列表更新失败', err)
    logger.info('queryStr = ', queryStr)
  })
}

function close() {
  db.end()
}

module.exports = {
  selectFundList,
  insertFundList,
  selectDailyValue,
  insertDailyState,
  selectRegularInvest,
  insertRegularInvest,
  setFundStartAt,
  flushInsertCache,
  updateFundList,
  close,
}
