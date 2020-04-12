const _ = require('lodash')
const db = require('../utils/db.js')

function calc2() {
  const startAt = `
    update fund_info t1,
      (SELECT code, min(date) date from fund_daily_state GROUP BY code) t2
    set t1.start_at = t2.date
    WHERE t1.code = t2.code
  `
  return db.query(startAt, 'fund_info', 'update')
}

function run() {
  return calc2().then(r => {
    console.log(r)
    db.end()
  }).catch(err => {
    console.log(err)
    db.end()
  })
}

run()

