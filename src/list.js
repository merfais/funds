const _ = require('lodash')
const chalk = require('chalk')
const dateformat = require('date-format');
const {
  selectFundList,
  insertFundList,
  insertDailyState,
  flushCache,
} = require('./db')
const {
  request,
  randomReqest,
  logger,
} = require('./utils')
const {
  genFundDetailOptions,
  genFundDailyValueOptions,
  genAllFundOptions,
} = require('./options')
const exception = require('./exception')


// 抓取一个基金的详细信息
function getFundDetail(fund, errorList, retryTimes) {
  const options = genFundDetailOptions(fund.code)
  return randomReqest(() => {
    logger.info(options._sid_, `==> 请求基金(${fund.code})详细信息`)
  })(options).catch(e => {
    errorList.push(options)
  }).then(ack => {
    logger.info(options._sid_, `<== 响应基金(${fund.code})详细信息`)
    if (ack && ack.data) {
      let data = []
      const rst = ack.data.match(/\((.*)\)/)
      if (rst && rst[1]) {
        try {
          ack = JSON.parse(rst[1])
          data = ack && ack.Datas
        } catch(err) {
          logger.error(options._sid_, `响应基金(${fund.code})详细信息的结果 JSON.parse 出现错误:\n`, err)
          // 出现错误的基金记录下来
          errorList.push(options)
        }
      }
      _.forEach(data, item => {
        if ((item.CODE + '') === (fund.code + '')) {
          const info = item.FundBaseInfo || {}
          fund.type_name = info.FTYPE
          fund.company_id = info.JJGSID
          return false
        }
      })
    } else {
      retryTimes += 1
      logger.error(options._sid_, `响应基金(${fund.code})详细信息的结果为空`)
      logger.error(options._sid_, 'ack=', ack)
      logger.error(options._sid_, `请求基金(${fund.code})详细信息进行重试`, retryTimes)
      if (retryTimes >= 5) {
        logger.error(options._sid_, `请求基金(${fund.code})详情重试次用用尽`)
        errorList.push(options)
      } else {
        return getFundDetail(fund, errorList, retryTimes)
      }
    }
  })
}

// 抓取一组（200个）基金的详细信息
function getFundDetailMulti(arr) {
  const sid = `[${Math.random().toString(16).slice(2, 6)}]`
  const length = arr.length
  return new Promise((resolve) => {
    logger.info(sid, '===> 批量请求基金详细信息，基金数量：', length)
    let i = 0
    const errors = []
    _.forEach(arr, fund => {
      let retryTimes = 0
      setTimeout(() => (getFundDetail(fund, errors, retryTimes).then(() => {
        i += 1
        logger.log(sid, `批量请求基金详细信息已有 ${chalk.green(i)} 个请求返回，批量长度是${arr.length}`)
        if (i >= arr.length) {
          logger.info(sid, '<=== 批量请求基金详细信息全部返回，基金数量：', length)
          resolve({ funds: arr, errors })
        }
      })))
    })
  }).then(({ funds, errors }) => {
    // 新增基金信息入库
    logger.info(sid, '基金信息写入数据库, 数据长度 = ', funds.length)
    insertFundList(funds).then(res => {
      const level = res ? 'info' : 'log'
      logger[level](sid, '基金信息写入数据库成功', funds.length)
    }).catch(err => {
      logger.error(sid, '基金信息写入数据库失败', funds.length)
    })
    if (errors.length) {
      logger.error(sid, '批量请求基金详细信息错误汇总：')
      logger.error(sid, errors)
    }
  })
}


