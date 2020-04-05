const _ = require('lodash')
const mysql = require('mysql2')
const logger = require('./logger')


const pool = mysql.createPool({
  host: 'localhost',
  user: 'dev',
  database: 'funds',
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
    logger.log(`[${sid}]`, queryStr)
    const start = Date.now()
    return pool.query(sqlStr, values).then(([ result, fields ]) => {
      const end = Date.now()
      const cost = ((end - start) / 1000).toFixed(2) + 's'
      if (typeName === 'select') {
        logger.info(prefix, 'success', cost, result && result.length)
        // logger.log(prefix, 'fields', _.map(fields, item => item.name))
        // logger.log(prefix, 'result', _.map(result, item => JSON.stringify(item)))
      } else if (typeName === 'insert') {
        logger.info(prefix, 'success', cost, result && result.info)
        // logger.log(prefix, 'result', result)
        // insert fields = undefined
      } else if (typeName === 'update') {
        logger.info(prefix, 'success', cost, result && result.info)
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
  'insert',
  'update',
], (acc, func) => {
  acc[func] = coreExec(func)
  return acc
}, {})


function buildWhere(where) {
  let sqlStr = ''
  let dataArr = []

  function buildObject(obj) {  // {k:v,k:v,k:v} 使用 and 连接
    let subArr = []
    const subStr = _.map(obj, (value, key) => {
      if (_.isArray(value)) {     // k: []
        if (key === '()') { // {'()': [{}, {}]} ===> k = v and (k1 = v1 or k2 = v2)
          const sub = buildArray(value)
          subArr = subArr.concat(sub.subArr)
          return `(${sub.subStr})`
        } else if (_.isPlainObject(value[0])
          && _.has(value[0], 'operator')
        ) { // K:[{operator: ,value: }, {operator: ,value: }]
          // TODO:
        } else { // 1个key多个value使用in连接
          subArr.push(key)
          subArr.push(value)
          return '?? in (?)'
        }
      } else if (_.isPlainObject(value)) {
        if (_.has(value, 'operator') && _.has(value, 'value')) { // k: {operator: '', value: ''}
          if (/(not)? *in/.test(value.operator)) {
            subArr.push(key)
            subArr.push(value.value)
            return `?? ${value.operator} (?)`
          } else if (/is *(not)?|!=|>|<|>=|<=/.test(value.operator)) {
            subArr.push(key)
            subArr.push(value.value)
            return `?? ${value.operator} ?`
          }
        } else if (!/[^>=<]/.test(Object.keys(value).join(''))){    // k: {'>=': 1, '<=': 2}  ===> num >=1 and num <= 2,相同的key
          return _.map(value, (vv, vopt) => {
            subArr.push(key)
            subArr.push(vv)
            return `?? ${vopt} ?`
          }).join(' and ')
        }
      } else {                    // k: v
        // 1个key对应1个value
        subArr.push(key)
        subArr.push(value)
        return '??=?'
      }
    }).join(' and ')
    return { subArr, subStr }
  }

  function buildArray(arr) { // [{k:v},{k:v},{k:v}]使用or连接
    let subArr = []
    const subStr = _.map(arr, item => {
      const keys = Object.keys(item)
      const obj = buildObject(item)
      subArr = subArr.concat(obj.subArr)
      if (keys.length === 1) {    // {k:v}
        // 1个key与value
        return obj.subStr
      } else {                    // {k:v, k:v, k:v}
        return `(${obj.subStr})`
      }
    }).join(' or ')
    return { subArr, subStr }
  }

  if (!_.isEmpty(where)) {
    sqlStr += ' where '
    if (_.isArray(where)) { // [{k:v},{k:v},{k:v}]使用or连接
      const { subArr, subStr } = buildArray(where)
      sqlStr += subStr
      dataArr = dataArr.concat(subArr)
    } else if (_.isPlainObject(where)) {  // {k:v,k:v,k:v} 使用 and 连接
      const { subArr, subStr } = buildObject(where)
      sqlStr += subStr
      dataArr = dataArr.concat(subArr)
    }
  }
  return { sqlStr, dataArr }
}


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
  let dataArr = fields.concat(tableName)
  // where object === and， array === or
  const whereRst = buildWhere(where)
  sqlStr += whereRst.sqlStr
  dataArr = dataArr.concat(whereRst.dataArr)
  if (ext && ext.orderSort) {
    let orderSort = _.cloneDeep(ext.orderSort)
    if (_.isPlainObject(orderSort)) {
      orderSort = [orderSort]
    }
    if (_.isArray(ext.orderSort)) {
      sqlStr += ' order by '
      sqlStr += _.map(ext.orderSort, (v, k) => {
        dataArr.push(k)
        return `?? ${v}`
      }).join(',')
    }
  }
  return exec.select(tableName, sqlStr, dataArr)
}

function insert(tableName, data) {
  let sqlStr = 'insert into ?? '
  let dataArr = [tableName]
  if (data.length === 1) {
    sqlStr += 'set ?'
    dataArr = dataArr.concat([data[0]])
  } else {
    const fields = Object.keys(_.reduce(data, (acc, obj) => {
      Object.assign(acc, obj)
      return acc
    }, {})).sort()
    const fieldsHolder = _.fill(Array(fields.length), '??').join()
    // const valuesHolder = _.fill(Array(fields.length), '?').join()
    sqlStr += '(' + fieldsHolder + ') values ?'
    const values = _.map(data, obj => {
      return _.map(fields, field => obj[field])
    })
    dataArr = dataArr.concat(fields)
    dataArr.push(values)
  }
  return exec.insert(tableName, sqlStr, dataArr)
}

/*
 * data: {k:v, k:v}
 * where: {k:v, k:v} | [{k:v}, {k:v}]
 */
function update(tableName, data, where) {
  let sqlStr = 'update ?? set ?'
  let dataArr = [tableName, data]
  const whereRst = buildWhere(where)
  sqlStr += whereRst.sqlStr
  dataArr = dataArr.concat(whereRst.dataArr)
  return exec.update(tableName, sqlStr, dataArr)
}


function query(queryStr, tableName, typeName) {
  const sid = Math.random().toString(16).slice(2, 6)
  const prefix = `[${sid}] ${tableName} ${typeName}`
  // logger.log(`[${sid}]`, queryStr)
  const start = Date.now()
  return pool.query(queryStr).then(([ result, fields ]) => {
    const end = Date.now()
    const cost = ((end - start) / 1000).toFixed(2) + 's'
    logger.info(prefix, 'success', cost)
    return { result, fields }
  }).catch(err => {
    logger.error(prefix, 'failed, queryStr = \n', queryStr)
    logger.error(err)
    return Promise.reject(err)
  })
}


module.exports = {
  format: mysql.format,
  pool,
  query,
  update,
  insert,
  select,
  end,
}
