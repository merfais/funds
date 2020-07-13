const chalk = require('chalk')
const _ = require('lodash')
const {
  selectV,
  selectAllAvgV,
  close,
} = require('./db.js')

function padRight(s, l) {
  s += ''
  if (!/^( *)$/.test(s)) {
    s += ','
  }
  return s + Array(l - s.length + 2).join(' ')
}

function print(list1, list2, title1, title2,) {
  console.log('\n', padRight(title1, 51), title2, '\n')
  const t = [
    'index', 'code, ', 'count,', 'cashBonus,', 'bonusInvest,',
  ]
  console.log(...t, '   ', ...t)
  const length = Math.min(list1.length, list2.length)
  list1 = _.orderBy(list1, 'index', 'asc')
  list2 = _.orderBy(list2, 'index', 'asc')
  const list = [list1, list2]
  const count = [100, 1000]
  let i = 0
  while (i < length) {
    const rst = _.map(list, (item, index) => {
      item = item[i]
      let info = padRight('', 50)
      if (item) {
        item.avg3 = parseFloat(item.avg3)
        item.avg2 = parseFloat(item.avg2)
        info = [
          padRight(item.index, 4),
          padRight(item.code, 6),
          padRight(item.count, 4),
          padRight(item.avg3.toFixed(4), 10),
          padRight(item.avg2.toFixed(2), 7),
        ]
        if (parseInt(item.count) < count[index]) {
          info = chalk.yellow(...info)
        } else if (item.avg3 > 0.3 || item.avg2 > 0.3) {
          info = chalk.green(...info)
        } else {
          info = chalk.white(...info)
        }
      }
      return info
    })
    console.log(rst[0], padRight('', 5), rst[1])
    i += 1
  }
}

function pickSameFund(c1, c2) {
  const codeMap1 = {}
  const codeMap2 = {}
  const codeList = []
  _.forEach(c1, (item, index) => {
    item.index = index
    codeMap1[item.code] = item
  })
  _.forEach(c2, (item, index) => {
    item.index = index
    codeMap2[item.code] = item
    if (codeMap1[item.code]) {
      codeList.push(item.code)
    }
  })
  return _.reduce(codeList, (acc, code) => {
    acc[0].push(codeMap1[code])
    acc[1].push(codeMap2[code])
    return acc
  }, [[], []])
}

function calc1() {
  const where = {
    start: {
      '>=': '2019-05-01',
    },
    end: {
      '<': '2019-12-12',
    },
    purchaseCount: {
      '>': 5,
    },
  }
  const tableName = 'r20190501_20200410'
  const minCount = 80
  const limit = 100
  return selectAllAvgV({
    tableName,
    where,
    minCount,
    limit,
  })
}

function calc2() {
  const where = {
    start: {
      '>=': '2016-05-01',
    },
    end: {
      '<=': '2019-12-12',
    },
    purchaseCount: {
      '>=': 20,
    }
  }
  const tableName = 'regular_invest_v'
  const minCount = 500
  const limit = 100
  return selectAllAvgV({
    tableName,
    where,
    minCount,
    limit,
  })
}

Promise.all([
  calc1(),
  calc2(),
]).then(([c1, c2]) => {
  const [t3, t4] = pickSameFund(c1, c2)
  print(c1, c2, 'all 20190501_20200410', '                       20160501_20191212')
  print(t3, t4, 'same 20190501_20200410', '                     20160501_20191212')

}).then(() => {
  close()
})









// function appendTotalAvg(map, resList) {
//   _.forEach(resList, item => {
//     map[item.code].avg = Number.parseFloat(item.avg)
//     map[item.code].total = Number.parseInt(item.count)
//     map[item.code].code = item.code
//   })
//   return map
// }


// function cashBonus({
//   tableName,
//   where,
//   ext = {},
//   minValue,
// }) {
//   return genRetMap({
//     getRetV: getV3,
//     getAvgRetV: getAvgV3,
//     tableName,
//     where,
//     ext,
//     minValue,
//   })
// }
//
// function bonusInvest({
//   tableName,
//   where,
//   ext = {},
//   minValue,
// }) {
//   return genRetMap({
//     getRetV: getV2,
//     getAvgRetV:getAvgV2,
//     tableName,
//     where,
//     ext,
//     minValue,
//   })
// }

// function cashBonus(tableName, where, ext = {}, minValue) {
//   return getV3({
//     tableName,
//     where,
//     ext,
//     minValue,
//   }).then(res => {
//     return calcAvgRet(res)
//   }).then(map => {
//     return getAvgV3({
//       tableName,
//       where: {
//         ...where,
//         code: Object.keys(map),
//       },
//     }).then(res => {
//       return appendTotalAvg(map, res)
//     })
//   })
// }
//
// function bonusInvest(tableName, where, ext = {}, minValue, purchaseCount) {
//   return getV2({
//     tableName,
//     where,
//     ext,
//     minValue,
//   }).then(res => {
//     return calcAvgRet(res)
//   }).then(map => {
//     return getAvgV2({
//       tableName,
//       where: {
//         ...where,
//         purchaseCount: {
//           '>': purchaseCount,
//         },
//         code: Object.keys(map),
//       },
//     }).then(res => {
//       return appendTotalAvg(map, res)
//     })
//   })
// }