// 抓取一个每日基金净值信息
function getFundDailyValue(params, errorList, retryTimes) {
  const size = 200
  const { code, start, page, totalCount } = params
  const options = genFundDailyValueOptions(code, start, page, size)
  return randomReqest(() => {
    logger.info(options._sid_, `===> 请求基金每日净值, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
  })(options).then(ack => {
    logger.info(options._sid_, `<=== 响应基金每日净值, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
    if (ack && ack.data) {
      const rst = ack.data.match(/\((.*)\)/)
      let list = []
      let totalCount = 0
      if (rst && rst[1]) {
        try {
          ack = JSON.parse(rst[1])
          if (_.isObject(ack)) {
            list = _.get(ack, 'Data.LSJZList', [])
            totalCount = ack.TotalCount
          }
        } catch(err) {
          logger.error(options._sid_, `响应基金每日净值返回值JSON.parse出错, code = ${code}, page = ${page}\n`, err)
          params.totalCount = 0
          errorList.push(options)
          return params
        }
      }
      const valArr = []
      const exceptionState = []
      _.forEach(list, item => {
        if (item.FSRQ !== start) {
          const state = {
            fund_code: code,
            date: item.FSRQ,
            value: item.DWJZ,
            total_value: item.LJJZ,
            bonus: item.FHFCZ || 0,
            bonus_des: item.FHSP,
            redemption: item.SHZT,
            purchase: item.SGZT,
            increase_rate: item.JZZZL || '0.00',
          }
          let hasException = null
          if ((!state.value && state.value !== 0)
            || (!state.total_value && state.total_value !== 0)
            || (!state.increase_rate && state.increase_rate !== 0)
            || !state.purchase
            || !state.redemption
          ) {
            const tmp = Object.assign({}, state)
            exceptionState.push(tmp)
            logger.log('基金净值返回值异常：', tmp, item)
            state.value = state.value || '0.00'
            state.total_value = state.total_value || '0.00'
            state.increase_rate = state.increase_rate || '0.00'
            state.purchase = state.purchase || ''
            state.redemption = state.redemption || ''
          }
          valArr.push(state)
        }
      })
      if (exceptionState.length) {
        exception.saveFundDailyState(exceptionState)
      }
      logger.info(options._sid_, `基金${code}净值写入数据库, 数据长度 =`, valArr.length)
      insertDailyState(valArr).then(res => {
        const level = res ? 'info' : 'log'
        logger[level](options._sid_, `基金${code}净值写入数据库成功`, valArr.length)
      }).catch(err => {
        logger.error(options._sid_, `基金${code}净值写入数据库失败`, valArr.length)
      })
      if (totalCount > page * size) {
        params.page += 1
        params.totalCount = totalCount
      } else {
        params.totalCount = 0
      }
      return params
    } else {
      retryTimes += 1
      logger.error(options._sid_, `<=== 响应基金每日净值返回值为空, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
      logger.error(options._sid_, 'ack=', ack)
      logger.error(options._sid_, `<=== 请求基金每日净值进行重试 ${retryTimes}, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
      if (retryTimes >= 5) {
        logger.error(options._sid_, `<=== 请求基金每日净值重试次数用尽, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
        errorList.push(options)
        params.totalCount = 0
        return params
      } else {
        return getFundDailyValue(params, errorList, retryTimes)
      }
    }
  })
}

let reqQueue = []
// 抓取一组（200个）基金的每日净值
function getFundDailyValueMulti(arr) {
  const sid = `[${Math.random().toString(16).slice(2, 6)}]`
  const length = arr.length
  return new Promise((resolve) => {
    logger.info(sid, '===> 批量请求基金每日净值，基金数量：', length)
    let i = 0
    const errors = []
    const next = []
    _.forEach(arr, item => {
      const params = {
        code: item.code,
        start: item.start || item.value_updated_at,
        page: item.page || 1,
        retryTimes: item.retryTimes || 0,
        totalCount: item.totalCount || 0,
      }
      if (params.page === 1) {
        params.totalCount = -1
      }
      const retryTimes = 0
      const errors = []
      setTimeout(() => (getFundDailyValue(params, errors, retryTimes).then(res => {
        i += 1
        logger.log(sid, `批量请求基金每日净值已有 ${chalk.green(i)} 个请求返回，批量长度是${arr.length}`)
        if (res.totalCount) {
          logger.log(sid, `基金(${params.code})净值共${res.totalCount}个，当前位于第${params.page - 1}页, 需要进入下一轮`)
          next.push(res)
        }
        if (i >= arr.length) {
          if (errors.length) {
            logger.error(sid, '批量请求基金每日净值错误汇总：')
            logger.error(sid, errors)
          }
          logger.info(sid, '<=== 批量请求基金每日净值全部返回，基金数量：', length)
          resolve(next)
        }
      })))
    })
  }).then(next => {
    logger.info(sid, `批量请求基金每日净值本轮数量: ${length}, 剩余${next.length}进入下一轮`)
    if (next.length) {
      reqQueue.push({
        type: 'dailyValue',
        list: next,
      })
    }
  })
}

let isFetching = false
function flushQueue() {
  logger.info(`队列调度，此时队列长度${reqQueue.length}`)
  if (isFetching) {
    logger.info('队列任务繁忙，返回')
    return
  }
  isFetching = true
  if (reqQueue.length) {
    let handler
    logger.info('队首出队，剩余队列长度:', reqQueue.length - 1)
    const top = reqQueue.shift()
    if (top.type === 'detail') {
      handler = getFundDetailMulti(top.list)
    } else {
      handler = getFundDailyValueMulti(top.list)
    }
    handler.then(() => {
      isFetching = false
      flushQueue()
    })
  } else {
    logger.info('队列已经清空')
    isFetching = false
  }
}

// 基金列表每条数组字段对应值
const fundInfo = {
  code: 0,
  name: 1,
  name_jp: 2,
}

// 解析基金列表数据
// 返回未入库的基金信息
function parseData(data, map) {
  const updated_at = dateformat('yyyy-MM-dd', new Date())
  return _.reduce(data, (rst, item) => {
    const code = item[fundInfo.code]
    if (!map.has(code)) {
      rst.insert.push(_.reduce(fundInfo, (acc, index, key) => {
        acc[key] = item[index]
        return acc
      }, { updated_at }))
    }
    rst.list.push({
      code,
      // 已经入库的开始时间使用库中记录的时间，
      // 未入库的开始时间为空
      value_updated_at: map.get(code) || '',
    })
    return rst
  }, {
    insert: [],   // 需要被插入的基金
    list: [],     // 所有的基金
  })
}


// 抓取基金列表
// 1、对已经入库的基金（TODO: 更新）
//    对未入库的基金（新增）入库
let fundTotalPage = -1
function getAllFund(page, map, retryTimes, errorList) {
  const size = 200
  const options = genAllFundOptions(page, size)
  let timeout = 5000
  if (fundTotalPage === -1) {
    timeout = 0
    fundTotalPage = 0
  }
  return randomReqest(timeout, () => {
    logger.info(options._sid_, `===> 请求基金列表, page = ${page}, total = ${fundTotalPage}`)
  })(options).then(ack => {
    if (ack && ack.data) {
      try {
        eval(ack.data) // eval后会曲线db这个变量
        logger.info(options._sid_, `<=== 响应基金列表, page = ${db.curpage}, total = ${db.pages}`)
        const data = db.datas || []
        fundTotalPage = db.pages
        const rst = parseData(data, map)
        // 对未入库的基金，抓取详细信息，然后入基金列表库
        if (rst.insert.length) {
          logger.info(options._sid_, `新增基金${rst.insert.length}个进入更新详细信息队列`)
          reqQueue.push({
            type: 'detail',
            list: rst.insert,
          })
        }
        // 对于所有基金，抓取每日基金净值信息，入库
        if (rst.list.length) {
          logger.info(options._sid_, `${rst.list.length}个基金进入更新净值队列`)
          reqQueue.push({
            type: 'dailyValue',
            list: rst.list,
          })
        }
      } catch (e) {
        logger.error(options._sid_, `<=== 响应基金列表返回值解析出错, page = ${page}, total = ${fundTotalPage}`)
        logger.error(options._sid_, e)
        errorList.push(options)
      }
      flushQueue()
      return fundTotalPage
    } else {
      retryTimes += 1
      logger.error(options._sid_, `<=== 响应基金列表返回值为空, page = ${page}, total = ${fundTotalPage}`)
      logger.error(options._sid_, 'ack=', ack)
      logger.error(options._sid_, `<=== 请求基金列表进行重试 ${retryTimes}, page = ${page}, total = ${fundTotalPage}`)
      if (retryTimes >= 5) {
        logger.error(options._sid_, `<=== 请求基金列表重试次数用尽, page = ${page}, total = ${fundTotalPage}`)
        errorList.push(options)
        return 0
      } else {
        return getAllFund(page, map, retryTimes, errorList)
      }
    }
  })
}

// 读取数据库基金列表存入map
// 开启抓取队列
function fetchFundData() {
  const sid = `[${Math.random().toString(16).slice(2, 6)}]`
  selectFundList().then(res => {
    const map = new Map()
    _.forEach(res, item => {
      map.set(item.code, item.value_updated_at)
    })
    logger.info(sid, '------------------开始请求基金列表---------------------')
    const retryTimes = 0
    const errors = []
    getAllFund(1, map, retryTimes, errors).then(totalPage => {
      logger.info(sid, '请求基金列表第一次返回，totalPage =', totalPage)
      logger.info(sid, '启动批量请求基金列表')
      let i = 2
      let j = 0
      totalPage = 3   // FIXME: 测试删除
      while (i <= totalPage) {
        getAllFund(i, map, retryTimes, errors).then(() => {
          j += 1
          logger.info(sid, `批量请求基金列表已有 ${chalk.green(j)} 个请求返回，批量长度是${totalPage - 1}`)
          if (j >= totalPage - 1 && errors.length) {
            logger.error(sid, '批量请求基金列表错误汇总：')
            logger.error(sid, errors)
          }
        })
        i += 1
      }
    })
  })
}

fetchFundData()


module.exports = {
  fetchFundData,
}
