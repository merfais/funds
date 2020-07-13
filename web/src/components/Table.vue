<script>
import _ from 'lodash'

export default {
  props: {
    list: Array,
    headers: Array,
    title: String,
    sortBy: {
      type: String,
      default: 'updated_at',
    },
    sortDesc: {
      type: Boolean,
      default: true,
    },
    namedSlots: Object,
    showExpand: Boolean,
    loading: Boolean,
    itemKey: {
      type: String,
      default: '_id',
    },
  },
  data() {
    return {
      search: '',
    }
  },
  computed: {
    tableItems() {
      return _.map(this.list, (item, index) => {
        item.index = index
        return item
      })
    },
  },
  watch: {
  },
  created () {
  },
  mounted() {
  },
  methods: {
    genRowActions(h) {
      if (!this.rowActions) {
        this.rowActions = (props) => {
          const modify = hprops => {
            const onClick = hprops.on.click || (() => {})
            const on = {
              ...hprops.on,
              click: e => {
                onClick()
                this.$emit('modifyItem', props)
              },
            }
            return (
              <v-icon
                small
                class="mr-2"
                on={on}
                >
                edit
              </v-icon>
            )
          }
          const del = ({ on }) => (
            <v-icon small on={on}>delete</v-icon>
          )
          return (
            <v-col class='d-flex flex-nowrap'>
              <v-tooltip top
                scopedSlots={{ activator: modify }}
                >
                <span>修改</span>
              </v-tooltip>
              <v-edit-dialog
                large
                cancelText='取消'
                saveText='确认'
                onSave={e => this.$emit('deleteItem', props)}
                >
                <v-tooltip top
                  scopedSlots={{ activator: del }}
                  >
                  <span>删除</span>
                </v-tooltip>
                <div class='subtitle-1 pt-3' slot='input'>确认要删除吗？</div>
              </v-edit-dialog>
            </v-col>
          )
        }
      }
      return this.rowActions
    },
  },
  render(h) {
    this.genRowActions(h)
    const SearchDom = (
      <v-text-field
        autofocus
        clearable
        v-model={this.search}
        hide-details
        prepend-inner-icon="mdi-magnify"
        single-line
      ></v-text-field>
    )
    const TopSlot = (
      <v-toolbar slot='top' class='elevation-1 mb-2'
        flat
        short
        tile
        color="white"
        >
        <v-toolbar-title>{this.title}</v-toolbar-title>
        <v-divider class="mx-4" inset vertical />
        {SearchDom}
        <v-spacer />
        {this.$slots['add-btn']}
      </v-toolbar>
    )
    return (
      <v-data-table
        class="elevation-3"
        search={this.search}
        item-key={this.itemKey}
        headers={this.headers}
        items={this.tableItems}
        sort-by={this.sortBy}
        sort-desc={this.sortDesc}
        showExpand={this.showExpand}
        loading={this.loading}
        scopedSlots={{
          'item.actions': this.rowActions,
          ...this.namedSlots,
        }}
        on={(...args) => {console.log(args)}}
        >
        {TopSlot}
      </v-data-table>
    )
  },
}
</script>
<style scoped>
</style>
