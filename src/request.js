const fs = require('fs')
const path = require('path')
const axios = require('axios')
const chalk = require('chalk')
const _ = require('lodash')

function resolve(...args) {
  return path.resolve(__dirname, '../', ...args)
}

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
  const ad = ip2int('0.255.255.254')
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
      ip += _.random(1, ad)
    }
  })
  return int2ip(ip)
}

function request(options) {
  let retry = 5
  const req = () => {
    const ip = randomIP()
    options.headers = options.headers || {}
    options.headers['X-Forwarded-For'] = ip
    options.headers['X-ClientIP'] = ip
    options.headers['ClientIP'] = ip
    options.headers['CLIENT_IP'] = ip
    options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.81 Safari/537.36'
    return axios.request(options).catch(err => {
      console.log(chalk.red(err), options.params)
      if (retry--) {
        console.log(chalk.yellow(`request retry: ${retry}`))
        return new Promise((resolve, reject) => {
          const timeout = Math.random() * 1000
          setTimeout(() => {
            req().then(d => {
              resolve(d)
            }).catch(e => {
              reject(e)
            })
          },timeout)
        })
      } else {
        console.log(chalk.red('request failed with errors.\n'))
        console.log(err)
        console.log(chalk.red('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'))
        return Promise.reject(err)
      }
    })
  }
  return req()
}

function randomReqest(timeout = 5000) {
  return options => {
    return new Promise(re => setTimeout(re, Math.random() * timeout)).then(() => {
      return request(options)
    })
  }
}

function toFile(path, data) {
  return new Promise(resolve => {
    console.log(chalk.green('begin write to file: ') + `${path}`)
    fs.writeFile(path, JSON.stringify(data), err => {
      if (err) {
        throw err
      }
      console.log(chalk.green('write success'))
      resolve()
    })
  })
}

function fromFile(path) {
  return new Promise(resolve => {
    console.log(chalk.green('begin read from file: ') + `${path}`)
    fs.readFile(path, (err, data) => {
      if (err) {
        throw err
      }
      try {
        data = JSON.parse(data)
      } catch(err) {
        throw err
      }
      console.log(chalk.green('read success'))
      resolve(data)
    })
  })
}

module.exports = {
  resolve,
  request,
  toFile,
  fromFile,
  randomIP,
  randomReqest,
}
