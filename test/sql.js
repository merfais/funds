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


db.insert('test', arr).then(data => {
  db.end().then(d => {
    console.log('---------------', d)
  })
})

db.select('test', ['name', 'sex'], { name: 'xiaoming', age: 11 }).then(data => {
  db.end().then(d => {
    console.log('---------------', d)
  })
})


