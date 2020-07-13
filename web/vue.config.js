const path = require('path')
const util = require('util')
const fs = require('fs-extra')

const devServer = {
  watchOptions: {
    // poll: true,
  },
  disableHostCheck: true,
}
if (process.env.DEV_MODE === 'disk') {
  devServer.writeToDisk = true
}

const chainWebpack = config => {
  config.resolve.alias
    .set('src', path.resolve(__dirname, 'src'))
    .set('plugins', path.resolve(__dirname, 'src/plugins'))
    .set('components', path.resolve(__dirname, 'src/components'))
    .set('router', path.resolve(__dirname, 'src/router'))
    .set('store', path.resolve(__dirname, 'src/store'))
    .set('services', path.resolve(__dirname, 'src/services'))
    .set('network', path.resolve(__dirname, 'src/network'))
    .set('utils', path.resolve(__dirname, 'src/utils'))
    .set('views', path.resolve(__dirname, 'src/views'))

  config.plugin('html').tap(args => {
    args[0].title = '基金定投'
    return args
  })

  config.when(process.env.NODE_ENV === 'development', config => {
    config.devtool(false)
    if (process.env.DEV_MODE === 'disk') {
      fs.emptyDirSync(config.output.get('path'))
    }
  })
}

module.exports = {
  chainWebpack,
  devServer,
  lintOnSave: false,
  transpileDependencies: [
    "vuetify"
  ],
}
