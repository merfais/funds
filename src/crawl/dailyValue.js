const util = require('util')
const _ = require('lodash')
const chalk = require('chalk')
const datefns = require('date-fns')
const {
  insertDailyState,
  flushInsertCache,
  setFundStartAt,
  close,
} = require('./db')
const {
  requestQ,
  request,
  logger,
} = require('../utils')
const {
  genFundDailyValueOptions,
} = require('./options')
const exception = require('./exception')
const {
  state
} = require('./state')

// 抓取每日基金净值总数
function getFundDailyValueCount(fund, errorList, retryTimes) {
  const { code, value_updated_at } = fund
  const options = genFundDailyValueOptions(code, value_updated_at, 10, 1000)
  logger.info(options._sid_, `>>>>>> 请求基金[${code}]每日净值总数进入队列`)
  return requestQ(options, () => {
    logger.info(options._sid_, `===> 请求基金(${code})每日净值总数, ${value_updated_at}`)
  }).then(ack => {
    if (ack && ack.data) {
      const rst = ack.data.match(/\((.*)\)/)
      try {
        ack = JSON.parse(rst && rst[1])
        const totalCount = _.get(ack, 'TotalCount', 0)
        logger.info(options._sid_, `<=== 响应基金(${code})每日净值总数 = ${totalCount}, ${value_updated_at}`)
        return totalCount
      } catch(err) {
        logger.error(options._sid_, `响应基金每日净值返回值JSON.parse出错, code = ${code}\n`, rst)
        errorList.push(options)
        return 0
      }
    } else {
      logger.error(options._sid_, `响应基金每日净值总数返回值为空, code = ${code}`)
      return Promise.reject(ack)
    }
  }).catch(err => {
    logger.error(options._sid_, '响应基金每日净值总数发生错误，ack=', ack)
    retryTimes += 1
    if (retryTimes >= 5) {
      logger.error(options._sid_, `请求基金每日净值总数重试次数用尽, code = ${code}`)
      errorList.push(options)
      return 0
    } else {
      logger.error(options._sid_, `请求基金每日净值总数进行重试 ${retryTimes}, code = ${code}`)
      return getFundDailyValueCount(fund, errorList, retryTimes)
    }
  })
}

// 抓取一个每日基金净值信息
function getFundDailyValue(params, errorList, retryTimes) {
  const { code, start, page, size } = params
  const options = genFundDailyValueOptions(code, start, page, size)
  // logger.log(options._sid_, `>>>>>> 请求基金[${code}]每日净值进入队列 page = ${page}`)
  return requestQ(options, () => {
    logger.info(options._sid_, `===> 请求基金(${code})每日净值, start=${start}, page=${page}`)
  }).then(ack => {
    logger.info(options._sid_, `<=== 响应基金(${code})每日净值, start=${start}, page=${page}`)
    if (ack && ack.data) {
      const rst = ack.data.match(/\((.*)\)/)
      let list = []
      try {
        ack = JSON.parse(rst && rst[1])
        if (_.isObject(ack)) {
          list = _.get(ack, 'Data.LSJZList', [])
        }
      } catch(err) {
        logger.error(options._sid_, `响应基金每日净值返回值JSON.parse出错, code = ${code}, page = ${page}\n`, ack)
        errorList.push(options)
      }
      const valArr = []
      const exceptionState = []
      _.forEach(list, (item, index) => {
        const state = {
          code: code,
          date: item.FSRQ,
          value: item.DWJZ,
          total_value: item.LJJZ,
          bonus: item.FHFCZ || 0,
          increase_rate: item.JZZZL,
          bonus_des: item.FHSP || '',
          redemption: item.SHZT || '',
          purchase: item.SGZT || '',
          raw_state: 0,
          increase_rate_raw_state: 0,
        }
        if ((!item.DWJZ && item.DWJZ !== 0)
          || (!item.LJJZ && item.LJJZ !== 0)
        ) {
          logger.warn('基金净值异常：', code, item.FSRQ)
          const tmp = `date:${item.FSRQ},value:${item.DWJZ},`
            + `total_value:${item.LJJZ}`
          exceptionState.push(tmp)
          state.raw_state = 1
          state.value = item.DWJZ || null
          state.total_value = item.LJJZ || null
        }
        if (!item.JZZZL && item.JZZZL !== 0) {
          state.increase_rate_raw_state = 1
          state.increase_rate = null
        }
        valArr.push(state)
      })
      if (exceptionState.length) {
        logger.warn(`基金${code}净值返回值异常共${exceptionState.length}个`)
        exception.saveFundDailyState(`${code}\n${exceptionState.join('\n')}`)
      }
      logger.info(options._sid_, `+++> 基金${code}净值写入数据库, 数据长度 =`, valArr.length)
      insertDailyState(valArr).then(res => {
        const level = res ? 'info' : 'log'
        logger[level](options._sid_, `<+++ 基金${code}净值写入数据库成功`, valArr.length)
      }).catch(err => {
        logger.error(options._sid_, `<+++ 基金${code}净值写入数据库失败`, valArr.length)
      })
    } else {
      logger.error(options._sid_, `响应基金每日净值返回值为空, code = ${code}, page=${page}`)
      return Promise.reject(ack)
    }
  }).catch(err => {
    logger.error(options._sid_, '响应基金每日净值发生错误，ack=', err)
    retryTimes += 1
    if (retryTimes >= 5) {
      logger.error(options._sid_, `请求基金每日净值重试次数用尽, code = ${code}, page = ${page}`)
      errorList.push(options)
    } else {
      logger.error(options._sid_, `请求基金每日净值进行重试 ${retryTimes}, code = ${code}, page = ${page}`)
      return getFundDailyValue(params, errorList, retryTimes)
    }
  })
}

