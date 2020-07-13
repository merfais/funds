const _ = require('lodash')
const user = require('../../../src/service/user')
const { CODE } = require('../../../src/constants')
const userModel = require('../../../src/model/user')
const genModel = require('../mock/model')

jest.mock('../../../src/model', () => {
  const origin = jest.requireActual('../../../src/model')
  const { getAllFuncs } = require('./utils')

  Object.keys(origin).forEach(m => {
    getAllFuncs(origin[m]).forEach(key => {
      const rawfn = origin[m][key]
      origin[m][key] = jest.fn().mockImplementation(rawfn)
    })
  })
  return origin
})

userModel.model = genModel()

describe('service/user', () => {

  beforeAll(() => {
    global._ = _
  })

  it('get filter with name_like', async () => {
    const execRes = [{}]
    userModel.model.exec.mockImplementationOnce(fn => fn(null, execRes))
    userModel.model.exec.mockImplementationOnce(fn => fn(null, execRes.length))
    const filter = {
      name_like: 'name_like',
    }
    const ext = {
      page: 1,
      size: 10,
      order: 'desc',
      sort: 'name',
    }
    const res = await user.get(filter, ext)
    expect(userModel.find.mock.calls.length).toBe(1)
    expect(userModel.find.mock.calls[0][0]).toEqual({
      name: { $regex: new RegExp(filter.name_like, 'i') },
    })
    expect(userModel.find.mock.calls[0][1]).toEqual(ext)
    expect(res).toEqual({
      list: execRes,
      total: execRes.length,
      page: 1,
      size: execRes.length,
    })
  })

  it('get filter with name', async () => {
    const execRes = [{}]
    userModel.model.exec.mockImplementationOnce(fn => fn(null, execRes))
    userModel.model.exec.mockImplementationOnce(fn => fn(null, execRes.length))
    const filter = {
      name: 'name'
    }
    const ext = {
      page: 1,
      size: 10,
      order: 'desc',
      sort: 'name',
    }
    const res = await user.get(filter, ext)
    expect(userModel.find.mock.calls.length).toBe(1)
    expect(userModel.find.mock.calls[0][0]).toEqual(filter)
    expect(userModel.find.mock.calls[0][1]).toEqual(ext)
    expect(res).toEqual(execRes[0])
  })

  it('post data', async () => {
    const resUser = { name: 'name', _id: '_id' }
    userModel.model.exec.mockImplementationOnce(fn => fn(null, resUser))
    const data = {
      name: 'nameeeeeeeeeeeeeee'
    }
    const res = await user.post(data)
    expect(userModel.findOneAndCreate.mock.calls.length).toBe(1)
    expect(userModel.findOneAndCreate.mock.calls[0][0]).toEqual(data)
    expect(res).toEqual(resUser)
  })

  it('validate', async () => {
    _.forEach(user.paramsType, async (item, field) => {
      const invalidMsg = await user.validate({ [field]: null })
      let typeRequired = Object.prototype.toString.call(item.prototype)
      if (Object.prototype.toString.call(item) === '[object Object]') {
        if (Object.prototype.toString.call(item.regExp) === '[object RegExp]') {
          if (Object.prototype.toString.call(item.type) === '[object String]') {
            typeRequired = item.type
          } else {
            typeRequired = Object.prototype.toString.call(item.type.prototype)
          }
        }
      }
      expect(invalidMsg).toEqual({
        msg: `${field}字段类型错误, 需要${typeRequired}`,
        code: CODE.ILLEGAL_FIELD_TYPE,
      })
    })
    expect(await user.validate({ none: '' })).toBe('')
    expect(await user.validate({ name: '' })).toBe('')
  })

})

