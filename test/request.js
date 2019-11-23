const _ = require('lodash')
const {
  genFundDailyValueOptions,
} = require('../src/options.js')
const {
  request
} = require('../src/utils/index.js')

function test() {
  const options = genFundDailyValueOptions('003446', '2019-11-01', 3, 10)

  request(options).then(ack => {
    console.log(ack.data)
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
          console.log(err)
        }
      }
      console.log(list, list.count)
    }
  })
}

test()

//
// 做定时器队列，所有的请求生成options，success, fail入队
// 3s从队列中取一页(100个)请求，发出请求
// 成功回调，失败每个1秒重试1次，共重试5次
// 获取基金列表 7530个，38页
// 按页获取基金详细信息，7530个请求，100个一页
// 按页获取基金净值总个数，缓存到内存
