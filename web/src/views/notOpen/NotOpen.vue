<script>
import { mapActions, mapGetters, mapState, mapMutations } from 'vuex'
import MyTable from 'components/Table'
import SubForm from './Form'
import {
  getNotOpenDailyValue,
} from 'network/fundDailyValue'

export default {
  components: {
    SubForm,
    MyTable,
  },
  props: {
  },
  data: () => ({
    table: {
      loading: false,
      title: '存在未开放申购和赎回日的基金',
      headers: [{
        text: '基金代码',
        value: 'code',
      }, {
        text: '基金名称',
        value: 'name'
      },{
        text: '数量',
        value: 'count',
      }, {
        text: '操作',
        value: 'actions',
        sortable: false,
      }],
      data: [],
      namedSlots: {
        'item.admins': ({ item }) => {
          const admins = item.admins || []
          return <div>{admins.join('; ')}</div>
        },
      },
    },
    list: [],
  }),
  computed: {
  },
  methods: {
    ...mapMutations({
      setEditedItem: 'notOpen/setTableEditedItem',
      setDialogVisible: 'notOpen/setDialogFormVisible',
      success: 'message/success',
      warn: 'message/warn',
      error: 'message/error',
    }),
    ...mapActions({
    }),
    onDeleteItem({ item }) {
    },
    onModifyItem({ item }) {
      this.setEditedItem(item)
      this.setDialogVisible(true)
    },
  },
  mounted() {
    this.table.loading = true
    getNotOpenDailyValue().then(list => {
      this.table.data = list
      this.table.loading = false
    }).catch(err =>{
      this.table.loading = false
      this.error('获取项目出错：', err)
    })
    this.getRouteTable()
  },
  render() {
    const Table = (
      <my-table
        title={this.table.title}
        headers={this.table.headers}
        list={this.table.data}
        loading={this.table.loading}
        namedSlots={this.table.namedSlots}
        onDeleteItem={this.onDeleteItem}
        onModifyItem={this.onModifyItem}
        >
        <sub-form slot='add-btn' />
      </my-table>
    )
    return (
      <div class='ma-6'>
        {Table}
      </div>
    )
  },
}
</script>
<style scoped>
.label {
  color: #0277BD;
}
.api-url {
  cursor: copy;
}
</style>
