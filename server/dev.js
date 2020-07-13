const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const cp = require('child_process')
const _ = require('lodash')
const pkg = require('./package.json')

// 读取开发配置，覆盖production配置
const confPath = path.resolve(__dirname, '.devrc.js')
try {
  fs.accessSync(confPath)
} catch(e) {
  console.log(chalk.red('缺失server/.devrc.js文件，缺少启动开发环境的必要参数'))
  console.log(
    chalk.yellow('\n********************* conf example ************************\n\n')
    + `module.exports = {\n`
    + `  port: 30111,       // server 端口\n`
    + `  debug: {\n`
    + `    logger: {      // 调试日志的开关\n`
    + `      file: 'logger_file',        // 开发环境中DEBUG=logger_file生成文件日志\n`
    + `      console: 'logger_console',  // 生产环境中DEBUG=logger_console生成console日志\n`
    + `    }\n`
    + `  },\n`
    + `  clientDevConf: {\n`
    + `    path: '../front', // client代码相对server的path\n`
    + `    // env: 'development',      // env=development时会联合前端开发，执行command命令\n`
    + `    command: 'npm',          // 开发启动命令\n`
    + `    commandOpt: ['run', 'watch'], // 开发启动命令参数\n`
    + `  },\n`
    + `  watch: [    // 启动server后检测变化的文件, 相对于server目录，以下是默认值\n`
    + `              // './',\n`
    + `  ],\n`
    + `  ignore: [    // 启动server后忽略变化的文件，以下是默认值\n`
    + `               // '.git/*',\n`
    + `               // 'node_modules/*',\n`
    + `               // 'logs/*',\n`
    + `               // 'test/*',\n`
    + `               // 'package-lock.json',\n`
    + `  ],\n`
    + `  static: {   // 静态资源配置\n`
    + `    path: '../front/build',    // 资源目录\n`
    + `    index: 'index.html',        // 资源入口\n`
    + `  },\n`
    + `  mongodb: {   // mongodb 配置\n`
    + `    username: 'dev',\n`
    + `    password: 'dev.dev',\n`
    + `    host: '127.0.0.1',\n`
    + `    port: 27017,\n`
    + `    database: 'db',\n`
    + `    options: {\n`
    + `      useNewUrlParser: true,\n`
    + `      useUnifiedTopology: true,\n`
    + `    },\n`
    + `  },\n`
    + `}\n`
    + chalk.yellow('\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
  )
  process.exit(1)
}

const defaultWatch = [
  './',
  '.devrc.js',
]
const defaultIgnore = [
  ".git/*",
  "node_modules/*",
  "logs/*",
  "tmp/*",
  "test/*",
  "package-lock.json",
]

const conf = require(confPath)
if (conf.clientDevConf) {
  console.log(chalk.green('client.env:'), conf.clientDevConf.env, '\n')
  if (conf.clientDevConf.env === 'development') {
    const clientPath = path.resolve(__dirname, conf.clientDevConf.path)
    try {
      fs.accessSync(clientPath)
    } catch(e) {
      console.log(chalk.red('如果不对client启动开发模式，clientDevConf.path需要设置为空\n'))
      process.exit(1)
    }
    const command = conf.clientDevConf.command || 'npm'
    const opt = conf.clientDevConf.commandOpt || ['run', 'dev']
    cp.spawn(command, opt, {
      cwd: clientPath,
      stdio: 'inherit',
    })
    console.log('启动前端编译命里:', command, opt, '\n')
  }
  // 添加client的watch目录
  // defaultWatch.push(path.join(conf.clientDevConf.path, 'index.js'))
  // defaultWatch.push(path.join(conf.clientDevConf.path, 'modules'))
}

let watch = conf.watch
if (!watch || !watch.length) {
  watch = _.map(defaultWatch, p => path.resolve(__dirname, p))
}
let ignore = conf.ignore
if (!ignore || !ignore.length) {
  ignore = defaultIgnore
}

console.log('nodemon watch files:', watch)
console.log('nodemon ignore files:', ignore)

const nodemon = require('nodemon')

nodemon({
  script: path.resolve(__dirname, pkg.nodeAgent.main),
  verbose: true,
  watch,
  ignore,
  env: process.env,
})
nodemon.on('start', () => {
  console.log('nodemon has started');
}).on('quit', () => {
  console.log('nodemon has quit');
  process.exit();
}).on('restart', files => {
  console.log('nodemon restarted due to: ', files);
});
