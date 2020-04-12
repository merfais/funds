const _ = require('lodash')
const chalk = require('chalk')
const moment = require('moment')
const {
  insertRegularInvest,
} = require('./db')
const {
  logger,
  time,
} = require('../utils')



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
  let sharesCount = 0
  do {
    const item = genInvestItem(code, nextStart, map, cycle)
    if (item.shares) {
      sharesCount += 1
    }
    investList.push(item)
    nextStart = time.add(nextStart, 1, cycle)
  } while(time.isSameOrBefore(nextStart, end))
  let all = []
  // 可定投的次数小于最小周期的六分之五，放弃
  if (sharesCount < Math.ceil(minCycle * 5 / 6)) {
    return all
  }
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
      v1: 0,   // （参考收益 - 定投次数）/ 定投次数
      v2: 0,
      v3: 0,
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
      const purchaseCount = (currentItem.shares ? 1 : 0) + preItem.purchaseCount
      const nextItem = investList[index + 1] || currentItem
      let referValue = 0
      let referBonusValue = 0
      if (nextItem && nextItem.value) {
        referValue = shares * nextItem.value
        referBonusValue = bonusShares * nextItem.value
      }
      let v1 = 0
      let v2 = 0
      let v3 = 0
      if (purchaseCount) {
        v1 = (referValue - purchaseCount) / purchaseCount
        v2 = (referValue + referBonusValue - purchaseCount) / purchaseCount
        v3 = (referValue + cashBonus - purchaseCount) / purchaseCount
      }
      const item = {
        code,
        start: investItem.start,
        end: currentItem.end,
        referValue,
        referBonusValue,
        shares,
        bonusShares,
        cashBonus,
        purchaseCount,
        regularCount: preItem.regularCount + 1,
        v1,
        v2,
        v3,
      }
      list.push(item)
    })
    all = all.concat(list.slice(minCycle - 1, maxCycle - 1))
  }
  // send(all)
  return all
}


function insertDb(list) {

}

let index
let pending = new Set()

function send(data) {
  if (!data.length) {
    process.send({ index })
  } else {
    insertRegularInvest(data).catch(() => {}).then(() => {
      process.send({ index })
    })
  }
  // if (pending.size > 20) {
  //   logger.info(`${index} 号进程等待数据库写入操作达到 20 个`)
  //   Promise.all([...pending]).then(() => {
  //     let h = Promise.resolve()
  //     if (data && data.length) {
  //       h = insertRegularInvest(data).catch(() => {
  //       }).then(() => {
  //         pending.delete(h)
  //       })
  //       pending.add(h)
  //     }
  //     process.send({ index })
  //   })
  // } else {
  //   let h = Promise.resolve()
  //   if (data && data.length) {
  //     h = insertRegularInvest(data).catch(() => {
  //     }).then(() => {
  //       pending.delete(h)
  //     })
  //     pending.add(h)
  //   }
  //   process.send({ index })
  // }
}

process.on('message', msg => {
  index = msg.index
  let start = ''
  let code = new Set()
  const list = _.reduce(msg.data, (acc, item) => {
    code.add(item.code)
    start += item.start + '|'
    acc = acc.concat(invest(item))
    return acc
  }, [])
  logger.info(`子进程 ${msg.index} 计算定投数据结束, ${[...code].join()} [${start}]数据长度`, list.length)
  send(list)
})

