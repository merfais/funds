const {
  getFundDailyValue,
} = require('../src/dailyValue')

getFundDailyValue({
  code: '000990',
  page: 1,
  start: '2019-11-28',
  size: 20,
}, [], 1).then(res => {

})
