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


let codeIndex = 0
let codeList

function getCodeList() {
  logger.info('开始获取codeList')
  return selectFundList({
    calc_ignore: 0,
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
function getDailyValue() {
  // logger.info(`开始获取净值, startIndex=${startIndex}, step=${step}`)
  const code = codeList.slice(startIndex, startIndex + step)
  if (!code.length) {
    return Promise.resolve()
  }
  startIndex += step
  return selectDailyValue({
    code,
    date: {
      operator: '>=',
      value: '2015-01-01',
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

function insertDb(index) {
  // if (data && data.length) {
  //   logger.info(`异步插入子进程${index}的数据，code=${data[0] && data[0].code}数据长度=${data.length}`)
  //   insertRegularInvest(data)
  // }
  if (cycleList.length) {
    send(index)
  } else {
    getDailyValue().then(() => {
      genCycleList()
      if (startIndex < codeList.length && cycleList.length) {
        send(index)
      } else {
        stop(index)
      }
    })
  }
  if (cycleList.length < 2 * cpuCount) {
    genCycleList()
    if (codeIndex + cpuCount > startIndex) {
      getDailyValue()
    }
  }
}

const cpuCount = 6

const startTimestamp = []

const spList = _.map(Array(cpuCount), (i, index) => {
  const sp = cp.fork(`${__dirname}/invest.js`)
  sp.on('message', msg => {
    const duration = Date.now() - startTimestamp[index]
    logger.info(
      `收到子进程 ${msg.index} 数据:`
      + ` --------------耗时：${(duration / 1000).toFixed(2)}s`
    )
    insertDb(index, msg.data)
  })
  return sp
})

let lastCode = ''
function send(index) {
  const data = _.map(Array(4), () => {
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
    return item
  })
  startTimestamp[index] = Date.now()
  spList[index].send({ data, index})
  // logger.info(`>>> 发送消息给 ${index} 子进程, code=${code}, start=${data.start}`)
}

function stop(index) {
  spList[index].kill(0)
  spList[index] = null
  const allKilled = _.reduce(spList, (acc, item) => {
    acc = acc && item === null
    return acc
  }, true)
  if (allKilled) {
    console.log('overrrrrrrrrrrrrrrrrrrrrrr')
    db.end()
  }
}

function run() {
  getCodeList().then(() => {
    return getDailyValue()
  }).then(() => {
    genCycleList()
    _.forEach(spList, (sp, index) => {
      send(index)
    })
  })
}

run()




// (从定投日期表选最大的日期)从净值列表中选最小的日期的基金，从最小的日期开始按天增加循环
// 从净值列表中返回当天的基金净值信息（最多数据是基金的总数）
// 从定投列表中选结束日期是当天的上个定投的日的定投数据，（数据量是基金总数的几百倍）
// 计算定投日的数据，更新定投表，更新定投日期
