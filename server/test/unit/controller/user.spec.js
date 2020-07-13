const _ = require('lodash')
const user = require('../../../src/controller/user')
const { CODE } = require('../../../src/constants')
const userService = require('../../../src/service/user')

jest.mock('../../../src/service/user')


describe('controller/user', () => {

  beforeAll(() => {
    global._ = _
  })

  it('get invalid params', async () => {
    const invalidMsg = { msg: 'invalidMsg', code: CODE.ILLEGAL_FIELD_TYPE }
    userService.validate.mockImplementationOnce(() => Promise.resolve(invalidMsg))
    const ctx = {
      request: {},
      params: { _id: 'id'},
    }
    await user.get(ctx)
    expect(userService.validate.mock.calls.length).toBe(1)
    expect(userService.validate.mock.calls[0][0]).toEqual(ctx.params)
    expect(userService.get.mock.calls.length).toBe(0)
    expect(ctx.body).toEqual(invalidMsg)
  })

  it('get success', async () => {
    const getRes = {}
    userService.get.mockImplementationOnce(() => Promise.resolve(getRes))
    userService.validate.mockImplementationOnce(() => Promise.resolve())
    const ext = { sort: '_id' }
    const ctx = {
      request: {},
      query: { _id: 'id', ...ext },
    }
    await user.get(ctx)
    expect(userService.validate.mock.calls.length).toBe(1)
    expect(userService.validate.mock.calls[0][0]).toEqual(ctx.query)
    expect(userService.get.mock.calls.length).toBe(1)
    expect(userService.get.mock.calls[0][0]).toEqual({ _id: ctx.query._id })
    expect(userService.get.mock.calls[0][1]).toEqual(ext)
    expect(ctx.body).toEqual({
      code: 0,
      data: getRes,
    })
  })

  it('get fail', async () => {
    const getRes = { message: 'error'}
    userService.get.mockImplementationOnce(() => Promise.reject(getRes))
    userService.validate.mockImplementationOnce(() => Promise.resolve())
    const ext = {
      page: 1,
      size: 10,
      order: 'desc',
      sort: 'name',
    }
    const ctx = {
      request: {},
      params: { _id: 'id'},
      query: {
        name: 'name',
        ...ext,
      }
    }
    await user.get(ctx)
    expect(userService.validate.mock.calls.length).toBe(1)
    expect(userService.validate.mock.calls[0][0]).toEqual({
      ...ctx.params,
      ...ctx.query,
    })
    expect(userService.get.mock.calls.length).toBe(1)
    expect(userService.get.mock.calls[0][0]).toEqual({
      ...ctx.params,
      name: ctx.query.name,
    })
    expect(userService.get.mock.calls[0][1]).toEqual(ext)
    expect(ctx.body).toEqual({
      msg: getRes.message,
      code: -1,
    })
  })

  it('post missing required parameters', async () => {
    const ctx = {
      request: {
        body: {
        }
      },
    }
    await user.post(ctx)
    expect(userService.validate.mock.calls.length).toBe(0)
    expect(userService.post.mock.calls.length).toBe(0)
    expect(ctx.body).toEqual({
      msg: `缺少 name 字段`,
      code: CODE.MISSING_FIELDS,
    })
  })

  it('post invalid params', async () => {
    const invalidMsg = { msg: 'invalidMsg', code: CODE.ILLEGAL_FIELD_TYPE }
    userService.validate.mockImplementationOnce(() => Promise.resolve(invalidMsg))
    const ctx = {
      request: {
        body: {
          name: 'name',
        }
      }
    }
    const autoFillField = {
    }
    const data = {
      ...ctx.request.body,
      ...autoFillField,
    }
    await user.post(ctx)
    expect(userService.validate.mock.calls.length).toBe(1)
    expect(userService.validate.mock.calls[0][0]).toEqual(data)
    expect(userService.post.mock.calls.length).toBe(0)
    expect(ctx.body).toEqual(invalidMsg)
  })

  it('post success', async () => {
    const postRes = {}
    userService.post.mockImplementationOnce(() => Promise.resolve(postRes))
    userService.validate.mockImplementationOnce(() => Promise.resolve())
    const ctx = {
      request: {
        body: {
          name: 'name',
        }
      }
    }
    const autoFillField = {
    }
    const data = {
      ...ctx.request.body,
      ...autoFillField,
    }
    await user.post(ctx)
    expect(userService.validate.mock.calls.length).toBe(1)
    expect(userService.validate.mock.calls[0][0]).toEqual(data)
    expect(userService.post.mock.calls.length).toBe(1)
    expect(userService.post.mock.calls[0][0]).toEqual(data)
    expect(ctx.body).toEqual({
      code: 0,
      data: postRes,
    })
  })

  it('post fail', async () => {
    const postRes = { msg: 'error' }
    userService.post.mockImplementationOnce(() => Promise.reject(postRes))
    userService.validate.mockImplementationOnce(() => Promise.resolve())
    const ctx = {
      request: {
        body: {
          name: 'name',
        }
      }
    }
    const autoFillField = {
    }
    const data = {
      ...ctx.request.body,
      ...autoFillField,
    }
    await user.post(ctx)
    expect(userService.validate.mock.calls.length).toBe(1)
    expect(userService.validate.mock.calls[0][0]).toEqual(data)
    expect(userService.post.mock.calls.length).toBe(1)
    expect(userService.post.mock.calls[0][0]).toEqual(data)
    expect(ctx.body).toEqual({
      code: -1,
      msg: postRes.msg,
    })
  })

})

