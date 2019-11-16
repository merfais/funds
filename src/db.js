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
function insertThroughCache(table, data) {
  if (!cache[table]) {
    cache[table] = data
  } else {
    cache[table] = cache[table].concat(data)
  }
  logger.log(`本次插入数据长度：${data.length}, 已缓存数据长度：${cache[table].length}`)
  if (cache[table].length >= 500) {
    logger.info(`清空${table}数据缓存，并开始写入数据库`)
    data = cache[table]
    cache[table] = []
    return db.insert(table, data)
  } else {
    logger.log('缓存数据长度未达到200, 直接返回')
    return Promise.resolve()
  }
}

function insertFundList(data) {
  return insertThroughCache('fund_info', data)
}


function insertDailyState(data) {
  return insertThroughCache('fund_daily_state',data)
}

function flushCache() {
  _.forEach(cache, (data, table) => {
    if (data.length) {
      db.insert(table, data)
      cache[table] = []
    }
  })
}

module.exports = {
  selectFundList,
  insertFundList,
  insertDailyState,
  flushCache,
}
