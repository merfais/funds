module.exports = {
  tmpdir: './tmp',     // 临时文件路径，相对于server的目录，用于存放上传的文件
  static: {   // 静态资源配置
    path: './public',           // 资源目录,相对于server目录的路径
    index: 'index.html',        // 资源入口
  },
  superAdmin: ['coffeebi'],
  mongodb: {
    username: 'user_rw',
    password: 'pwd_123',
    host: '127.0.0.1',
    port: 27017,
    database: 'prodDB',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
  },
  codeAlarm: {    // API返回码异常告警
    enable: false,
    receiver: ['coffeebi'],
  },
}

