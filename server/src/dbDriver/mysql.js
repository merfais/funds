const _ = require('lodash')
const mysql = require('mysql2')
const logger = require('../utils/logger').genLogger('dbDriver/mysql')

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
        if (/(not)? *in/.test(value.operator)) { // operator: 'in', 'not in'
          subArr.push(key)
          subArr.push(value.value)
          return `?? ${value.operator} (?)`
        } else if (/is *(not)?|!=|>|<|>=|<=/.test(value.operator)) {  // operator: 'is', 'is not', '!=', '>', '<', '>=', '<='
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


class Mysql {
  constructor() {
    this.table = {
      fundDailyState: 'fund_daily_state',
      fundInfo: 'fund_info',
      dailyAbnormal: 'daily_abnormal',
    }
  }

  init(conf) {
    const mysqlConf = conf.get('mysql', {})
    this.pool = mysql.createPool({
      ..._.pick(mysqlConf, [
        'host',
        'port',
        'localAddress',
        'socketPath',
        'user',
        'password',
        'database',
        'charset',
        'timezone',
        'connectTimeout',
        'stringifyObjects',
        'insecureAuth',
        'typeCast',
        'queryFormat',
        'supportBigNumbers',
        'bigNumberStrings',
        'bigNumberStrings',
        'dateStrings',
        'localInfile',
        'multipleStatements',
        'flags',
        'ssl',
        // pool options
        'acquireTimeout',
        'waitForConnections',
        'connectionLimit',
        'queueLimit',
      ]),
    }).promise()
    return this
  }

  close() {
    return this.pool.end()
  }

  query(sqlStr, dataArr, prefix) {
    prefix = prefix || ''
    const options = { sql: sqlStr }
    if (dataArr && dataArr.length) {
      options.values = dataArr
    }
    const start = Date.now()
    return this.pool.query(options).then(([ result, fields ]) => {
      const end = Date.now()
      const cost = ((end - start) / 1000).toFixed(2) + 's'
      if (sqlStr.match(/^select/i)) {
        logger.info(prefix, 'select success', cost, result && result.length)
        // logger.log(prefix, 'fields', _.map(fields, item => item.name))
        // logger.log(prefix, 'result', _.map(result, item => json.stringify(item)))
      } else if (sqlStr.match(/^insert/i)) {
        logger.info(prefix, 'insert success', cost, result && result.info)
        // logger.log(prefix, 'result', result)
        // insert fields = undefined
      } else if (sqlStr.match(/^update/i)) {
        logger.info(prefix, 'update success', cost, result && result.info)
      }
      return { result, fields }
    }).catch(err => {
      const end = Date.now()
      const cost = ((end - start) / 1000).toFixed(2) + 's'
      if (sqlStr.match(/^select/i)) {
        logger.error(prefix, 'select fail', cost, 'queryStr = ')
      } else if (sqlStr.match(/^insert/i)) {
        logger.error(prefix, 'insert fail', cost, 'queryStr = ')
      } else if (sqlStr.match(/^update/i)) {
        logger.error(prefix, 'update fail', cost, 'queryStr = ')
      }
      const queryStr = mysql.format(sqlStr, dataArr)
      logger.error(queryStr)
      logger.error(err)
      return Promise.reject(err)
    })
  }

  execQuery(tableName, sqlStr, dataArr) {
    const sid = Math.random().toString(16).slice(2, 6)
    const prefix = `${sid} [${tableName}]`
    // const queryStr = mysql.format(sqlStr, dataArr)
    // logger.log(`[${sid}]`, queryStr)
    return this.query(sqlStr, dataArr, prefix)
  }

  select(arg = {}) {
    const { tableName } = arg
    const { sqlStr, dataArr } = this.buildSelect(arg)
    return this.execQuery(tableName, sqlStr, dataArr)
  }

  update(tableName, data, where) {
    if (_.isEmpty(data)) {
      logger.warn(`${tableName} update empty data`)
      return Promise.resolve()
    }
    let sqlStr = 'update ?? set ?'
    let dataArr = [tableName, data]
    where = this.buildWhere(where)
    sqlStr += where.sqlStr
    dataArr = dataArr.concat(where.dataArr)
    return this.execQuery(tableName, sqlStr, dataArr)
  }

  insert(tableName, data) {
    if (_.isEmpty(data)) {
      logger.warn(`${tableName} insert empty data`)
      return Promise.resolve()
    }
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
    return this.execQuery(tableName, sqlStr, dataArr)
  }

  format(tpl, data) {
    if (tpl.sqlStr) {
      return mysql.format(tpl.sqlStr, tpl.dataArr)
    }
    return mysql.format(tpl, data)
  }

  buildSelect({
    tableName,
    fields,
    where,
    ext, // { orderSort, limit, groupBy }
  } = {}) {
    let sqlStr = 'select '
    let dataArr = []

    const fieldRst = this.buildField(fields)
    sqlStr += fieldRst.sqlStr
    dataArr = dataArr.concat(fieldRst.dataArr)

    sqlStr += ' from ??'
    dataArr = dataArr.concat(tableName)

    const whereRst = this.buildWhere(where)
    sqlStr += whereRst.sqlStr
    dataArr = dataArr.concat(whereRst.dataArr)

    const extRst = this.buildExt(ext)
    sqlStr += extRst.sqlStr
    dataArr = dataArr.concat(extRst.dataArr)
    // logger.info('select str:', sqlStr)
    return { sqlStr, dataArr }
  })

  buildField(fields) {
    let sqlStr = ''
    let dataArr = []
    if (_.isString(fields)) { // 单个字段
      sqlStr += '??'
      dataArr = [fields]
    } else if (_.isArray(fields)) { // 多个字段 ['a', 'b']
      sqlStr += _.reduce(fields, (acc, field, index) => {
        if (_.isArray(field) && field.length === 2) { // [[a, aa], b]  => select `a` as `aa`, `b` from
          acc.push('?? as ??')
        } else if (_.isPlainObject(field)) {
          if (field.count) {    // [{ count: ['a', 'aa'] }, b] => // select count(`a`) as `aa`, `b` from
            if (_.isString(field.count)) {  // 简写 {count: 'a'}, 自动添加 as `count`
              field.count = [field.count, 'count']
            }
            acc.push('count(??) as ??')
            fields[index] = field.count
          }
        } else {
          acc.push('??')
        }
        return acc
      }, []).join(',')
      dataArr = _.flatten(fields)
    } else if (_.isPlainObject(fields)) { // { distinct: [], }

    } else {
      sqlStr += '*'
    }
    return { sqlStr, dataArr }
  }

  buildWhere(where) {
    // where object === and， array === or
    let sqlStr = ''
    let dataArr = []
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

  buildExt(ext) {
    let sqlStr = ''
    const dataArr = []
    if (ext) {
      if (ext.groupBy) {
        sqlStr += ' group by ??'
        dataArr.push(ext.groupBy)
      }
      if (ext.orderSort) {  // orderSort: { field: 'desc' }
        sqlStr += ' order by'
        sqlStr += _.map(ext.orderSort, (v, k) => {
          dataArr.push(k)
          return ` ?? ${v}`
        }).join(',')
      }
      if (ext.limitOffset) {
        if (_.isArray(ext.limitOffset)) { // limitOffset: [5, 10] => limit 5, 10 // offset:5, Offset 10
          sqlStr += ' limit ?, ?'
          dataArr.push(...ext.limitOffset)
        } else {
          sqlStr += ' limit ?'
          dataArr.push(ext.limitOffset)
        }
      }
    }
    return { sqlStr, dataArr }
  }

}

module.exports = new Mysql()
