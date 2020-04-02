require('dotenv').config()

const { ALI_OSS_REGION, ALI_OSS_BUCKET, ALI_OSS_ASSETS_PREFIX } = process.env
let publicPath = `https://${ALI_OSS_BUCKET}.${ALI_OSS_REGION}.aliyuncs.com/${ALI_OSS_ASSETS_PREFIX || ''}`
if (!ALI_OSS_BUCKET || !ALI_OSS_REGION) publicPath = '/_nuxt/'
if (process.env.NODE_ENV !== 'production') publicPath = '/_nuxt/'

module.exports = {
  mode: 'universal',
  head: {
    titleTemplate: '%s | KEEER 账号',
    title: '',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'KEEER 账号服务' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ],
  },
  loading: { color: '#f5fafd' },
  build: {
    extractCSS: true,
    publicPath,
  },
  buildModules: [
    '@nuxtjs/eslint-module',
    '@nuxtjs/vuetify',
  ],
  modules: [
    '@nuxtjs/dotenv',
  ],
  vuetify: {
    theme: {
      themes: {
        light: {
          primary: '#002d4d',
          secondary: '#002d4d',
          accent: '#002d4d',
          error: '#f44336',
          warning: '#f57f17',
          info: '#2196f3',
          success: '#4caf50',
        },
      },
    },
    defaultAssets: {
      font: false,
      icons: 'mdi',
    },
  },
}
