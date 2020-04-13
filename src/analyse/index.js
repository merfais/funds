const {
  run,
} = require('./dingtou')

function d20190501() {
  const tableName = 'r20190501_20200410'
  const limit = {
    date: {
      '>=': '2019-05-01',
    }
  }
  const minCycle = 6
  const maxCycle = 12
  const cycleType = 'M'
  run({
    tableName,
    limit,
    minCycle,
    maxCycle,
    cycleType,
  })
}


d20190501()
