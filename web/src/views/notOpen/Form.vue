<script>
import { mapActions, mapGetters, mapState, mapMutations } from 'vuex'
import MyDialogForm from 'components/DialogForm'

export default {
  components: {
    MyDialogForm,
  },
  props: {
  },
  data() {
    return {
      formItems: {
        _id: {
          type: 'hidden',
          value: '',
        },
        name: {
          label: '名称',
          value: '',
          type: 'text',
        },
      },
    }
  },
  computed: {
    ...mapState('notOpen', {
      editedItem: 'tableEditedItem',
      dialogIsVisible: 'dialogFormIsVisible',
      loading: 'dialogFormLoading',
      dirty: 'formIsDirty',
    }),
  },
  methods: {
    ...mapMutations({
      setFormLoading: 'notOpen/setFormLoading',
      setDialogVisible: 'notOpen/setDialogFormVisible',
      setEditedItem: 'notOpen/setTableEditedItem',
      setFormDirtyFlag: 'notOpen/setFormDirtyFlag',
      success: 'message/success',
      info: 'message/info',
      error: 'message/error',
    }),
    ...mapActions({
    }),
    onSubmit(form) {
      this.setFormDirtyFlag(true)
      this.setFormLoading('success')
      const data = {
        ..._.pick(form, ['name', 'routes', 'admins']),
      }
      let msg = '添加'
      if (form._id) {
        data._id = form._id
        msg = '修改'
      }
      // this.submitHandler({ data, index: this.editedItem.index }).then(() => {
      //   this.setDialogVisible(false)
      //   this.success(`${msg}成功`)
      // }).catch(err => {
      //   this.setFormLoading(false)
      //   this.error(`${msg}失败(${err && err.msg || ''})`)
      // })
    },
    onCancel() {
      this.setDialogVisible(false)
    },
    resetFormData() {
      const item = this.editedItem
      if (item._id) {
        this.formItems._id.value = item._id
        this.formItems.name.value = item.name || ''
      } else {
        this.formItems._id.value = ''
        this.formItems.name.value = ''
      }
    },
    genFormData() {
      this.formTitle ='新建'
      // this.submitHandler = this.createProject
      if (this.editedItem._id) {
        this.formTitle = '修改'
        // this.submitHandler = this.updateProject
      }
      this.resetFormData()
    },
  },
  mounted() {
  },
  render(h) {
    if (this.dialogIsVisible && !this.dirty) {
      this.genFormData()
    }
    const on = {
      submit: this.onSubmit,
      cancel: this.onCancel,
      input: this.setDialogVisible,
      clickCreate: e => this.setEditedItem({}),
    }
    return (
      <my-dialog-form
        value={this.dialogIsVisible}
        loading={this.loading}
        activator={this.activator}
        formTitle={this.formTitle}
        formItems={this.formItems}
        on={on}
        />
    )
  },
}
</script>
<style scoped>

</style>
