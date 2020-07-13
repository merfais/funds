import _ from 'lodash'

const state = {
  show: false,
  text: '',
  color: 'info',
  timeout: 3000,
  left: false,
  right: true,
  bottom: false,
  top: true,
  multiLine: false,
  vertical: false,
}

const getters = {
}

function show(state, payload, opt = {}) {
  state.show = true
  if (_.isString(payload)) {
    payload = { text: payload }
  }
  const options = { ...opt, ...payload }
  state.text = options.text
  state.color = options.color
  state.timeout = options.timeout || 3000
}

const actions = {
}

const mutations = {
  hide(state) {
    state.show = false
  },
  success(state, payload) {
    show(state, payload, {
      color: 'success'
    })
  },
  info(state, payload) {
    show(state, payload, {
      color: 'info'
    })
  },
  warn(state, payload) {
    show(state, payload, {
      color: 'warning'
    })
  },
  error(state, payload) {
    show(state, payload, {
      color: 'error'
    })
  },
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
