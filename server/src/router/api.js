const body = require('koa-body')
const logger = require('../utils/logger').genLogger('router/api')
const {
  fundInfo,
  dailyValue,
  mock,
} = require('../controller')

class Api {
  constructor() {
    this.prefix = '/api/v1'
  }

  init(router, conf) {
    router.use(body({
      textLimit: '1mb',
      formLimit: '1mb',
      jsonLimit: '1mb',
      multipart: true,
      jsonStrict: false,
      formidable: {
        uploadDir: conf.get('tmpdir'),
        maxFieldsSize: 10 * 1024 * 1024, // 10mb
        keepExtensions: true,
      },
      onError(error) {
        logger.error('koa-body解析出现错误', error)
      }
    }))

    // fundInfo
    router.get('/fund', fundInfo.get.bind(fundInfo))
    router.get('/fund/:code', fundInfo.get.bind(fundInfo))
    router.post('/fund', fundInfo.post.bind(fundInfo))

    // dailyValue
    router.get('/daily_value/not_open', dailyValue.getNotOpen.bind(dailyValue))
    router.get('/daily_value', dailyValue.get.bind(dailyValue))
    router.get('/daily_value/:code', dailyValue.get.bind(dailyValue))

    router.get('/mock', mock.get.bind(mock))
    router.all('/', mock.all.bind(mock))

    return this
  }

}

const api = new Api()
module.exports = api
