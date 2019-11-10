const _ = require('lodash')
const date = require('date-fns')
const knex = require('./sql')
const {
  request,
  randomReqest,
} = require('./request.js')

const table = {
  fund_info: 'fund_info',
}


// var db = {
//   chars: ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'm', 'n', 'p', 'q', 'r', 's', 't', 'w', 'x', 'y', 'z'],
//   datas: [[
//     '000001',
//     '华夏成长'
//     'HXCZ',
//     '1.1210',
//     '3.5320',
//     '1.1270',
//     '3.5380',
//     '-0.0060',
//     '-0.53',
//     '开放申购',
//     '开放赎回',
//     '',
//     '1',
//     '0',
//     '1',
//     '',
//     '1',
//     '0.15%',
//     '0.15%',
//     '1',
//     '1.50%'
//   ]],
//   count: ['5071', '1517', '751', '2803'],
//   record: '5876',
//   pages: '5876',
//   curpage: '1',
//   indexsy: [-0.99, -0.87, 0.2],
//   showday: ['2018-02-28', '2018-02-27']
// }
// 查询所有基金
const listReqConf = (page, size = 200) => ({
  method: 'get',
  baseURL: 'http://fund.eastmoney.com',
  url: '/Data/Fund_JJJZ_Data.aspx',
  params: {
    t: 1,
    lx: 1,
    letter: '',
    gsid: '',
    text: '',
    sort: 'bzdm,asc',   // bzdm: 基金代码 zdf: 日增长 降序
    page: `${page},${size}`,        // 第1页 200条
    dt: Date.now(),   // 请求时间戳
    atfc: '',
    onlySale: '0',        // 是否可购买 1: 可购 0: 全部
  },
  data: {},
  headers: {
    Referer: 'http://fund.eastmoney.com/fund.html',
    Host: 'fund.eastmoney.com',
  }
})

// 查询基金详细信息
const searchReqConf = (key) => ({
  method: 'get',
  baseURL: 'http://fundsuggest.eastmoney.com',
  url: '/FundSearch/api/FundSearchAPI.ashx',
  params: {
    callback: 'jQuery18302567309292453006_1550157024546',
    m: 1,
    key,
    _: Date.now()
  },
  data: {},
  headers: {
    Referer: 'http://fund.eastmoney.com/HH_jzzzl.html',
    Host: 'fundsuggest.eastmoney.com',
  }
})


// 取数据库中基金列表
function selectFund() {
  const query = knex.select().from(table.fund_info)
  return query.then(d => d)
}

// 数据库基金列表插入
function insertFund(data) {
  const query = knex.insert(data).into(table.fund_info)
  return query.then(d => d)
}

// 数据库基金列表更新
function updateFund(data) {
  const data = { ...data }
  const id = data.id
  delete data.id
  const query = knex(table.fund_info).update(data).where({ id })
  return query.then(d => d)
}

// 抓取一个基金的详细信息
function getFundDetail(fund, errorList, retryTimes) {
  const options = searchReqConf(fund.code)
  console.log('<=== search request', fund.code)
  return randomReqest()(options).catch(e => {
    errorList.push(options)
  }).then(ack => {
    console.log('====> response search', fund.code)
    if (ack && ack.data) {
      let data = []
      const rst = ack.data.match(/\((.*)\)/)
      if (rst && rst[1]) {
        try {
          ack = JSON.parse(rst[1])
          data = ack && ack.Datas
        } catch(err) {
          console.log('search 结果 JSON.parse 出现错误, fund.code=', code)
          console.log(err)
          // 出现错误的基金记录下来
          errorList.push(options)
        }
      }
      _.forEach(data, item => {
        if ((item.CODE + '') === (fund.code + '')) {
          const info = item.FundBaseInfo || {}
          fund.type_name = info.FTYPE
          fund.company_id = info.JJGSID
          return false
        }
      })
    } else {
      retryTimes += 1
      console.log('获取基金详情返回结果为空, fund.code=', fund.code)
      console.log(ack)
      console.log('进行重试', retryTimes)
      if (retryTimes >= 5) {
        console.log('获取基金详情重试次用用尽, fund.code=', fund.code)
        errorList.push(options)
      } else {
        return req(fund)
      }
    }
  })
}

// 抓取一组（200个）基金的详细信息
function getFundDetailMulti(arr) {
  return new Promise((resolve) => {
    let i = 0
    const errors = []
    _.forEach(arr, fund => {
      let retryTimes = 0
      getFundDetail(fund, errors, retryTimes).then(() => {
        i += 1
        if (i >= arr.length) {
          resolve({ funds: arr, errors })
        }
      })
    })
  }).then(({ funds, errors }) => {
    // 新增基金信息入库
    console.log('---开始基金代码写入数据库---', db.curpage)
    insertFund(funds).then(() => {
      console.log('---基金代码写入数据库完成---', db.curpage)
    })
  })
}


