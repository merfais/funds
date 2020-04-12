const fs = require('fs')
const path = require('path')
const datefns = require('date-fns')
const {
  appendFile,
} = require('../utils')

const dir = path.resolve(__dirname, '../../exceptions')
fs.mkdirSync(dir, { recursive: true })

function saveFundDailyState(data) {
  const name =`dailyState_${datefns.format(new Date(), 'yyyy-MM-dd')}.js`
  appendFile(path.join(dir, name), data, true)
}

function fundDetail() {

}

module.exports = {
  saveFundDailyState,
}
