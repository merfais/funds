const cp = require('child_process')
const os = require('os')
const _ = require('lodash')
const chalk = require('chalk')
const moment = require('moment')
const {
  selectDailyValue,
  selectFundList,
  insertRegularInvest,
} = require('./db')
const {
  logger,
  time,
  db,
} = require('./utils')




/*
 * 获取可买入的投资日期
 * 定投日期可能遇到周末或节假日，
 * 此时会推迟到下一个开市日期,
 * 最多向后寻找一个迭代周期
 */
function getInvestDay(code, date, map, cycle = 'M') {
  let item = map[date]  // 获取当日
  // 寻找最大日期是一个周期
  const max = time.add(date, 1, cycle)
  let next = date
  // 如果date当日不存在数据，且date小于一个周期
  while(!item && time.isBefore(next, max)) {
    next = time.add(next, 1, 'd')   // 按天向后推迟，直到有数据
    item = map[next]
  }
  if (!item) {
    logger.error(
      `${code} 已寻找到${next}, 未能寻找到 ${date} 的定投日,`
      + `map.keys = ${Object.keys(map)}`
    )
    item = {
      date: time.findValidForward(date),
      raw_state: -1,
    }
  }
  return item
}

// 生成code在start这天买入基金，增加的份额
// start这天如果不能买入，则向后推迟一个周期，尝试买入
function genInvestItem(code, start, map, cycle = 'M') {
  const item = getInvestDay(code, start, map, cycle) || {}
  let shares = 0
  if (item.raw_state === 0) {
    if (/开放/.test(item.purchase)) { // 开放申购
      shares += 1 / item.value
    }
  } else {
    logger.error(`${code}净值数据异常`, item)
  }
  return {
    start,  // 计划定投的日期，当天不一定能定投
    end: item.date,  // 实际发生定投的日期
    shares,           // 增加的份额
    value: item.value, // 当天的净值
  }
}

/*
 * 计算分红和拆分
 */
function calcBonus(code, bonusList, currentItem, preItem) {
  let cashBonus = preItem.cashBonus         // 现金分红
  let increaseShares = 0    // 分红再投资增加的份额
  let preShares = preItem.shares  // 上个定投日的份额
  let preBonusShares = preItem.bonusShares  // 上个定投日分红再投资增加的份额
  _.forEach(bonusList, bonusItem => {
    // 分红日期大于上一个定投日且小于等于当前定投日，
    // 此次分红计算到收益中
    if (time.isAfter(bonusItem.date, preItem.end)
      && time.isSameOrBefore(bonusItem.date, currentItem.end)
    ) {
      if (/派现金/.test(bonusItem.bonus_des)) {   // 分红
        // 现金分红 = 上个定投日的份额 * 单位分红
        // 上个定投日的份额只包含定投产生的份额（含拆分）
        cashBonus += preShares * bonusItem.bonus
        if (bonusItem.value && !bonusItem.raw_state) {
          // 分红再投资增加的份额 = 上个定投日的份额 * 单位分红 / 分红日的净值
          // 上个定投日的份额即包含定投产生的份额也包含分红再投资产生的份额（两项均含拆分）
          // 期间多次分红，还需加上前几次分红产生的份额的累计
          increaseShares += (preShares + preBonusShares + increaseShares)
            * bonusItem.bonus / bonusItem.value
        } else {
          logger.error(`${code}分红数据异常`, bonusItem)
        }
      } else {    // 拆分
        if (bonusItem.bonus) {
          preShares *= bonusItem.bonus
          preBonusShares *= bonusItem.bonus
          increaseShares *= bonusItem.bonus
        } else {
          logger.error(`${code}拆分数据异常`, bonusItem)
        }
      }
    }
  })
  return {
    cashBonus,
    increaseShares,
    preBonusShares,
    preShares,
  }
}

/*
 * 定投后持有份额与现金分红计算
 * 分红策略选择"分红再投资"的方式，只累计持有份额
 * 分红策略选择"现金分红"的方式，还会累计分红的金额
 *
 * 累计算法：
 * 日期从后向前开始计算，因为当前定投日会用到下一个定投日的数据
 * 因此，先计算下一个定投日期的数据
 * 以最大日期的那个月的1号~31号作为第一层循环，对于第i日
 * 以迭代周期作为第二层循环，对于第n个周期，
 * 直到第n个周期的定投日小于此基金的起始日期
 *
 */
