const _ = require('lodash')
const chalk = require('chalk')
const {
  insertFundList,
} = require('./db')
const {
  requestQ,
  request,
  logger,
} = require('./utils')
const {
  genFundDetailOptions,
} = require('./options')
const {
  getFundDailyValueMulti,
} = require('./dailyValue')
const {
  state
} = require('./state')

// 抓取一个基金的详细信息
function getFundDetail(code, errorList, retryTimes) {
  const options = genFundDetailOptions(code)
  // logger.log(options._sid_, `>>>>>> 请求基金(${code})详细信息进入队列`)
  return requestQ(options, () => {
    logger.info(options._sid_, `==> 请求基金(${code})详细信息`)
  }).then(ack => {
    logger.info(options._sid_, `<== 响应基金(${code})详细信息`)
    if (ack && ack.data) {
      let list = []
      const rst = ack.data.match(/\((.*)\)/)
      if (rst && rst[1]) {
        try {
          ack = JSON.parse(rst[1])
          list = ack && ack.Datas
        } catch(err) {
          logger.error(options._sid_, `响应基金(${code})详细信息的结果 JSON.parse 出现错误:\n`, err)
          // 出现错误的基金记录下来
          errorList.push(options)
        }
      }
      let data = {}
      _.forEach(list, item => {
        if ((item.CODE + '') === (code + '')) {
          const info = item.FundBaseInfo || {}
          data = {
            type_name: info.FTYPE,
            company_id: info.JJGSID,
            value_updated_at: null,
          }
          return false
        }
      })
      return data
    } else {
      logger.error(options._sid_, `响应基金(${code})详细信息的结果为空`)
      return Promise.reject(ack)
    }
  }).catch(err => {
    logger.error(options._sid_, `响应基金(${code})详细信息发生错误，ack=`, err)
    retryTimes += 1
    if (retryTimes >= 5) {
      logger.error(options._sid_, `请求基金(${code})详情重试次用用尽`)
      errorList.push(options)
      return {}
    } else {
      logger.error(options._sid_, `请求基金(${code})详细信息进行重试`, retryTimes)
      return getFundDetail(code, errorList, retryTimes)
    }
  })
}

// 抓取一组（200个）基金的详细信息
function getFundDetailMulti(funds) {
  const sid = `[${Math.random().toString(16).slice(2, 6)}]`
  const length = funds.length
  logger.info(sid, '---> 批量请求基金详细信息，基金数量：', length)
  let count = 0
  const errors = []
  _.forEach(funds, fund => {
    const retryTimes = 0
    getFundDetail(fund.code, errors, retryTimes).then(data => {
      Object.assign(fund, data)
      count += 1
      // logger.log(sid, `批量请求基金详细信息已有 ${chalk.green(count)} 个请求返回，批量长度是${funds.length}`)
      if (count >= funds.length) {
        logger.info(sid, '<--- 批量请求基金详细信息全部返回，基金数量：', length)
        logger.info(sid, '+++> 基金信息写入数据库, 数据长度 = ', funds.length)
        insertFundList(funds).then(res => {
          logger.info(sid, '<+++ 基金信息写入数据库成功', funds.length)
          logger.info(sid, `${funds.length}个基金开始批量请求基金净值信息`)
          state.requestFundDetailCount -= 1
          state.requestFundDailyValueCount += 1
          getFundDailyValueMulti(funds)
        }).catch(err => {
          logger.error(sid, '<+++ 基金信息写入数据库失败', funds.length)
        })
        if (errors.length) {
          logger.error(sid, '批量请求基金详细信息错误汇总：')
          logger.error(sid, errors)
        }
      }
    })
  })
}

module.exports = {
  getFundDetail,
  getFundDetailMulti,
}