// 抓取一组（200个）基金的每日净值
function getFundDailyValueMulti(arr) {
  state.requestFundDailyValueCount += 1
  const sid = `[${Math.random().toString(16).slice(2, 6)}]`
  const length = arr.length
  logger.info(sid, '---> 批量请求基金每日净值，基金数量：', length)
  const today = datefns.format(new Date(), 'yyyy-MM-dd')
  const errors = []
  let arrCount = 0

  function multiReqEnd() {
    state.requestFundDailyValueCount -= 1
    logger.info(sid, '<--- 批量请求基金每日净值全部返回，基金数量：', length)
    logger.info(sid, JSON.stringify(state))
    if (state.requestFundDailyValueCount <= 0
      && state.requestFundDetailCount <= 0
      && state.requestFundListOver
    ) {
      flushInsertCache().then(() => {
        return setFundStartAt()
      }).catch(err => {
        logger.error('写入数据库出现错误', err)
      }).then(() => {
        close()
      })
    }
    if (errors.length) {
      logger.error(sid, '批量请求基金每日净值错误汇总：')
      logger.error(sid, errors)
    }
  }

  _.forEach(arr, item => {
    const retryTimes = 0
    if (item.value_updated_at && datefns.isAfter(new Date(item.value_updated_at), new Date(today))) {
      arrCount += 1
      logger.info(sid, `基金${item.code}净值最后更新日期${item.value_updated_at}大于今天${today}, 取消请求, ${arrCount}, ${length}`)
      // logger.log(sid, `批量请求基金每日净值已有 ${chalk.green(arrCount)} 个请求返回，批量长度是${length}`)
      if (arrCount >= length) {
        multiReqEnd()
      }
      return true
    }
    getFundDailyValueCount(item, errors, retryTimes).then(totalCount => {
      let size = 1000
      if (totalCount < 20) {
        size = 20
      } else if (totalCount < 1000) {
        size = totalCount
      }
      const totalPage = Math.ceil(totalCount / size)
      let page = 0
      let count = 0
      if (totalCount === 0) {
        arrCount += 1
        if (arrCount >= length) {
          multiReqEnd()
        }
      }
      while (page < totalPage) {
        const params = {
          code: item.code,
          start: item.value_updated_at,
          page: totalPage - page,
          size,
        }
        getFundDailyValue(params, errors, retryTimes).then(() => {
          count += 1
          if (count >= totalPage) {
            arrCount += 1
            // logger.info(sid, `批量请求基金每日净值已有 ${chalk.green(arrCount)} 个请求返回，批量长度是${length}`)
            if (arrCount >= length) {
              multiReqEnd()
            }
          }
        })
        page += 1
      }
    })
  })
}

module.exports = {
  getFundDailyValueMulti,
  getFundDailyValue,
}
