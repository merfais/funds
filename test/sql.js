const mysql = require('mysql2')
const _ = require('lodash')
const db = require('../src/utils/db.js')

const arr = [{
  name: 'xiaoming',
  age: 11,
  sex: '男',
}, {
  name: 'xiaohong',
  sex: '女',
}, {
  name: 'xiaogang',
  age: 12,
}]

// let i = 0
// while (i < 100) {
//   db.insert('test', arr).then(data => {
//     // db.end().then(d => {
//     //   console.log('---------------', d)
//     // })
//   })
//   i += 1
// }


db.update('test', {c1: 1, c2:2}, { name: 'xiaoming' }).then(data => {
  console.log(data.result.info)
}).catch(err => {
  console.log(err)
})

// db.select('test', ['name', 'sex'], { name: 'xiaoming', age: 11 }).then(data => {
//   db.end().then(d => {
//     console.log('---------------', d)
//   })
// })

// db.select('fund_daily_state', '*', { code: '550015'}).then(data => {
//   const t = _.map(data.result, item => ({ ...item }))
//   const f = _.filter(t, item => item.redemption === '暂停赎回' && item.purchase === '暂停申购')
//   const ff = _.filter(t, item => item.redemption !== '暂停赎回' || item.purchase !== '暂停申购')
//   console.log(t.length, f.length, ff.length)
//   const tm = new Map()
//   _.forEach(t, item => {
//     tm.set(item.date, item)
//   })
//   const fm = new Map()
//   _.forEach(f, item => {
//     fm.set(item.date, item)
//     if (!tm.has(item.date)) {
//       console.log('ffffffffffffffff', item)
//     }
//   })
//   const ffm = new Map()
//   _.forEach(ff, item => {
//     ffm.set(item.date, item)
//     if (!tm.has(item.date)) {
//       console.log('ttttttttttttttttt', item)
//     }
//     if (fm.has(item.date)) {
//       console.log('xxxxxxxxxxxxxxxxx', item)
//     }
//   })
//   console.log('===', tm.size, fm.size, ffm.size)
// })
//





