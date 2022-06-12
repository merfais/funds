
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
function genAllFundOptions(page, size = 200) {
  return {
    _sid_: `[${Math.random().toString(16).slice(2, 6)}]`,
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
    headers: {
      Referer: 'http://fund.eastmoney.com/fund.html',
      Host: 'fund.eastmoney.com',
    }
  }
}

// jQuery183017676416579176246_1549120558358({
//   "ErrCode": 0,
//   "ErrMsg": null,
//   "Datas": [{
//     "_id": "100056",
//     "CODE": "100056",
//     "NAME": "富国低碳环保混合",
//     "JP": "FGDTHBHH",
//     "CATEGORY": 700,
//     "CATEGORYDESC": "基金",
//     "STOCKMARKET": "",
//     "BACKCODE": "",
//     "MatchCount": 1,
//     "FundBaseInfo": {
//       "_id": "100056",
//       "DWJZ": 2.11,
//       "FCODE": "100056",
//       "FSRQ": "2019-02-01",
//       "FTYPE": "混合型",
//       "FUNDTYPE": "002",
//       "ISBUY": "1",
//       "JJGS": "富国基金",
//       "JJGSBID": 12.0,
//       "JJGSID": "80000221",
//       "JJJL": "魏伟",
//       "JJJLID": "30142280",
//       "MINSG": 100.0,
//       "NAVURL": "http://fund.eastmoney.com/HH_jzzzl.html#os_0;isall_0;ft_;pt_3",
//       "OTHERNAME": "富国低碳",
//       "SHORTNAME": "富国低碳环保混合"
//     },
//     "StockHolder": "",
//     "ZTJJInfo": [{
//       "TTYPE": "a51805733a0043a2",
//       "TTYPENAME": "股权激励"
//     }, {
//       "TTYPE": "287151eaa5271b35",
//       "TTYPENAME": "广东板块"
//     }]
//   }]
// })
// 查询基金详细信息
function genFundDetailOptions(key) {
  return {
    _sid_: `[${Math.random().toString(16).slice(2, 6)}]`,
    method: 'get',
    baseURL: 'http://fundsuggest.eastmoney.com',
    url: '/FundSearch/api/FundSearchAPI.ashx',
    params: {
      callback: 'jQuery18302567309292453006_1550157024546',
      m: 1,
      key,
      _: Date.now()
    },
    headers: {
      Referer: 'http://fund.eastmoney.com/HH_jzzzl.html',
      Host: 'fundsuggest.eastmoney.com',
    }
  }
}


// jQuery183029891349965456415_1551710029686({
//   "Data": {
//     "LSJZList": [{
//       "FSRQ": "2019-03-04",
//       "DWJZ": "1.1790",
//       "LJJZ": "1.3490",
//       "SDATE": null,
//       "ACTUALSYI": "",
//       "NAVTYPE": "1",
//       "JZZZL": "6.31",
//       "SGZT": "开放申购",
//       "SHZT": "开放赎回",
//       "FHFCZ": "1.004453908",
//       "FHFCBZ": "",
//       "DTYPE": null,
//       "FHSP": "每份基金份额折算1.004453908份"
//     }],
//     "FundType": "002",
//     "SYType": null,
//     "isNewType": false,
//     "Feature": "211"
//   },
//   "ErrCode": 0,
//   "ErrMsg": null,
//   "TotalCount": 557,
//   "Expansion": null,
//   "PageSize": 20,
//   "PageIndex": 1
// })
// 查询每日基金净值
function genFundDailyValueOptions(fundCode, startDate, pageIndex = 1, pageSize = 200) {
  const date = Date.now()
  return {
    _sid_: `[${Math.random().toString(16).slice(2, 6)}]`,
    method: 'get',
    baseURL: 'http://api.fund.eastmoney.com',
    url: '/f10/lsjz',
    params: {
      callback: 'jQuery18309361518911959754_' + Date.now(),
      fundCode,
      pageIndex,
      pageSize,
      startDate: startDate || '',
      endDate: '',
      _: Date.now(),
    },
    headers: {
      Referer: `http://fundf10.eastmoney.com/jjjz_${fundCode}.html`,
    }
  }
}


module.exports = {
  genAllFundOptions,
  genFundDetailOptions,
  genFundDailyValueOptions,
}
