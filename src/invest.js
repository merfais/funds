const _ = require('lodash')
const chalk = require('chalk')
const moment = require('moment')
const {
  logger,
} = require('./utils')



/*
 * 获取开市的投资日期
 * 定投日期可能遇到周末或节假日，
 * 此时会推迟到下一个开市日期,
 * 最多向后寻找一个迭代周期
 */
function getInvestDay(code, date, map, cycle = 'M') {
  const dateStr = date.format('YYYY-MM-DD')
  let item = map[dateStr]  // 获取当日
  const max = date.clone().add(1, cycle)
  while(!item && date.isBefore(max)) {  // 如果当日不存在数据
    date.add(1, 'd')   // 按天向后推迟，直到有数据
    item = map[date.format('YYYY-MM-DD')]
  }
  if (!item) {
    logger.error(`${code} 未能寻找到 ${dateStr} 的定投日,`
      + ` 已寻找到${date.format('YYYY-MM-DD')}`
      + `map.keys = ${Object.keys(map)}`
    )
  }
  return item
}

function genInvestItem(code, date, map) {
  const item = getInvestDay(code, date.clone(), map) || {}
  let shares = 0
  if (item.raw_state === 0) {
    if (/开放/.test(item.purchase)) { // 开放申购
      shares += 1 / item.value
    }
  } else {
    logger.error(`${code}净值数据异常`, item)
  }
  const start = date.format('YYYY-MM-DD')
  return {
    date: item.date,
    start,
    shares,           // 增加的份额
  }
}

/*
 * 计算分红和拆分
 */
function calcBonus(code, bonusList, currentItem, preItem) {
  let cashBonus = 0         // 现金分红
  let increaseShares = 0    // 分红再投资增加的份额
  let preShares = preItem.shares  // 上个定投日的份额
  let preBonusShares = preItem.bonusShares  // 上个定投日分红再投资增加的份额
  _.forEach(bonusList, bonusItem => {
    // 分红日期大于上一个定投日且小于等于当前定投日，
    // 此次分红计算到收益中
    const bonusDate = moment(bonusItem.date)
    if (bonusDate.isAfter(preItem.end)
      && bonusDate.isSameOrBefore(currentItem.start)
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

function invest({ code, start, end, map, bonusList }, cpIndex) {
  logger.info(`子进程 ${cpIndex} 开始计算定投数据`)
  const investList = []    // 存储定投日的净值信息
  let date = moment(start).clone()
  do {
    const investItem = genInvestItem(code, date.clone(), map)
    investList.push(investItem)
    date.add(1, 'M')
  } while(date.isSameOrBefore(end))
  let all = []
  // 大于等于发行日期，一直向前累计定投期数
  while(investList.length) {
    const investItem = investList.shift()
    const list = [{
      code,
      start: investItem.start,
      end: investItem.start,
      shares: investItem.shares,   // 增加的份额
      bonusShares: 0,   // 分红再投资增加的份额
      cashBonus: 0,     // 现金分红
      purchaseCount: investItem.shares ? 1 : 0, // 投入次数，定投日可能会买入失败
      regularCount: 1,  // 定投期数
    }]
    // 循环定投日净值列表，list中当前项=前一项+定投日数据
    _.forEach(investList, (currentItem, index) => {
      const preItem = list[index]
      const {
        cashBonus,
        increaseShares,
        preBonusShares,
        preShares,
      } = calcBonus(code, bonusList, currentItem, preItem)
      const item = {
        code,
        start: investItem.start,
        end: currentItem.start,
        shares: preShares + currentItem.shares,
        bonusShares: preBonusShares + increaseShares,
        cashBonus,
        purchaseCount: (currentItem.shares ? 1 : 0) + preItem.purchaseCount,
        regularCount: preItem.regularCount + 1,
      }
      list.push(item)
    })
    all = all.concat(list)
  }
  logger.info(`子进程 ${cpIndex} 计算定投数据结束, [${code}][${start}]数据长度`, all.length)
  send(all)
}

let index

function send(data) {
  logger.info(`>>> 子进程 ${index} 发送消息给主进程`)
  process.send({ data, index })
  logger.log(`子进程 ${index} 发送消息给主进程 <<<`)
}

process.on('message', msg => {
  index = msg.index
  invest(msg.data, msg.index)
})




/*
function invest(code, investStart, investEnd, map, bonusList) {
  investEnd = moment(investEnd)
  const year = investEnd.get('year')
  const month = investEnd.get('month') + 1
  let i = 1
  while(i <= 31) {   // 1号 ~ 31号
    const d = i < 10 ? `0${i}` : i
    console.log(`${year}-${month}-${d}`)
    let date = moment(`${year}-${month}-${d}`)
    i += 1
    // 无差别1~31循环，会出现大于investEnd的日期，
    // 出现后则向前减去一个定投周期
    while (date.isAfter(investEnd)) {
      date.subtract(1, 'M')
    }
    let all = []
    const investList = []    // 存储定投日的净值信息
    // 大于等于发行日期，一直向前累计定投期数
    while(date.isSameOrAfter(investStart)) {
      const investItem = genInvestItem(date.clone(), map)
      const list = [{
        code,
        start: investItem.start,
        end: investItem.start,
        shares: investItem.shares,   // 增加的份额
        bonusShares: 0,   // 分红再投资增加的份额
        cashBonus: 0,     // 现金分红
        purchaseCount: investItem.shares ? 1 : 0, // 投入次数，定投日可能会买入失败
        regularCount: 1,  // 定投期数
      }]
      // 循环定投日净值列表，list中当前项=前一项+定投日数据
      _.forEach(investList, (currentItem, index) => {
        const preItem = list[index]
        const {
          cashBonus,
          increaseShares,
          preBonusShares,
          preShares,
        } = calcBonus(bonusList, currentItem, preItem)
        const item = {
          code,
          start: investItem.start,
          end: currentItem.start,
          shares: preShares + currentItem.shares,
          bonusShares: preBonusShares + increaseShares,
          cashBonus,
          purchaseCount: (currentItem.shares ? 1 : 0) + preItem.purchaseCount,
          regularCount: preItem.regularCount + 1,
        }
        list.push(item)
      })
      logger.log(date.format('YYYY-MM-DD'), list.length)
      all = all.concat(list)
      investList.unshift(investItem) // 存储净值数据
      date.subtract(1, 'M')  // 向前递减定投周期
    }
    console.log('------------------', all.length)
    insertRegularInvest(all)
    break
  }
}

*/
