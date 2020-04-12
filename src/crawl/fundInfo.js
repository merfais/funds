const _ = require('lodash')
const chalk = require('chalk')
const datefns = require('date-fns')
const {
  selectFundList,
  flushCache,
  updateFundList,
} = require('./db')
const {
  requestQ,
  request,
  logger,
} = require('../utils')
const {
  genAllFundOptions,
} = require('./options')
const {
  getFundDetailMulti,
} = require('./fundDetail')
const {
  getFundDailyValueMulti,
} = require('./dailyValue')
const {
  state
} = require('./state')

// 基金列表每条数组字段对应值
const fundInfo = {
  code: 0,
  name: 1,
  name_jp: 2,
}

// 解析基金列表数据
// 返回未入库的基金信息
function parseData(data, map) {
  return _.reduce(data, (rst, item) => {
    const code = item[fundInfo.code]
    if (!map.has(code)) {
      rst.fresh.push(_.reduce(fundInfo, (acc, index, key) => {
        acc[key] = item[index]
        return acc
      }, { value_updated_at: '' }))
    } else {
      rst.old.push({
        code,
        value_updated_at: map.get(code) || '',
      })
    }
    return rst
  }, {
    fresh: [],   // 未入库的基金
    old: [],     // 已入库的基金
  })
}


// 抓取基金列表
// 1、对已经入库的基金（TODO: 更新）
//    对未入库的基金（新增）入库
let fundTotalPage = -1
function getAllFund(page, map, retryTimes, errorList) {
  const size = 200
  const options = genAllFundOptions(page, size)
  let reqHandler = requestQ
  if (fundTotalPage === -1 || retryTimes) {
    fundTotalPage = 0
    reqHandler = request
  }
  // logger.log(options._sid_, `>>>>>> 请求基金列表, page = ${page} 进入队列`)
  return reqHandler(options, () => {
    logger.info(options._sid_, `===> 请求基金列表, page = ${page}`)
  }).then(ack => {
    if (ack && ack.data) {
      try {
        eval(ack.data) // eval后会出现db这个变量
        const data = db.datas || []
        logger.info(options._sid_, `<=== 响应基金列表, page = ${db.curpage}, total = ${db.pages}`)
        fundTotalPage = db.pages
        const rst = parseData(data, map)
        // 对未入库的基金，抓取详细信息，然后入基金列表库
        if (rst.fresh.length) {
          logger.info(options._sid_, `新增基金${rst.fresh.length}个,开始批量请求基金详细信息`)
          getFundDetailMulti(rst.fresh)
        }
        // 对于已经入库的基金，抓取每日基金净值信息，入库
        if (rst.old.length) {
          logger.info(options._sid_, `${rst.old.length}个基金开始批量请求基金净值信息`)
          getFundDailyValueMulti(rst.old)
        }
      } catch (e) {
        logger.error(options._sid_, `<=== 响应基金列表返回值解析出错, page = ${page}, total = ${fundTotalPage}`)
        logger.error(options._sid_, e)
        errorList.push(options)
      }
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
        return new Promise(res => setTimeout(res, 5000)).then(() => {
          return getAllFund(page, map, retryTimes, errorList)
        })
      }
    }
  })
}

function fetchFundData() {
  const sid = `[${Math.random().toString(16).slice(2, 6)}]`
  updateFundList().then(() => {
    return selectFundList().then(res => {
      const map = new Map()
      _.forEach(res, item => {
        if (item.value_updated_at) {
          let value = new Date(item.value_updated_at)
          value = datefns.format(datefns.addDays(value, 1), 'yyyy-MM-dd')
          map.set(item.code, value)
        } else {
          map.set(item.code, '')
        }
      })
      return map
    })
  }).then(map => {
    logger.info(sid, '------------------开始请求基金列表---------------------')
    const retryTimes = 0
    const errors = []
    getAllFund(1, map, retryTimes, errors).then(totalPage => {
      logger.info(sid, '请求基金列表第一次返回，totalPage =', totalPage)
      logger.info(sid, '---> 启动批量请求基金列表')
      let i = 2
      let j = 1
      // totalPage = 3   // FIXME: 测试删除
      while (i <= totalPage) {
        getAllFund(i, map, retryTimes, errors).then(() => {
          logger.log(sid, `批量请求基金列表已有 ${chalk.green(j)} 个请求返回，批量长度是${totalPage - 1}`)
          if (j >= totalPage - 1) {
            state.requestFundListOver = true
            logger.info(sid, `<--- 批量请求基金列表全部返回`)
            if (errors.length) {
              logger.error(sid, '批量请求基金列表错误汇总：')
              logger.error(sid, errors)
            }
          }
          j += 1
        })
        i += 1
      }
    })
  })
}

module.exports = {
  fetchFundData,
  getAllFund,
}


