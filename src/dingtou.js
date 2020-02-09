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
} = require('./utils')


const cpuCount = 6

const startTimestamp = Date.now()

const spList = _.map(Array(cpuCount), (i, index) => {
  const sp = cp.fork(`${__dirname}/invest.js`)
  sp.on('message', msg => {
    const duration = Date.now() - startTimestamp
    const item = _.get(msg, 'data[0]', {})
    logger.info(
      `${index} 收到子进程 ${msg.index} 数据:`
      + ` ${msg.data.length}`
      + ` code=${item.code},start=${item.start}`
      + ` --------------${duration}`
    )
    insertDb(index, msg.data)
  })
  return sp
})

function send(index, data) {
  logger.info(`>>> 发送消息给 ${index} 子进程`)
  spList[index].send({ data, index})
  logger.log(`发送消息给 ${index} 子进程 <<<`)
}

let codeIndex = 0
let codeList

function getCodeList() {
  logger.info('开始获取codeList')
  return selectFundList().then(list => {
    logger.info('获取codeList结束, list长度=', list.length)
    codeList = _.map(list, item => item.code)
  })
}

let codeMap = {}
let startIndex = 0
const step = 10
function getDailyValue() {
  logger.info(`开始获取净值, startIndex=${startIndex}, step=${step}`)
  const code = codeList.slice(startIndex, startIndex + step)
  startIndex += step
  return selectDailyValue(code, { date: 'asc' }).then(list => {
    logger.info('获取净值结束, list长度=', list.length)
    _.forEach(list, (item) => {
      if (!codeMap[item.code]) {
        codeMap[item.code] = {
          start: item.date,
          end: item.date,
          map: {},          // 按日期map的净值数据
          bonusList: [],    // 分红list
        }
      }
      const value = Number.parseFloat(item.value)
      const raw_state = Number.parseInt(item.raw_state) || 0
      const date = moment(item.date).format('YYYY-MM-DD')
      const info = {
        date,
        value,
        redemption: item.redemption,
        purchase: item.purchase,
        raw_state,
      }
      codeMap[item.code].map[date] = info
      if (moment(codeMap[item.code].start).isSameOrAfter(date)) {
        codeMap[item.code].start = date
      }
      if (moment(codeMap[item.code].end).isSameOrBefore(date)) {
        codeMap[item.code].end = date
      }
      const bonus = Number.parseFloat(item.bonus)
      if (bonus) {    // 分红列表时间正序
        codeMap[item.code].bonusList.push({
          date,
          value,
          bonus,
          bonus_des: item.bonus_des,
          raw_state,
        })
      }
    })
    logger.info(`codeMap.keys = ${Object.keys(codeMap)}`)
    _.forEach(codeMap, (item, code) => {
      console.log(code, item.start, item.end)
    })
  })
}

function genCycle(investStart, args) {
  const startm = moment(investStart)
  const year = startm.get('year')
  const month = startm.get('month') + 1
  return _.map(Array(31), (t, i) => {
    i += 1
    const d = i < 10 ? `0${i}` : i
    let start = moment(`${year}-${month}-${d}`)
    // 无差别1~31循环，会出现小于investStart的日期，
    // 出现后则向前减去一个定投周期
    while (start.isBefore(investStart)) {
      start.add(1, 'M')
    }
    return { start, ...args }
  })
}

let cycleList = []

function genCycleList() {
  const code = codeList[codeIndex]
  logger.info(`开始生成${code}的定投列表，codeIndex=${codeIndex}`)
  codeIndex += 1
  const data = codeMap[code]
  if (data) {
    const { start, end, map, bonusList } = data
    delete codeMap[code]
    const list = genCycle(start, { code, end, map, bonusList })
    cycleList = cycleList.concat(list)
    logger.info(`${code}的定投列表生成结束，list长度=${list.length}, cycleList长度=${cycleList.length}`)
  } else {
    logger.warn(`未找到code=${code}的净值数据`)
  }
}

function insertDb(index, data) {
  if (data) {
    logger.info(`异步插入子进程${index}的数据，code=${data[0] && data[0].code}数据长度=${data.length}`)
    insertRegularInvest(data)
  }
  if (cycleList.length) {
    send(index, cycleList.shift())
  } else {
    getDailyValue().then(() => {
      genCycleList()
      send(index, cycleList.shift())
    })
  }
  if (cycleList.length < 2 * cpuCount) {
    logger.info(`cycleList.length = ${cycleList.length} < 2 * cpuCount`)
    genCycleList()
    if (codeIndex + cpuCount > startIndex) {
      logger.info(`codeIndex = ${codeIndex} + cpuCount > startIndex=${startIndex}`)
      getDailyValue()
    }
  }
}

function run() {
  getCodeList().then(() => {
    return getDailyValue()
  }).then(() => {
    genCycleList()
    _.forEach(spList, (sp, index) => {
      send(index, cycleList.shift())
    })
  })
}

run()


