const _ = require('lodash')
const logger = require('../../../src/middleware/logger')

describe('middleware/logger', () => {

  const next = () => Promise.resolve()
  beforeAll(() => {
    global._ = _
  })

  it('monitorData isEmpty skip report', async () => {
    const middleware = logger.init()
    const ctx = {
      logger: {
        info: jest.fn(),
      }
    }
    await middleware(ctx, next)
    expect(ctx.logger.info).toBeCalledTimes(2)
  })

  it('logger api report', async () => {
    const middleware = logger.init()
    const ctx = {
      method: 'get',
      url: 'url',
      logger: {
        info: jest.fn(),
      },
      body: {
        code: 1,
      },
      _monitorData: {
        some: 'some',
      }
    }
    await middleware(ctx, next)
    expect(ctx.logger.info).toBeCalledTimes(2)
  })

  it('logger static report', async () => {
    const middleware = logger.init()
    const ctx = {
      method: 'get',
      url: '/static/url',
      logger: {
        info: jest.fn(),
      },
      _monitorData: {
        some: 'some',
      },
      status: 200,
    }
    await middleware(ctx, next)
    expect(ctx.logger.info).toBeCalledTimes(2)
  })

})

