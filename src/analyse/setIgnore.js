const _ = require('lodash')
const db = require('../utils/db.js')



const ss = `SELECT b.code code
  from (
    select code, count(*) c from fund_daily_state where
      (redemption = '开放赎回' and purchase = '开放申购')
      or (redemption = '' and purchase = '')
      GROUP BY code
  ) a RIGHT JOIN (
    SELECT code, count(*) cc from fund_daily_state GROUP BY code
  ) b on a.code = b.code
  WHERE a.c is null   -- 完全不能申购
  or a.c < 30  -- 能申购的数小于30
  or ((b.cc - a.c) *  2 > b.cc  and a.c < 200) -- 不能申购数超过一半 且 能申购数小于200
  or (a.c < 100  and (b.cc - a.c > 10)) -- 能申购数小于100 且 不能申购数大于10
  or (a.c < 50  and (b.cc - a.c > 0)) -- 能申购数小于100 且 不能申购数大于10
`

const start = Date.now()

// db.pool.query(ss).then(([ result, fields ]) => {
//   const end = Date.now()
//   const cost = ((end - start) / 1000).toFixed(2) + 's'
//   console.log(result.length, cost)
// })



// 能申购的数小于30,包括不能申购的
// 不能申购数超过总数的一半 且 能申购数小于200
// 能申购数小于100 且 不能申购数大于10
// 能申购数小于50 且 不能申购数大于0
function calc1() {
  const s1 = `
      select code, count(*) c from fund_daily_state where
        (redemption = '开放赎回' and purchase = '开放申购')
        or (redemption = '' and purchase = '')
        GROUP BY code

  `
  const s2 = `
      SELECT code, count(*) cc from fund_daily_state GROUP BY code
  `

  return Promise.all([
    db.query(s1, 'fund_daily_state', 'select'),    // 能申购
    db.query(s2, 'fund_daily_state', 'select'),    // 全部
  ]).then(([{ result: r1 }, { result: r2 }]) => {
    const map = new Map()
    _.forEach(r1, item => {
      map.set(item.code, item.c)
    })
    const code = _.reduce(r2, (acc, item) => {
      const cc = item.cc
      const c = map.get(item.code) || 0
      const nc = cc - c
      if (c < 30                      // 能申购的数小于30,包括不能申购的
        || (nc * 2 > cc && c < 200)   // 不能申购数超过总数的一半 且 能申购数小于200
        || (c < 100 && nc > 10)       // 能申购数小于100 且 不能申购数大于10
        || (c < 50 && nc > 0)         // 能申购数小于50 且 不能申购数大于0
      ) {
        acc.push(item.code)
      }
      return acc
    }, [])
    console.log('calc1', code.length)
    return code
  })
}

// fund_daily_state原始数据异常的code list
function calc2() {
  const rawStateCount = `select code, COUNT(*) c from fund_daily_state WHERE raw_state != 0 GROUP BY code`

  return db.query(rawStateCount, 'fund_daily_state', 'select').then(({ result }) => {
    const code = _.map(result, item => (item.code))
    console.log('raw_state != 0', code.length)
    return code
  })
}

function calc3() {
  const notExist = `SELECT code from fund_info WHERE code not in (select DISTINCT code from fund_daily_state)`

  return db.query(notExist, 'fund_daily_state', 'select').then(({ result }) => {
    const code = _.map(result, item => (item.code))
    console.log('fund_daily_state not exist', code.length)
    return code
  })

}

function calc4() {
  code = [
    '519760', // 2018-04-03 1.118 , 2018-04-04 3.905 净值发成跳变
    '003793', // 2019-09-23 1.0477, 2019-09-24 2.3962 净值发生跳变
    '006761', // 2019-12-25 1.0180, 2019-12-26 2.3757 净值发成跳变
    '003803', // 2018-08-01 1.0231, 2017-08-09 2.2280 净值发成跳变
    '006767', // 2019-12-11 1.0188, 2019-12-12 1.5561 净值发成跳变
    '003255', // 净值跳变
    '003254', // 净值跳变
    '001387', // 净值跳变
    '006401', // 净值跳变
    '003793',
    '006471',
  ]
}

function run() {
  return db.update('fund_info', { calc_ignore: 0 }).then(() => {
    return Promise.all([
      calc1(),
      calc2(),
      calc3()
    ]).then(res => {
      return [...new Set(_.reduce(res, (acc, item) => {
        acc = acc.concat(item)
        return acc
      }, []))]
    }).then(code => {
      console.log('update code.length', code.length)
      return db.update('fund_info', { calc_ignore: 1 }, { code })
    })
  }).then(r => {
    console.log(r)
    db.end()
  }).catch(err => {
    console.log(err)
    db.end()
  })
}

run()

