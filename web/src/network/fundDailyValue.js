import _ from 'lodash'
import request from './request'

const url = '/api/v1/daily_value'

export function get() {
  return request({ url, params: { page: 0 } }).then(res => {
    const list = _.map(_.get(res, 'data.list'), (item, index) => {
      return item
    })
    return {
      list,
    }
  })
}

export function create(options = {}) {
  return request({
    url,
    method: 'post',
    ...options,
  }).then(res => {
    return _.get(res, 'data', {})
  })
}

export function update(options = {}) {
  return request({
    url: `${url}/patch`,
    method: 'post',
    ...options,
  }).then(res => {
    return _.get(res, 'data', {})
  })
}

export function del(options = {}) {
  return request({
    url: `${url}/delete`,
    method: 'post',
    ...options,
  }).then(res => {
    return res
  })
}

export function getNotOpenDailyValue() {
  return request({
    url: `${url}/not_open`
  }).then(res => {
    console.log(res)
    return res.data
  })
}
