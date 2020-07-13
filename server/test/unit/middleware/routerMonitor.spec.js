const _ = require('lodash')
const monitor = require('../../../src/middleware/routerMonitor')
const config = require('../../../src/utils/config')

describe('middleware/routerMonitor', () => {

  const next = () => Promise.resolve()
  beforeAll(() => {
    global._ = _
  })

  it('init with send alarm', async () => {
    const alarmConf = {
      codeAlarm: {
        enable: true,
        receiver: ['user1', 'user2'],
      }
    }
    const conf = config.init(alarmConf)
    const middleware = monitor.init(conf)
    const ctx = {
      header: {
        ['user-agent']: 'python-requests1.0/sdf',
      },
      request: {
        ip: 'ip',
      },
      status: 500,
    }
    const body = {}
    await middleware(ctx, next)
    expect(ctx._monitorData).toEqual({
      retCode: 500,
      status: 500,
      aService: 'python',
      aInterface: 'python-requests',
    })
  })

  it('init', async () => {
    const conf = config.init({})
    const middleware = monitor.init(conf)
    const ctx = {
      header: {
        ['user-agent']: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
      },
      request: {
        ip: 'ip',
      },
      body: {
        code: 200,
      },
    }
    await middleware(ctx, next)
    expect(ctx._monitorData).toEqual({
      retCode: 0,
      status: 0,
      aService: 'browser',
      aInterface: 'Mozilla',
    })
  })

  it('init unknown ua', async () => {
    const conf = config.init({})
    const middleware = monitor.init(conf)
    const ctx = {
      header: {
        ['x-client-ip-port']: '1.1.1.1',
        ['user-agent']: 'unknown',
      },
      request: {
        ip: 'ip',
      },
      body: {
        code: 0,
      },
      status: 200,
    }
    await middleware(ctx, next)
    expect(ctx._monitorData).toEqual({
      retCode: 0,
      status: 0,
      aService: 'unknown',
      aInterface: 'unknown',
    })
  })

})

