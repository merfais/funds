const axios = require('axios')
const chalk = require('chalk')
const _ = require('lodash')
const logger = require('./logger')

// int to IP
function int2ip(int) {
  let part1 = int & 255
  let part2 = ((int >> 8) & 255)
  let part3 = ((int >> 16) & 255)
  let part4 = ((int >> 24) & 255)
  return part4 + '.' + part3 + '.' + part2 + '.' + part1
}

// IP to int
function ip2int(ip) {
  let d = ip.split('.')
  // signed int移位时31位时会处理成符号位，当31位为1时会被处理成负数，但乘法会自动扩展
  return ((((((+d[0]) << 8) + (+d[1])) << 8) + (+d[2])) * 256) + (+d[3])
}


function randomIP() {
  const excludes = [{
    from: ip2int('10.0.0.0'),
    to: ip2int('10.255.255.255'),
  }, {
    from: ip2int('100.0.0.0'),
    to: ip2int('100.255.255.255'),
  }, {
    from: ip2int('127.0.0.0'),
    to:ip2int('127.255.255.255'),
  }, {
    from: ip2int('169.0.0.0'),
    to: ip2int('169.255.255.255'),
  }, {
    from: ip2int('172.0.0.0'),
    to: ip2int('172.255.255.255'),
  }, {
    from: ip2int('192.0.0.0'),
    to: ip2int('192.255.255.255'),
  }, {
    from: ip2int('198.0.0.0'),
    to: ip2int('198.255.255.255'),
  }, {
    from: ip2int('203.0.0.0'),
    to: ip2int('203.255.255.255'),
  }, {
    from: ip2int('224.0.0.0'),
    to: ip2int('224.255.255.255'),
  }, {
    from: ip2int('240.0.0.0'),
    to: ip2int('240.255.255.255'),
  }]
  const start = ip2int('1.0.0.0')
  const end = ip2int('255.255.255.254')
  let ip = _.random(start, end)
  _.forEach(excludes, block => {
    if (ip >= block.from && ip <= block.to) {
      ip += ip2int('1.0.0.10')
    }
  })
  return int2ip(ip)
}

function request(options, retryTimes) {
  const ip = randomIP()
  options.headers = options.headers || {}
  Object.assign(options.headers, {
    'X-Forwarded-For': ip,
    'X-ClientIP': ip,
    'X-Client-IP': ip,
    'X-Client_IP': ip,
    'CLIENT-IP': ip,
    ClientIP: ip,
    CLIENT_IP: ip,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36',
  })
  const method = `[${(options.method || 'GET').toUpperCase()}]`
  // logger.info(options._sid_, method, options.url)
  return axios.request(options).catch(err => {
    logger.error(options._sid_, '网络请求发生错误:\n', err)
    if (retryTimes === 5) {
      logger.error(options._sid_, '网络请求错误重试次数用尽')
      return Promise.reject(err)
    } else {
      const timeout = 1000 + Math.random() * 3000
      logger.error(options._sid_, `网络请求将在${(timeout / 1000).toFixed(3)}s重试`, retryTimes)
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          logger.info(options._sid_, `网络请求发起重试`)
          request(options, retryTimes + 1).then(resolve).catch(reject)
        }, timeout)
      })
    }
  })
}

function randomReqest(timeout, before) {
  if (_.isFunction(timeout)) {
    before = timeout
    timeout = 10000 * 10
  } else if (timeout === undefined || timeout === null) {
    timeout = 10000 * 10
  }
  return options => {
    return new Promise(re => setTimeout(re, Math.random() * timeout)).then(() => {
      if (_.isFunction(before)) {
        before()
      }
      return request(options)
    })
  }
}

const Q = []        // 队列
let timer = null    // 队列刷新定时器

function clearQ() {
  clearInterval(timer)
  timer = null
  logger.info(`############################### clearQ: pending = ${pending}, Q.length = ${Q.length}`)
}

let pending = 0   // 正在请求的连接数
let pendingMax = 100
function flushQ(piece) {
  logger.info(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> flushQ: pending = ${pending}, Q.length = ${Q.length}`)
  if (pending >= pendingMax) {
    return
  }
  if (Q.length === 0) {
    clearQ()
    return
  }
  piece = piece || pendingMax - pending + 50
  const chunk = Q.splice(0, piece)
  _.forEach(chunk, (item, index) => {
    if (_.isFunction(item.before)) {
      item.before()
    }
    setTimeout(() => {
      request(item.options).then(item.resolve).catch(item.reject).then(() => {
        pending -= 1
      })
    }, index * 5)
  })
  pending += chunk.length
}

const timeout = 3000    // 队列刷新时间

function startQ() {
  logger.info(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ startQ: pending = ${pending}, Q.length = ${Q.length}`)
  flushQ(100)
  timer = setInterval(flushQ, timeout)
}

function requestQ(options, before) {
  return new Promise((resolve, reject) => {
    Q.push({ options, resolve, reject, before })
    if (!timer) {
      startQ()
    }
  })
}


module.exports = {
  request,
  randomIP,
  randomReqest,
  clearQ,
  startQ,
  requestQ,
}
