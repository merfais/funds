const {
  setFundStartAt,
  close,
} = require('./db')

function run() {
  return setFundStartAt().then(r => {
    close()
  }).catch(err => {
    console.log(err)
    close()
  })
}

run()
