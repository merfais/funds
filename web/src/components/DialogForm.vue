<script>
import _ from 'lodash'
import MyForm from 'components/Form'

export default {
  components: {
    MyForm,
  },
  props: {
    width: {
      type: String,
      default: '800px',
    },
    value: Boolean,
    formTitle: String,
    formItems: Object,
    formItemLabelWidth: String,
    loading: [Boolean, String],
  },
  data() {
    return {
      search: '',
    }
  },
  computed: {
  },
  watch: {
  },
  created () {
  },
  mounted() {
  },
  methods: {
    genActivator(h) {
      if (!this.activator) {
        this.activator = ({on}) => {
          const onClick = e => {
            this.$emit('clickCreate', e)
            on.click(e)
          }
          if (this.$scopedSlots.activator) {
            return this.$scopedSlots.activator({ on: { click: onClick } })
          } else {
            return (
              <v-btn color="primary"
                dark
                onClick={onClick}
                >
                <v-icon left>add</v-icon>新建
              </v-btn>
            )
          }
        }
      }
      return this.activator
    },
  },
  render(h) {
    const on = {
      submit: e => this.$emit('submit', e),
      cancel: e => this.$emit('cancel', e),
    }
    const Form = (
      <my-form
        loading={this.loading}
        formTitle={this.formTitle}
        formItems={this.formItems}
        itemLabelWidth={this.formItemLabelWidth}
        on={on}
        />
    )
    const activator = this.genActivator(h)
    return (
      <v-dialog
        scrollable
        width={this.width}
        value={this.value}
        onInput={e => this.$emit('input', e)}
        scopedSlots={{ activator }}
        >
        {this.value && Form}
      </v-dialog>
    )
  },
}
</script>
<style scoped>

</style>
