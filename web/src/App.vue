<script>
import _ from 'lodash'
import { mapActions, mapState, mapMutations } from 'vuex'

export default {
  name: 'App',
  components: {
  },
  data: () => ({
    showNav: true,
    miniNav: true,
    items: [{
      to: '/',
      icon: 'dashboard',
      text: '定投'
    },
    {
      to: '/notOpen',
      icon: 'dvr',
      text: '净值'
    }],
    userName: '用户',
    avatarUrl: 'https://cdn.vuetifyjs.com/images/logos/vuetify-logo-dark.png',
  }),
  computed: {
    ...mapState('message', {
      snackBarValue: 'show',
      snackBarColor: 'color',
      snackBarText: 'text',
      snackBarLeft: 'left',
      snackBarRight: 'right',
      snackBarTop: 'top',
      snackBarBottom: 'bottom',
      snackBarTimeout: 'timeout',
      snackBarVertical: 'vertical',
      snackBarMulti: 'multiLine',
    }),
  },
  methods: {
    ...mapMutations({
      hideMessage: 'message/hide',
    }),
    ...mapActions({
    }),
  },
  mounted() {
  },
  render() {
    const listItems = _.map(this.items, item => (
      <v-list-item
        link
        key={item.text}
        to={item.to}
        >
        <v-list-item-action>
          <v-icon>{item.icon}</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>
            {item.text}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    ))
    const navigation = (
      <v-navigation-drawer
        app
        clipped
        expand-on-hover
        width='200px'
        vModel={this.showNav}
        mini-variant={this.miniNav}
        >
        <v-list dense>
          {listItems}
        </v-list>
      </v-navigation-drawer>
    )
    const appBar = (
      <v-app-bar
        app
        dark
        clipped-left={this.$vuetify.breakpoint.mdAndUp}
        color="blue darken-3"
        >
        <v-app-bar-nav-icon onclick={e => this.showNav = !this.showNav} />
        <v-toolbar-title class="ml-0 pl-4">
          <span class="display-1 font-italic font-weight-bold">FUND</span>
        </v-toolbar-title>
        <v-spacer />
        <v-toolbar-title class="ml-0 pl-4 d-flex justify-center align-center">
          <span class="hidden-sm-and-down">基金定投系统</span>
          <v-tooltip bottom scopedSlots={{
            activator: ({ on }) => (
              <v-btn icon link href='#intro' on={on}>
                <v-icon>mdi-help-circle-outline</v-icon>
              </v-btn>
            )}}
            >
            <span>查看说明</span>
          </v-tooltip>
        </v-toolbar-title>
        <v-spacer />
        <v-avatar item size="40px">
          <v-img
            src={this.avatarUrl}
            alt="Vuetify"
          />
        </v-avatar>
        <span class='pl-2'>{this.userName}</span>
      </v-app-bar>
    )
    const content = (
      <v-content>
        <router-view></router-view>
      </v-content>
    )
    const footer = (
      <v-footer>
        <v-col class='text-center font-weight-medium' cols='12'>
          coffee
        </v-col>
      </v-footer>
    )
    const snackBar = (
      <v-snackbar
        value={this.snackBarValue}
        bottom={this.snackBarBottom}
        color={this.snackBarColor}
        left={this.snackBarLeft}
        right={this.snackBarRight}
        timeout={this.snackBarTimeout}
        top={this.snackBarTop}
        vertical={this.snackBarVertical}
        multi-line={this.snackBarMulti}
        onInput={this.hideMessage}
        >
        {this.snackBarText}
      </v-snackbar>
    )
    return (
      <v-app id="inspire">
        {navigation}
        {appBar}
        {content}
        {footer}
        {snackBar}
      </v-app>
    )
  },
}
</script>
<style scoped>
</style>
