const _ = require('lodash')
const genModel = require('../mock/model')
const user = require('../../../src/model/user')

describe('model/user', () => {

  beforeAll(() => {
    global._ = _
    user.model = genModel()
  })

  it('find filter by name', async () => {
    const execRes = [{}]
    user.model.exec.mockImplementationOnce(fn => fn(null, execRes))
    const filter = { name: 'name' }
    const res = await user.find(filter)
    expect(user.model.find.mock.calls.length).toBe(2)
    expect(user.model.find.mock.calls[0][0]).toEqual(filter)
    expect(user.model.countDocuments.mock.calls.length).toBe(1)
    expect(user.model.findById.mock.calls.length).toBe(0)
    expect(user.model.sort.mock.calls.length).toBe(0)
    expect(user.model.skip.mock.calls.length).toBe(1)
    expect(user.model.skip.mock.calls[0][0]).toBe(0)
    expect(user.model.limit.mock.calls.length).toBe(1)
    expect(user.model.limit.mock.calls[0][0]).toBe(10)
    expect(res).toEqual(execRes[0])
  })

  it('find filter by _id', async () => {
    const execRes = {}
    user.model.exec.mockImplementationOnce(fn => fn(null, execRes))
    const res = await user.find({ _id: 1 })
    expect(user.model.findById.mock.calls.length).toBe(1);
    expect(user.model.countDocuments.mock.calls.length).toBe(0)
    expect(user.model.find.mock.calls.length).toBe(0)
    expect(user.model.sort.mock.calls.length).toBe(0)
    expect(user.model.skip.mock.calls.length).toBe(0)
    expect(user.model.limit.mock.calls.length).toBe(0)
    expect(res).toEqual(execRes)
  })

  it('find filter some fields, ext use with default value, return error', async () => {
    const execRes = 'error'
    user.model.exec.mockImplementationOnce(fn => fn(execRes, null))
    const filter = { name: 'name' }
    const ext = {
      sort: 'name',
    }
    try {
      const res = await user.find(filter, ext)
    } catch (e) {
      expect(user.model.find.mock.calls.length).toBe(2)
      expect(user.model.find.mock.calls[0][0]).toEqual(filter)
      expect(user.model.countDocuments.mock.calls.length).toBe(1)
      expect(user.model.findById.mock.calls.length).toBe(0)
      expect(user.model.sort.mock.calls.length).toBe(1)
      expect(user.model.sort.mock.calls[0][0]).toEqual({ [ext.sort]: 'asc' })
      expect(user.model.skip.mock.calls.length).toBe(1)
      expect(user.model.skip.mock.calls[0][0]).toBe(0)
      expect(user.model.limit.mock.calls.length).toBe(1)
      expect(user.model.limit.mock.calls[0][0]).toBe(10)
      expect(e).toEqual(execRes)
    }
  })

})

