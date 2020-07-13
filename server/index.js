const path = require('path')

let conf
if (process.env.NODE_ENV === 'development') {
  conf = require(path.resolve(__dirname, '.devrc.js'))
} else {
  process.env.NODE_ENV = 'production'
  if (process.env.PROD_ENV === 'development') {
    conf = require(path.resolve(__dirname, 'config', 'dev.js'))
  } else {
    conf = require(path.resolve(__dirname, 'config', 'prod.js'))
  }
}

// 这个一定要最后再require，因为涉及的加载顺序
// dev启动前要检测dev环境, .devrc.js的存在
const App = require(path.resolve(__dirname, 'src', 'app.js'))
const app = new App(conf)
app.start()
