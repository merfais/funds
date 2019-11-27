const _ = require('lodash')
const chalk = require('chalk')
const datefns = require('date-fns')
const {
  insertDailyState,
  flushInsertCache,
} = require('./db')
const {
  requestQ,
  request,
  logger,
} = require('./utils')
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
    logger.info(options._sid_, `===> 请求基金每日净值总数, code = ${code}`)
  }).then(ack => {
    logger.info(options._sid_, `<=== 响应基金每日净值总数, code = ${code}`)
    if (ack && ack.data) {
      const rst = ack.data.match(/\((.*)\)/)
      let list = []
      let totalCount = 0
      try {
        ack = JSON.parse(rst && rst[1])
        return _.get(ack, 'TotalCount', 0)
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
      return getFundDailyValue(fund, errorList, retryTimes)
    }
  })
}

// 抓取一个每日基金净值信息
function getFundDailyValue(params, errorList, retryTimes) {
  const { code, start, page, size } = params
  const options = genFundDailyValueOptions(code, start, page, size)
  logger.log(options._sid_, `>>>>>> 请求基金[${code}]每日净值进入队列 page = ${page}`)
  return requestQ(options, () => {
    logger.info(options._sid_, `===> 请求基金每日净值, code = ${code}, page = ${page}`)
  }).then(ack => {
    logger.info(options._sid_, `<=== 响应基金每日净值, code = ${code}, page = ${page}`)
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
        if (item.FSRQ !== start) {
          const value = item.DWJZ
          const total_value = item.LJJZ
          const increase_rate = item.JZZZL
          const purchase = item.SGZT
          const redemption = item.SHZT
          let raw_state = 0
          if ((!value && value !== 0)
            || (!total_value && total_value !== 0)
            || (!increase_rate && increase_rate !== 0)
          ) {
            logger.warn('基金净值返回值异常：', code, item.FSRQ)
            raw_state = 1
            exceptionState.push({ ...item })
          }
          const state = {
            code: code,
            date: item.FSRQ,
            value: value || '0.00',
            total_value: total_value || '0.00',
            bonus: item.FHFCZ || '0.00',
            bonus_des: item.FHSP || '',
            redemption: redemption || '',
            purchase: purchase || '',
            increase_rate: increase_rate || '0.00',
            raw_state,
          }
          valArr.push(state)
        }
      })
      if (exceptionState.length) {
        logger.warn(`基金${code}净值返回值异常共${exceptionState.length}个`)
        exception.saveFundDailyState(exceptionState)
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
  const sid = `[${Math.random().toString(16).slice(2, 6)}]`
  const length = arr.length
  logger.info(sid, '---> 批量请求基金每日净值，基金数量：', length)
  const today = datefns.format(new Date(), 'yyyy-MM-dd')
  const errors = []
  let arrCount = 0
  _.forEach(arr, item => {
    const retryTimes = 0
    if (item.value_updated_at && !datefns.isBefore(new Date(item.value_updated_at), new Date(today))) {
      arrCount += 1
      logger.info(`基金${item.code}净值最后更新日期${item.value_updated_at}大于等于今天${today}, 取消请求`)
      return true
    }
    getFundDailyValueCount(item, errors, retryTimes).then(totalCount => {
      logger.log(sid, `从${item.value_updated_at}到今天，基金(${item.code})净值共${totalCount}个`)
      let size = 1000
      if (totalCount < 20) {
        size = 20
      } else if (totalCount < 1000) {
        size = totalCount
      }
      const totalPage = Math.ceil(totalCount / size)
      let page = 0
      let count = 0
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
            logger.log(sid, `批量请求基金每日净值已有 ${chalk.green(arrCount)} 个请求返回，批量长度是${length}`)
            if (arrCount >= length) {
              logger.info(sid, '<--- 批量请求基金每日净值全部返回，基金数量：', length)
              state.requestFundDailyValueCount -= 1
              if (state.requestFundDailyValueCount <= 0
                && state.requestFundDetailCount <= 0
                && state.requestFundListOver
              ) {
                flushInsertCache()
              }
              if (errors.length) {
                logger.error(sid, '批量请求基金每日净值错误汇总：')
                logger.error(sid, errors)
              }
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
