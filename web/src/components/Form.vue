<script>
import _ from 'lodash'

export default {
  components: {
  },
  props: {
    loading: [Boolean, String],
    formTitle: String,
    formItems: Object,
    itemLabelWidth: {
      type: String,
      default: '100px',
    },
  },
  data() {
    return {
      valid: true,
    }
  },
  computed: {
  },
  methods: {
    submit() {
      const valid = this.$refs.form.validate()
      if (valid) {
        const rst = _.reduce(this.formItems, (acc, item, key) => {
          acc[key] = item.value
          return acc
        }, {})
        this.$emit('submit', rst)
      }
    },
    cancel() {
      this.$emit('cancel')
    },
  },

  render(h) {
    const genItemLabel = item => {
      return (
        <div class='mt-1 mr-3 text-right'
          style={{ width: item.labelWidth || this.itemLabelWidth }}
          slot='prepend'
          >
          {item.label} :
        </div>
      )
    }
    const genSlots = item => {
      if (_.isFunction(item.slots)) {
        return item.slots(h)
      }
      return null
    }
    const FormItem = _.map(this.formItems, (item, key) => {
      let ItemContent = ''
      if (item.type === 'text') {
        ItemContent = (
          <v-text-field
            key='{key}'
            clearable
            outlined
            dense
            vModel={item.value}
            rules={item.rules}
            hide-details="auto"
            placeholder={item.placeholder}
            >
            {genItemLabel(item)}
            {genSlots(item)}
          </v-text-field>
        )
      } else if (item.type === 'combobox') {
        ItemContent = (
          <v-combobox
            key={key}
            clearable
            multiple
            chips
            small-chips
            outlined
            dense
            deletable-chips
            hide-details='auto'
            vModel={item.value}
            rules={item.rules}
            items={item.options}
            >
            {genItemLabel(item)}
            {genSlots(item)}
          </v-combobox>
        )
      } else if (item.type === 'autocomplete') {
        ItemContent = (
          <v-autocomplete
            key={key}
            clearable
            multiple
            chips
            small-chips
            outlined
            dense
            deletable-chips
            hide-details='auto'
            vModel={item.value}
            rules={item.rules}
            items={item.options}
            >
            {genItemLabel(item)}
            {genSlots(item)}
          </v-autocomplete>
        )
      } else if (item.type === 'checkbox') {
        ItemContent = _.map(item.options, ({ text, value }, index) => {
          return (
            <v-checkbox
              class='mr-4 mt-0'
              key={value}
              v-model={item.value}
              value={value}
              label={text}
              rules={item.rules}
              hide-details='auto'
              >
              { !index && genItemLabel(item) }
            </v-checkbox>
          )
        })
      } else if (item.type === 'radio') {
        const Items = _.map(item.options, ({ text, value}, index) => {
          return (
            <v-radio
              key={value}
              label={text}
              value={value}
              hide-details='auto'
              >
             </v-radio>
          )
        })
        ItemContent = (
          <v-radio-group
            row
            v-model={item.value}
            >
            {genItemLabel(item)}
            {genSlots(item)}
            {Items}
          </v-radio-group>
        )
      } else if (item.type === 'switch') {
        const truely = item.trueValue || true
        const label = item.value === truely
          ? (item.trueLabel || item.label)
          : (item.falseLabel || item.label)
        ItemContent = (
          <v-switch
            v-model={item.value}
            label={label}
            hide-details='auto'
            >
            {genItemLabel(item)}
            {genSlots(item)}
          </v-switch>
        )
      } else if (item.type === 'textarea') {
        ItemContent = (
          <v-textarea
            outlined
            dense
            hide-details='auto'
            vModel={item.value}
            rows={item.rows || 2}
            placeholder={item.placeholder}
            >
            {genItemLabel(item)}
            {genSlots(item)}
          </v-textarea>
        )
      }
      return (<v-row class='ma-3'>{ItemContent}</v-row>)
    })
    return (
      <v-card loading={this.loading}>
        <v-card-title>
          <span class="headline">{this.formTitle}</span>
          <v-spacer></v-spacer>
          <v-btn icon
            onClick={this.cancel}
            >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-form
            lazy-validation
            ref='form'
            vModel={this.valid}
            >
            {FormItem}
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions
          class='my-3 mr-3'
          >
          <v-spacer></v-spacer>
          <v-btn class='mr-5'
            onClick={this.cancel}
            >
            取消
          </v-btn>
          <v-btn class='ml-5'
            color='primary'
            onClick={this.submit}
            >
            提交
          </v-btn>
        </v-card-actions>
      </v-card>
    )
  },
}
</script>
<style scoped>

</style>
