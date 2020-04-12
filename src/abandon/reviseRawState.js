const _ = require('lodash')
const db = require('./utils/db.js')
const moment = require('moment')
const chalk = require('chalk')

// select * from fund_daily_state WHERE raw_state = 1
// and code not in (
//   select code from fund_info WHERE calc_ignore = 1
// )
// and value is  null
// and (redemption != '开发赎回' or purchase != '开放申购')


db.select('fund_info', 'code', { calc_ignore: 1}).then(({ result }) => {
  const codeList = _.map(result, item => item.code)
  return db.select('fund_daily_state', '*', {
    raw_state: 1,               // 状态异常
    code: {
      operator: 'not in',       // 不在不计算的基金里面
      value: codeList
    },
    value: {
      operator: 'is',           // value没有值
      value: null,
    },
    '()': [{                    //
      redemption: {
        operator: '!=',
        value: '开发赎回',
      },
    }, {
      purchase: {
        operator: '!=',
        value: '开发申购',
      }
    }]
  })
}).then(({ result }) => {
  return Promise.all(_.map(result, item => {
    const date = item.date
    return db.select('fund_daily_state', '*', {
      code: item.code,
      date: {
        '>=': moment(item.date).subtract(10, 'd').format('YYYY-MM-DD'),
        '<=': moment(item.date).add(20, 'd').format('YYYY-MM-DD'),
      },
    })
  }))
  console.log(result.length)
}).then(list => {
  _.forEach(list, ({result}) => {
    console.log('---------------------------------------------------------------------------------')
    let code
    let date
    let redemption
    let purchase
    let raw_state = 0
    _.forEach(result, item => {
      const msg = `${item.code} ${moment(item.date).format('YYYY-MM-DD')} ${item.raw_state} ${pad(item.redemption)} ${pad(item.purchase)} ${item.bonus || '000000.000000'} ${item.bonus_des}`
      if (item.raw_state) {
        console.log(chalk.yellow(msg))
      } else {
        console.log(msg)
      }
      code = item.code
      if (raw_state) {
        if (item.purchase === purchase && item.redemption === redemption) {
          // db.update('fund_daily_state', { redemption, purchase }, { code, date, raw_state })
          console.log('update', code, raw_state, date, redemption, purchase)
        }
        return false
      } else {
        if (item.purchase) {
          purchase = item. purchase
        }
        if (item.redemption) {
          redemption = item. redemption
        }
      }
      if (item.raw_state) {
        raw_state = item.raw_state
        date = item.date
      }
    })
  })
})


function pad(v) {
  v += ''
  v += Array(12 - v.length * 2).join(' ')
  return v
}
