const _ = require('lodash')
const mysql = require('mysql2')
const logger = require('./logger')


const pool = mysql.createPool({
  host: 'localhost',
  user: 'dev',
  database: 'fund',
  password: 'dev.dev',
  connectionLimit: 100,
}).promise()

function end() {
  return pool.end()
}

function coreExec(typeName) {
  return (tableName, sqlStr, values) => {
    const sid = Math.random().toString(16).slice(2, 6)
    const prefix = `[${sid}] ${tableName} ${typeName}`
    const queryStr = mysql.format(sqlStr, values)
    logger.info(`[${sid}]`, queryStr)
    return pool.query(sqlStr, values).then(([ result, fields ]) => {
      if (typeName === 'select') {
        logger.info(prefix, 'success', result && result.length)
        logger.debug(prefix, 'fields', _.map(fields, item => item.name))
        logger.debug(prefix, 'result', _.map(result, item => JSON.stringify(item)))
      } else if (typeName === 'insert') {
        logger.info(prefix, 'success', result && result.affectedRows)
        logger.debug(prefix, 'result', result)
        // insert fields = undefined
      }
      return { result, fields }
    }).catch(err => {
      logger.error(sid, tableName, typeName, ' failed')
      logger.error(err)
      return Promise.reject(err)
    })
  }
}

const exec = _.reduce([
  'select',
  'insert'
], (acc, func) => {
  acc[func] = coreExec(func)
  return acc
}, {})


function select(tableName, fields, where) {
  let sqlStr = 'select '
  if (_.isString(fields)) {
    sqlStr += '??'
    fields = [fields]
  } else if (_.isArray(fields)) {
    sqlStr += _.fill(Array(fields.length), '??').join()
  } else {
    sqlStr += '*'
    fields = []
  }
  sqlStr += ' from ??'
  const arr = fields.concat(tableName)
  // where and
  // if (_.isObject(where) && where) {
  //   sqlStr += ' where ' + _.map(where, (v, k) => {
  //     arr.push(k)
  //     arr.push(v)
  //     return '??=?'
  //   }).join(' and ')
  // }
  return exec.select(tableName, sqlStr, arr)
}

function insert(tableName, data) {
  let sqlStr = 'insert into ?? '
  let arr = [tableName]
  if (data.length === 1) {
    sqlStr += 'set ?'
    arr = arr.concat([data[0]])
  } else {
    const fields = Object.keys(_.reduce(data, (acc, obj) => {
      Object.assign(acc, obj)
      return acc
    }, {})).sort()
    const fieldsHolder = _.fill(Array(fields.length), '??').join()
    const valuesHolder = _.fill(Array(fields.length), '?').join()
    sqlStr += '(' + fieldsHolder + ') values ?'
    const values = _.map(data, obj => {
      return _.map(fields, field => obj[field])
    })
    arr = arr.concat(fields)
    arr.push(values)
  }
  return exec.insert(tableName, sqlStr, arr)
}


module.exports = {
  pool,
  insert,
  select,
  end,
}
