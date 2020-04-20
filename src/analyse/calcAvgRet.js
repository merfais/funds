const chalk = require('chalk')
const _ = require('lodash')
const {
  selectV,
  selectAvgV,
  close,
} = require('./db.js')

function padRight(s, l) {
  s += ''
  if (!/^( *)$/.test(s)) {
    s += ','
  }
  return s + Array(l - s.length + 2).join(' ')
}

function print(map1, map2, title1, title2,) {
  console.log('\n', padRight(title1, 51), title2, '\n')
  const t = [
    'code, ', 'count,', 'avgRet,', 'avgCount,',
    'maxC,', 'minC,', 'tavgRet,', 'tcount,'
  ]
  console.log(...t, '   ', ...t)
  const list1 = _.orderBy(_.map(map1, item => item), 'value', 'desc')
  const list2 = _.orderBy(_.map(map2, item => item), 'value', 'desc')
  const length = Math.min(list1.length, list2.length)
  const list = [list1, list2]
  let i = 0
  while (i < length) {
    const rst = _.map(list, item => {
      item = item[i]
      let info = padRight('', 50)
      if (item) {
        info = [
          padRight(item.code, 6),
          padRight(item.count, 4),
          padRight(item.value.toFixed(4), 7),
          padRight(item.purchase.toFixed(2), 9),
          padRight(item.max, 3),
          padRight(item.min, 3),
          padRight(item.avg.toFixed(4), 7),
          padRight(item.total, 4)
        ]
        if (item.avg < 0.3) {
          info = chalk.yellow(...info)
        } else if (item.count > 40) {
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

// 计算样本中各个code对应的平均收益率
function calcAvgRet(list, minCount = 20) {
  const map = {}
  _.forEach(list, item => {
    if (!map[item.code]) {
      map[item.code] = {
        code: item.code,
        value: 0,
        count: 0,
        purchase: 0,
        max: 0,
        min: 100,
      }
    }
    map[item.code].value += Number.parseFloat(item.value)
    const purchaseCount = Number.parseInt(item.purchaseCount)
    map[item.code].purchase += purchaseCount
    if (map[item.code].max < purchaseCount) {
      map[item.code].max = purchaseCount      // 最大实际定投次数
    }
    if (map[item.code].min > purchaseCount) {
      map[item.code].min = purchaseCount      // 最小实际定投次数
    }
    map[item.code].count += 1     // 样本数量
  })
  return _.reduce(map, (acc, item, code) => {
    // 至少有minCount个样本进入排名，才能被有效统计
    if (item.count > minCount) {
      item.value = item.value / item.count  // 平均收益率
      item.purchase = item.purchase / item.count  // 平均实际定投次数
      acc[code] = item
    }
    return acc
  }, {})
}

function getTotalAvg({ tableName, where, map, field }) {
  return new Promise(resolve => {
    let l = 0
    let codeLen = Object.keys(map).length
    where = { ...where }
    _.forEach(map, (item, code) => {
      Object.assign(where, {
        purchaseCount: {
          '>=': item.min,
          '<=': item.max
        },
        code,
      })
      selectAvgV(field, {
        tableName,
        where,
      }).then(list => {
        let v = 0
        _.forEach(list, i => {
          v += Number.parseFloat(i.value)
        })
        map[code].avg = v / list.length
        map[code].total = list.length
        l += 1
        if (l >= codeLen) {
          resolve(map)
        }
      })
    })
  })
}

function genRetMap({
  tableName,
  where,
  ext,
  minValue,
  field,
}) {
  return selectV(field, {
    tableName,
    where,
    ext,
    minValue,
  }).then(res => {
    return calcAvgRet(res)
  }).then(map => {
    return getTotalAvg({
      tableName,
      where,
      map,
      field,
    })
  })
}

function pickSameFund(...args) {
  let fmap = args[0]
  _.forEach(args.slice(1), (imap, index) => {
    const tmp = {}
    _.forEach(imap, (item, code) => {
      if (fmap[code]) {
        tmp[code] = code
      }
    })
    fmap = tmp
  })
  const mapList = args.map(i => ({}))
  _.forEach(fmap, code => {
    _.forEach(args, (map, index) => {
      mapList[index][code] = map[code]
    })
  })
  return mapList
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
  const minValue = 0.3
  const purchaseCount = 4
  const tableName = 'r20190501_20200410'
  const ext = {}
  return Promise.all([
    genRetMap({
      tableName,
      where,
      ext,
      minValue,
      field: 'v3',
    }),
    genRetMap({
      tableName,
      where,
      ext,
      minValue,
      field: 'v2',
    }),
  ]).then(([cashBonus, bonusInvest]) => {
    print(cashBonus, bonusInvest, '20190501_20200410 cashBonus', 'bonusInvest')
    return {
      cashBonus,
      bonusInvest,
    }
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
  const minValue = 0.4
  const purchaseCount = 20
  const tableName = 'regular_invest_v'
  const ext = {
    limit: 8000,
  }
  return Promise.all([
    genRetMap({
      tableName,
      where,
      ext,
      minValue,
      field: 'v3',
    }),
    genRetMap({
      tableName,
      where,
      ext,
      minValue,
      field: 'v2',
    }),
  ]).then(([cashBonus, bonusInvest]) => {
    print(cashBonus, bonusInvest, '20160501_20191212 cashBonus', 'bonusInvest')
    return { cashBonus, bonusInvest }
  })
}

Promise.all([
  calc1(),
  calc2(),
]).then(([c1, c2]) => {
  const [t1, t2] = pickSameFund(c1.cashBonus, c2.cashBonus)
  print(t1, t2, 'cashBonus 20190501_20200410', '             20160501_20191212')
  const [t3, t4] = pickSameFund(c1.bonusInvest, c2.bonusInvest)
  print(t3, t4, 'bonusInvest 20190501_20200410', '            20160501_20191212')

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


