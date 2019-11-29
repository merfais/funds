const easyMonitor = require('easy-monitor');
const {
  fetchFundData,
} = require('./fundInfo')

easyMonitor('你的项目名称');

fetchFundData()
