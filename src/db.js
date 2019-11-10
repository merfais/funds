const db = require('./utils/db')


// 取数据库中基金列表
function selectFundList() {
  return db.select('fund_info', ['code', 'value_updated_at']).then(data => {
    return data.result
  })
}

// 数据库基金列表插入
function insertFund(data) {
  const sql = 'insert into fund_info set ?'
  return insert(sql, data)
}

function insertDailyValue(data) {
  const sql = 'insert into fund_daily_state set ?'
  return insert(sql, data)
}

// 数据库基金列表更新
function updateFund(data) {
  const data = { ...data }
  const id = data.id
  delete data.id
  const query = knex(table.fund_info).update(data).where({ id })
  return query.then(d => d)
}