// 抓取一个每日基金净值信息
// function getFundDailyValue(code, errorList, retryTimes, page) {
//   const options = genFundDailyValueOptions(code, '', page, 1)
//   logger.info(options._sid_, `===> 请求基金每日净值, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
//   return requestQ(options).then(ack => {
//     logger.info(options._sid_, `<=== 响应基金每日净值, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
//     if (ack && ack.data) {
//       const rst = ack.data.match(/\((.*)\)/)
//       let list = []
//       let totalCount = 0
//       if (rst && rst[1]) {
//         try {
//           ack = JSON.parse(rst[1])
//           return {
//             updated_at: _.get(ack, 'Data.LSJZList[0].FSRQ', ''),
//             total: _.get(ack, 'TotalCount', 0),
//           }
//         } catch(err) {
//           logger.error(options._sid_, `响应基金每日净值返回值JSON.parse出错, code = ${code}, page = ${page}\n`, err)
//           errorList.push(options)
//           return {
//             updated_at: '',
//             total: 0,
//           }
//         }
//       }
//     } else {
//       logger.error(options._sid_, `响应基金每日净值返回值为空, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
//       return Promise.reject(ack)
//     }
//   }).catch(err => {
//     logger.error(options._sid_, '响应基金每日净值发生错误，ack=', ack)
//     retryTimes += 1
//     if (retryTimes >= 5) {
//       logger.error(options._sid_, `请求基金每日净值重试次数用尽, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
//       errorList.push(options)
//       return { date: '', total: 0 }
//     } else {
//       logger.error(options._sid_, `请求基金每日净值进行重试 ${retryTimes}, code = ${code}, page = ${page}, totalCount = ${totalCount}`)
//       return getFundDailyValue(code, errorList, retryTimes, page)
//     }
//   })
// }

// // 抓取一个基金的详细信息
// function getFundDetail(code, errorList, retryTimes) {
//   const options = genFundDetailOptions(code)
//   logger.info(options._sid_, `==> 请求基金(${code})详细信息`)
//   return requestQ(options).then(ack => {
//     logger.info(options._sid_, `<== 响应基金(${code})详细信息`)
//     if (ack && ack.data) {
//       let list = []
//       const rst = ack.data.match(/\((.*)\)/)
//       if (rst && rst[1]) {
//         try {
//           ack = JSON.parse(rst[1])
//           list = ack && ack.Datas
//         } catch(err) {
//           logger.error(options._sid_, `响应基金(${code})详细信息的结果 JSON.parse 出现错误:\n`, err)
//           // 出现错误的基金记录下来
//           errorList.push(options)
//         }
//       }
//       let data = {}
//       _.forEach(list, item => {
//         if ((item.CODE + '') === (code + '')) {
//           const info = item.FundBaseInfo || {}
//           data = {
//             type_name: info.FTYPE,
//             company_id: info.JJGSID,
//           }
//           return false
//         }
//       })
//       return data
//     } else {
//       logger.error(options._sid_, `响应基金(${code})详细信息的结果为空`)
//       return Promise.reject(ack)
//     }
//   }).catch(err => {
//     logger.error(options._sid_, `响应基金(${code})详细信息发生错误，ack=`, ack)
//     retryTimes += 1
//     if (retryTimes >= 5) {
//       logger.error(options._sid_, `请求基金(${code})详情重试次用用尽`)
//       errorList.push(options)
//       return {}
//     } else {
//       logger.error(options._sid_, `请求基金(${code})详细信息进行重试`, retryTimes)
//       return getFundDetail(code, errorList, retryTimes)
//     }
//   })
// }
//
// // 抓取一组（200个）基金的详细信息
// function getFundDetailMulti(funds) {
//   const sid = `[${Math.random().toString(16).slice(2, 6)}]`
//   const length = funds.length
//   logger.info(sid, '===> 批量请求基金详细信息，基金数量：', length)
//   let i = 0
//   let count = 0
//   const errors = []
//   _.forEach(funds, fund => {
//     const retryTimes = 0
//     getFundDetail(fund.code, errors, retryTimes).then(data => {
//       Object.assign(fund, data)
//       count += 1
//       logger.log(sid, `批量请求基金详细信息已有 ${chalk.green(count)} 个请求返回，批量长度是${funds.length}`)
//       if (count >= funds.length) {
//         logger.info(sid, '基金信息写入数据库, 数据长度 = ', funds.length)
//         insertFundList(funds).then(res => {
//           const level = res ? 'info' : 'log'
//           logger[level](sid, '基金信息写入数据库成功', funds.length)
//         }).catch(err => {
//           logger.error(sid, '基金信息写入数据库失败', funds.length)
//         })
//         if (errors.length) {
//           logger.error(sid, '批量请求基金详细信息错误汇总：')
//           logger.error(sid, errors)
//         }
//       }
//     })
//   })
//
//       // function success(data) {
//       //   count += 1
//       //   Object.assign(fund, data)
//       //   if (count === 2) {
//       //     insertFundList([fund]).catch(err => {
//       //       logger.error(sid, '基金信息写入数据库失败', funds.length)
//       //     })
//       //     i += 1
//       //     logger.log(sid, `批量请求基金详细信息已有 ${chalk.green(i)} 个请求返回，批量长度是${funds.length}`)
//       //     if (i >= funds.length) {
//       //       logger.info(sid, '<=== 批量请求基金详细信息全部返回，基金数量：', length)
//       //       if (errors.length) {
//       //         logger.error(sid, '批量请求基金详细信息错误汇总：')
//       //         logger.error(sid, errors)
//       //       }
//       //     }
//       //   }
//       // }
//       // const retryTimes = 0
//       // getFundDetail(fund.code, errors, retryTimes).then(success)
//       // getFundDailyValue(fund.code, errors, retryTimes, 1).then(ack => {
//       //   if (ack.total) {
//       //     getFundDailyValue(funds, errors, retryTimes, ack.total).then(data => {
//       //       success({ updated_at: data.updated_at, state: 0 })
//       //     })
//       //   } else {
//       //     success({ updated_at: '', state: 1 })
//       //   }
//       // })
// }


