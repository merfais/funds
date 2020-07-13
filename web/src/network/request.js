import _ from 'lodash'
import axios from 'axios'

// 检查数据格式
function dftCheckCode({ code }) {
  return code === 0
}

function prepareUrl(url, params, data) {
  return url.replace(/(?<=\/):(\w+)/g, (m, key) => {
    if (_.has(params, key)) {
      const value = params[key]
      delete params[key]
      return value
    } else if (_.has(data, key)) {
      const value = data[key]
      delete data[key]
      return value
    }
  })
}

export default function request(options, {
  checkCode = dftCheckCode,
} = {}) {
  const method = options.method || 'get'
  const params = { ..._.get(options, 'params', {}) }
  const data = { ..._.get(options, 'data', {}) }
  let url
  if (/get/i.test(options.method)) {
    Object.assign(params, data)   // get 合并data到params
    url = prepareUrl(options.url, params)
  } else {
    url = prepareUrl(options.url, params, data)
  }
  const headers = { ... _.get(options, 'header', {}) }
  const opts = { method, url, params, data, headers }
  return axios(opts).then(res => {
    const data = res && res.data
    if (!res || !res.data) {
      console.error(res)
      return Promise.reject(res)
    }
    if (checkCode) {
      if (checkCode(data) !== true) {
        console.error(data)
        return Promise.reject(data)
      }
    }
    return data
  })
}
