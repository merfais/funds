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
    // logger.log(`[${sid}]`, queryStr)
    const start = Date.now()
    return pool.query(sqlStr, values).then(([ result, fields ]) => {
      const end = Date.now()
      const cost = ((end - start) / 1000).toFixed(2) + 'ms'
      if (typeName === 'select') {
        logger.info(prefix, 'success', cost, result && result.length)
        // logger.log(prefix, 'fields', _.map(fields, item => item.name))
        // logger.log(prefix, 'result', _.map(result, item => JSON.stringify(item)))
      } else if (typeName === 'insert') {
        logger.info(prefix, 'success', cost, result && result.info)
        // logger.log(prefix, 'result', result)
        // insert fields = undefined
      }
      return { result, fields }
    }).catch(err => {
      logger.error(prefix, 'failed, queryStr = \n', queryStr)
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


function select(tableName, fields, where, ext) {
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
  // where object === and， array === or
  if (!_.isEmpty(where)) {
    sqlStr += 'where '
    if (_.isArray(where)) { // array使用or连接
      sqlStr += _.map(where, (v, k) => {
        if (_.isArray(v)) {
          // TODO: 1个key多个value使用or连接
        } else {
          // 1个key对应1个value
          arr.push(k)
          arr.push(v)
          return '??=?'
        }
      }).join(' or ')
    } else if (_.isPlainObject(where)) {  // Object 使用 and 连接
      sqlStr += _.map(where, (value, key) => {
        if (_.isArray(value)) {
          // TODO: 1个key多个value使用or连接
          return '(' + _.map(value, v => {
            arr.push(key)
            arr.push(v)
            return '??=?'
          }).join('or') + ') '
        } else {
          // 1个key对应1个value
          arr.push(key)
          arr.push(value)
          return '??=?'
        }
      }).join(' and ')
    }
  }

  if (ext && ext.orderSort) {
    let orderSort = _.cloneDeep(ext.orderSort)
    if (_.isPlainObject(orderSort)) {
      orderSort = [orderSort]
    }
    if (_.isArray(ext.orderSort)) {
      sqlStr += ' order by '
      sqlStr += _.map(ext.orderSort, (v, k) => {
        arr.push(k)
        return `?? ${v}`
      }).join(',')
    }
  }
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
  format: mysql.format,
  pool,
  insert,
  select,
  end,
}