// 抓取一个每日基金净值信息
function getFundDailyValue(params, errorList, retryTimes) {
  const size = 20
  const { code, start, page, totalCount } = params
  const options = dailyValueReqConf(code, start, page, size)
  console.log('===> dailyValue request', code, page, totalCount)
  return randomReqest(options).then(ack => {
    console.log('<=== response dailyValue', code, page, totalCount)
    if (ack && ack.data) {
      const rst = ack.data.match(/\((.*)\)/)
      let list = []
      let totalCount = 0
      if (rst && rst[1]) {
        try {
          ack = JSON.parse(rst[1])
          if (_.isObject(ack)) {
            list = _.get(ack, 'Data.LSJZList', [])
            totalCount = ack.TotalCount
          }
        } catch(err) {
          console.log('获取基金每日净值返回值JSON.parse出错, code=', code, 'page=', page)
          console.log(err)
          params.totalCount = 0
          errorList.push(options)
          return params
        }
      }
      const valArr = []
      _.forEach(list, item => {
        if (item.FSRQ !== start) {
          valArr.push({
            fund_code: code,
            date: item.FSRQ,
            value: item.DWJZ,
            total_value: item.LJJZ,
            bonus: item.FHFCZ || 0,
            bonus_des: item.FHSP,
            redemption: item.SHZT,
            purchase: item.SGZT,
            increase_rate: item.JZZZL,
          })
        }
      })
      console.log('----开始基金净值写入数据库---', code)
      insertFundValue(valArr).then(() => {
        console.log('----基金净值写入数据库完成---', code)
      })
      if (totalCount > page * size) {
        params.page += 1
        params.totalCount = totalCount
      } else {
        params.totalCount = 0
      }
      return params
    } else {
      console.log('获取基金每日净值返回值为空, code=', code, 'page=', page)
      console.log(err)
      retryTimes += 1
      if (retryTimes >= 5) {
        console.log('获取基金每日净值重试次用用尽，code=', code, 'page=', page)
        errorList.push(options)
        params.totalCount = 0
        return params
      } else {
        return getFundDailyValue(params, errorList, retryTimes)
      }
    }
  })
}

// 抓取一组（200个）基金的每日净值
function getFundDailyValueMulti(arr) {
  return new Promise((resolve) => {
    let i = 0
    const errors = []
    const next = []
    _.forEach(arr, item => {
      // TODO:
      const params = {
        code: item.code,
        start: item.start || item.value_updated_at,
        page: item.page || 1,
        retryTimes: item.retryTimes || 0,
        totalCount: item.totalCount || 0,
      }
      const retryTimes = 0
      const errors = []
      getFundDailyValue(params, errors, retryTimes).then(res => {
        if (res.totalCount) {
          next.push(res)
        }
        i += 1
        if (i >= arr.length) {
          resolve(next)
        }
      })
    })
  }).then(next => {
    if (next.length) {
      reqQueue.push({
        type: 'dailyValue',
        list: next,
      })
    }
  })
}

let isFetching = false
let reqQueue = []
function flushQueue() {
  if (isFetching) {
    return
  }
  isFetching = true
  if (reqQueue.length) {
    let handler
    if (reqQueue[0].type === 'detail') {
      handler = getFundDetailMulti(reqQueue[0].list)
    } else {
      handler = getFundDailyValueMulti(reqQueue[0].list)
    }
    handler.then(() => {
      isFetching = false
      flushQueue()
    })
  } else {
    isFetching = false
  }
}

// 基金列表每条数组字段对应值
const fundInfo = {
  code: 0,
  name: 1,
  name_jp: 2,
}

// 解析基金列表数据
// 返回未入库的基金信息
function parseData(data, map) {
  const updated_at = date.format(new Date(), 'YYYY-MM-DD')
  return _.reduce(data, (rst, item) => {
    const code = item[fundInfo.code]
    if (!map.has(code)) {
      rst.insert.push(_.reduce(fundInfo, (acc, index, key) => {
        acc[key] = item[index]
        return acc
      }, { updated_at }))
    }
    rst.list.push({
      code,
      // 已经入库的开始时间使用库中记录的时间，
      // 未入库的开始时间为空
      value_updated_at: map.get(code) || '',
    })
    return rst
  }, {
    insert: [],   // 需要被插入的基金
    list: [],     // 所有的基金
  })
}


// 抓取基金列表
// 1、对已经入库的基金（TODO: 更新）
//    对未入库的基金（新增）入库
let fundTotalPage = 0
function getAllFund(page, map, retryTimes) {
  const size = 200
  const options = listReqConf(page, size)
  console.log('===> getAllFund request', page)
  return randomReqest()(options).then(ack => {
    if (ack && ack.data) {
      eval(ack.data)
      console.log('<=== response getAllFund :', db.curpage, db.pages)
      const data = db.datas || []
      fundTotalPage = db.pages
      const rst = parseData(data, map)
      let sequence = Promise.resolve()
      // 对未入库的基金，抓取详细信息，然后入基金列表库
      if (rst.insert.length) {
        reqQueue.push({
          type: 'detail',
          list: rst.insert,
        })
      }
      // 对于所有基金，抓取每日基金净值信息，入库
      if (rst.list.length) {
        reqQueue.push({
          type: 'dailyValue',
          list: rst.list,
        })
      }
      flushQueue()
      return fundTotalPage
    } else {
      console.log('获取基金列表返回值为空, page=', page, 'size=', size)
      console.log(ack)
      console.log('进行重试', retryTimes)
      retryTimes += 1
      if (retryTimes >= 5) {
        console.log('获取基金列表重试次数用尽, page=', page, 'size=', size)
        return 0
      } else {
        return getAllFund(page, map, retryTimes)
      }
    }
  })
}

// 读取数据库基金列表存入map
// 开启抓取队列
function fetchFundData() {
  const rst = {}
  selectFund().then(res => {
    const map = new Map()
    _.forEach(res, item => {
      map.set(item.code, item.value_updated_at)
    })
    const retryTimes = 0
    getAllFund(1, map, retryTimes).then(totalPage => {
      let i = 2;
      while (i <= totalPage) {
        getAllFund(i, map, retryTimes)
        i += 1
      }
    })
  })
}

fetchFundData()


module.exports = {
  fetchFundData,
}
