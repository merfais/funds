const {
  db,
  logger,
} = require('./utils')


// 取数据库中基金列表
function selectFundList() {
  return db.select('fund_info', ['code', 'value_updated_at']).then(data => {
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


function insertDailyState(data) {
  return insertThroughCache('fund_daily_state',data)
}

function flushInsertCache() {
  logger.info('清空cache写入数据库')
  _.forEach(cache, (data, table) => {
    if (data.length) {
      db.insert(table, data)
      cache[table] = []
    }
  })
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

module.exports = {
  selectFundList,
  insertFundList,
  insertDailyState,
  flushInsertCache,
  updateFundList,
}
