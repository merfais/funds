const _ = require('lodash')
const logger = require('../../../src/utils/logger')
const config = require('../../../src/utils/config')

global.console = {
  log: jest.fn()
}

describe('utils/logger', () => {

  beforeAll(() => {
    global._ = _
  })

  it('init', async () => {
    const conf = config.init({
      debug: {
        logger: {
          console: 'logger_console'
        }
      }
    })
    process.env.DEBUG_LOG = 'logger_console'
    logger.init(conf)
    expect(logger.fatal).not.toBeUndefined()
    expect(logger.error).not.toBeUndefined()
    expect(logger.warn).not.toBeUndefined()
    expect(logger.info).not.toBeUndefined()
    expect(logger.log).not.toBeUndefined()
    expect(logger.debug).not.toBeUndefined()
    expect(logger.trace).not.toBeUndefined()
  })

  it('logger.info', async () => {
    logger.info(1, 'a', true, {}, [], null, undefined)
    expect(console.log).toBeCalled()
    expect(/\[info\] -/i.test(console.log.mock.calls[0][0])).toBe(true)
    expect(console.log.mock.calls[0][1]).toBe('1 a true {} [] null undefined')
  })

  it('genLogger', async () => {
    let res = logger.genLogger('prefix')
    res.info(1, 'a', false, { a: '' }, [1, 2], null, undefined)
    res = logger.genLogger('')
    res.warn(1, 'a', false, { a: '' }, [1, 2], null, undefined)
    expect(console.log).toBeCalledTimes(2)
    expect(/\[info\] -/i.test(console.log.mock.calls[0][0])).toBe(true)
    expect(console.log.mock.calls[0][1]).toBe("[prefix] - 1 a false { a: '' } [ 1, 2 ] null undefined")
    expect(/\[warn\] -/i.test(console.log.mock.calls[1][0])).toBe(true)
    expect(console.log.mock.calls[1][1]).toBe("1 a false { a: '' } [ 1, 2 ] null undefined")
  })

})

