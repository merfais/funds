import _ from 'lodash'

const state = {
  tableEditedItem: {},
  dialogFormIsVisible: false,
  dialogFormLoading: false,
  formIsDirty: false, // 提交表单时设置标识，否则表单会重新渲染，丢失填写的数据
}

const getters = {
}

const actions = {
}

const mutations = {
  setFormLoading(state, paylod){
    state.dialogFormLoading = paylod
  },
  setDialogFormVisible(state, paylod){
    state.dialogFormIsVisible = paylod
    if (paylod === false) {
      state.dialogFormLoading = false
      state.formIsDirty = false
    }
  },
  setTableEditedItem(state, paylod) {
    state.tableEditedItem = paylod
  },
  setFormDirtyFlag(state, paylod) {
    state.formIsDirty = paylod
  },
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
