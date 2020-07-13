const _ = require('lodash')
const {
  db,
  logger,
} = require('../utils')

function insertRegularInvest(tableName, data) {
  if (!tableName) {
    logger.error('tableName不能是空')
  }
  return db.insert(tableName, data)
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

function selectV(v, {
  tableName,
  where,
  minValue,
  ext,
}) {
  return db.select(tableName, [
    [v, 'value'],
    'code',
    'start',
    'end',
    'purchaseCount',
  ], {
    code: {
      operator: 'not in',
      value: ['003889','003890','003962', '003961']
    },
    [v]: {
      '>': minValue,
    },
    ...where,
  }, {
    orderSort: {
      [v]: 'desc',
    },
    limit: 5000,
    ...ext,
  }).then(data => {
    return data.result
  })

}

function selectAvgV(v, {
  tableName,
  where,
}) {
  return db.select(tableName, [[v, 'value']], where).then(data => {
    return data.result
  })
}


function selectAllAvgV({
  tableName,
  where,
  minCount,
  limit,
}) {
  const { dataArr, sqlStr } = db.buildWhere(where)
  const str = `
    SELECT avg3, avg2, code, count from (
      SELECT avg(v3) as avg3, avg(v2) as avg2, code, count(code) as count
      from ${tableName}
      ${sqlStr}
      GROUP BY code
    ) as t
    where count > ${minCount}
    ORDER BY avg3 desc limit ${limit}
  `
  return db.query({ queryStr: str, dataArr }).then(data => {
    return data.result
  })
}

function close() {
  db.end()
}


module.exports = {
  insertRegularInvest,
  selectDailyValue,
  selectFundList,
  selectV,
  selectAvgV,
  selectAllAvgV,
  close,
}
