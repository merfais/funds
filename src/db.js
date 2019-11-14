const db = require('./utils/db')


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
  let handler = Promise.resolve()
  if (cache[table].length >= 200) {
    data = cache[table]
    cache[table] = []
    handler = db.insert(table, data)
  }
  return handler
}

function insertFundList(data) {
  return insertThroughCache('fund_info', data)
}


function insertDailyState(data) {
  return insertThroughCache('fund_daily_state')
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