function invest({
  code,
  start,
  end,
  map,
  bonusList,
  cycle,
  minCycle = 10,
  maxCycle,
}, cpIndex) {
  maxCycle = maxCycle || minCycle
  const investList = []    // 存储定投日的净值信息
  let nextStart = start
  do {
    const item = genInvestItem(code, nextStart, map, cycle)
    investList.push(item)
    nextStart = time.add(nextStart, 1, cycle)
  } while(time.isSameOrBefore(nextStart, end))
  let all = []
  // 循环定投日净值列表，直到小于最小投资周期
  while(investList.length > minCycle) {
    const investItem = investList.shift()
    const nextItem = investList[0] || investItem
    let referValue = 0
    if (nextItem && nextItem.value) {
      referValue = investItem.shares * nextItem.value
    }
    const list = [{
      code,
      start: investItem.start,
      end: investItem.end,
      referValue,       // 持有份额参考收益，当前的份额 * 下一个交易日的单位净值
      referBonusValue: 0, // 分红再投资增加的份额参考收益，当前的份额 * 下一个交易日的单位净值
      shares: investItem.shares,   // 增加的份额
      bonusShares: 0,   // 分红再投资增加的份额
      cashBonus: 0,     // 现金分红
      purchaseCount: investItem.shares ? 1 : 0, // 投入次数，定投日可能会买入失败
      regularCount: 1,  // 定投期数
    }]
    // 循环定投日净值列表，list中当前项=前一项+定投日数据
    _.forEach(investList, (currentItem, index) => {
      if (index >= maxCycle) {
        return false
      }
      const preItem = list[index]
      const {
        cashBonus,
        increaseShares,
        preBonusShares,
        preShares,
      } = calcBonus(code, bonusList, currentItem, preItem)
      const shares = preShares + currentItem.shares
      const bonusShares = preBonusShares + increaseShares
      const nextItem = investList[index + 1] || currentItem
      let referValue = 0
      let referBonusValue = 0
      if (nextItem && nextItem.value) {
        referValue = shares * nextItem.value
        referBonusValue = bonusShares * nextItem.value
      }
      console.log(cashBonus, bonusShares)
      const item = {
        code,
        start: investItem.start,
        end: currentItem.end,
        referValue,
        referBonusValue,
        shares,
        bonusShares,
        cashBonus,
        purchaseCount: (currentItem.shares ? 1 : 0) + preItem.purchaseCount,
        regularCount: preItem.regularCount + 1,
      }
      list.push(item)
    })
    all = all.concat(list.slice(minCycle - 1, maxCycle - 1))
  }
  // send(all)
  return all
}



let codeIndex = 0
let codeList

function getCodeList(code) {
  logger.info('开始获取codeList')
  return selectFundList({
    calc_ignore: 0,
    code,
  }).then(list => {
    logger.info('获取codeList结束, list长度=', list.length)
    codeList = _.map(list, item => item.code)
  })
}

let codeMap = {}
let startIndex = 0
const step = 10
// 从codeList中取出step个code，查询出对应的每日净值数据（selectDailyValue）
// 对每日净值数据做处理，按code生成map
// map的value存储
//   start：这只基金的发行日期，第一个有净值的日期
//   end：结束日期，最后一个有净值的日期
//   map：按日期做的map，便于按日期索引净值相关信息
//     value：净值
//     redemption: 开放赎回
//     purchase: 开放申购
//     raw_state: 数据状态
//   bonusList: 按日期先后顺序的分红/拆分列表
//     bonus: 分红，拆分值
//     bonus_des: 分红，拆分描述
//     raw_state: 数据状态
function getDailyValue(code) {
  // logger.info(`开始获取净值, startIndex=${startIndex}, step=${step}`)
  // const code = codeList.slice(startIndex, startIndex + step)
  // if (!code.length) {
  //   return Promise.resolve()
  // }
  startIndex += step
  return selectDailyValue({
    code,
    date: {
      operator: '>=',
      value: '2018-02-9',
    },
    redemption: {
      operator: '!=',
      value: '封闭期',
    },
    redemption: {
      operator: '!=',
      value: '认购期',
    },
    purchase: {
      operator: '!=',
      value: '封闭期',
    },
    purchase: {
      operator: '!=',
      value: '认购期',
    },
  }, { date: 'asc' }).then(list => {
    logger.info(`获取净值结束, startIndex = ${startIndex}, list长度=`, list.length)
    _.forEach(list, (item) => {
      const date = moment(item.date).format('YYYY-MM-DD')
      if (!codeMap[item.code]) {
        logger.info('codeMap增加code', item.code)
        codeMap[item.code] = {
          start: date,
          end: date,
          map: {},          // 按日期map的净值数据
          bonusList: [],    // 分红list
        }
      }
      const value = Number.parseFloat(item.value)
      const raw_state = Number.parseInt(item.raw_state) || 0
      const info = {
        date,
        value,
        // redemption: item.redemption,
        purchase: item.purchase,
        raw_state,
      }
      codeMap[item.code].map[date] = info
      if (time.isSameOrAfter(codeMap[item.code].start, date)) {
        codeMap[item.code].start = date
      }
      if (time.isSameOrBefore(codeMap[item.code].end, date)) {
        codeMap[item.code].end = date
      }
      const bonus = Number.parseFloat(item.bonus)
      if (bonus) {    // 分红列表时间正序
        codeMap[item.code].bonusList.push({
          date,
          value,    // 计算分红再投资需要净值
          bonus,
          bonus_des: item.bonus_des,
          raw_state,
        })
      }
    })
    return list.length
  })
}

