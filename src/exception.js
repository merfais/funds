const fs = require('fs')
const path = require('path')
const dateformat = require('date-format');
const {
  appendFile,
} = require('./utils')

const dir = path.resolve(__dirname, '../exceptions')
fs.mkdirSync(dir, { recursive: true })

function saveFundDailyState(data) {
  const name =`dailyState_${dateformat('yyyy-MM-dd', new Date())}.js`
  appendFile(path.join(dir, name), data, true)
}

function fundDetail() {

}

module.exports = {
  saveFundDailyState,
}