// 生成某只基金最开始的定投日期（1~28号）
// 比如基金的开始发行（有净值数据）的日期是2018年4月24日
// 则生成从2018年4月24日到2018年5月23日的数据，
function genCycle(investStart, code, cycle = 'M') {
  const [ year, month, day ] = investStart.split('-')
  return _.map(Array(28), (t, i) => {
    i += 1
    let start = `${year}-${month}-${time.addLeftZero(i)}`
    // 无差别1~28循环，会出现小于investStart的日期，
    // 出现后则向后加上一个定投周期
    while (time.isBefore(start, investStart)) {
      start = time.add(start, 1, cycle)
    }
    return { start, code, cycle }
  })
}

let cycleList = []
let cycleType = 'M'

// 按顺序取出基金列表的当前（codeIndex）的基金code
// 生成这个code对应的的起始定投list共28个（1~28号）
// 并入cycleList列表中，计算定投的子进程从cycleList逐条取数据
function genCycleList() {
  if (codeIndex >= codeList.length) {
    return
  }
  const code = codeList[codeIndex]
  codeIndex += 1
  const data = codeMap[code]
  if (data) {
    const list = genCycle(data.start, code, cycleType)
    cycleList = cycleList.concat(list)
    logger.info(`生成${code}的定投列表，codeIndex=${codeIndex - 1}, list长度=${list.length}, cycleList长度=${cycleList.length}`)
  } else {
    codeIndex -= 1  // 还有生成codeMap，回退指针
    logger.error(`未找到code=${code}的净值数据`)
  }
}

// function insertDb(index) {
//   // if (data && data.length) {
//   //   logger.info(`异步插入子进程${index}的数据，code=${data[0] && data[0].code}数据长度=${data.length}`)
//   //   insertRegularInvest(data)
//   // }
//   if (cycleList.length) {
//     send(index)
//   } else {
//     getDailyValue().then(() => {
//       genCycleList()
//       if (startIndex < codeList.length && cycleList.length) {
//         send(index)
//       } else {
//         stop(index)
//       }
//     })
//   }
//   if (cycleList.length < 2 * cpuCount) {
//     genCycleList()
//     if (codeIndex + cpuCount > startIndex) {
//       getDailyValue()
//     }
//   }
// }

const cpuCount = 6

const startTimestamp = Date.now()

// const spList = _.map(Array(cpuCount), (i, index) => {
//   const sp = cp.fork(`${__dirname}/invest.js`)
//   sp.on('message', msg => {
//     const duration = Date.now() - startTimestamp
//     logger.info(
//       `收到子进程 ${msg.index} 数据:`
//       + ` --------------耗时：${(duration / 1000).toFixed(2)}s`
//     )
//     insertDb(index, msg.data)
//   })
//   return sp
// })

let lastCode = ''
function send() {
  while (cycleList.length > 0) {
    let item = cycleList.shift()
    const code = item.code
    const codeData = codeMap[code]
    if (lastCode && lastCode !== code) {
      delete codeMap[lastCode]
      lastCode = code
    }
    item = {
      ...codeMap[code],
      ...item,
      minCycle: 24,
      maxCycle: 30,
    }
    const list = invest(item)
    if (list.length) {
      console.log(list)
    }
  }
  db.end()
}

function run() {
  const code = '161903'
  getCodeList(code).then(() => {
    return getDailyValue(code)
  }).then(() => {
    genCycleList()
    send()
  })
}

run()




// (从定投日期表选最大的日期)从净值列表中选最小的日期的基金，从最小的日期开始按天增加循环
// 从净值列表中返回当天的基金净值信息（最多数据是基金的总数）
// 从定投列表中选结束日期是当天的上个定投的日的定投数据，（数据量是基金总数的几百倍）
// 计算定投日的数据，更新定投表，更新定投日期
