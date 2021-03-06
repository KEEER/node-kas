require('dotenv').config()

const { ALI_OSS_REGION, ALI_OSS_BUCKET, ALI_OSS_ASSETS_PREFIX } = process.env
let publicPath = `https://${ALI_OSS_BUCKET}.${ALI_OSS_REGION}.aliyuncs.com/${ALI_OSS_ASSETS_PREFIX || ''}`
const cdnOrigin = `https://${ALI_OSS_BUCKET}.${ALI_OSS_REGION}.aliyuncs.com`
const jsdelivr = 'https://cdn.jsdelivr.net'
if (!ALI_OSS_BUCKET || !ALI_OSS_REGION) publicPath = '/_nuxt/'
if (process.env.NODE_ENV !== 'production') publicPath = '/_nuxt/'

module.exports = {
  telemetry: false,
  components: true,
  head: {
    titleTemplate: '%s | KEEER 帐号',
    title: '',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'KEEER 帐号服务' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      {
        rel: 'stylesheet',
        type: 'text/css',
        href: 'https://cdn.jsdelivr.net/npm/@mdi/font@5.8.55/css/materialdesignicons.min.css',
        integrity: 'sha256-EZPoNbrxZm1uWJ3Dv+6E50gsinU2w1iD0QzBGr0TRgQ=',
        crossorigin: 'anonymous',
      },
    ],
    htmlAttrs: { lang: 'zh-CN' },
  },
  render: {
    csp: process.env.NODE_ENV === 'development' && !process.env.DEBUG_CSP
      ? false
      : {
        reportOnly: false,
        hashAlgorithm: 'sha256',
        policies: {
          'default-src': [ '\'self\'', cdnOrigin, '\'report-sample\'' ],
          'img-src': [ '\'self\'', 'data:', jsdelivr, `https://*.${ALI_OSS_REGION}.aliyuncs.com`, 'https://keeer.net', 'https://*.keeer.net', 'https://www.google-analytics.com', 'https://payjs.cn' ],
          'script-src': [
            '\'self\'', cdnOrigin, jsdelivr, 'https://www.google-analytics.com', 'https://ssl.google-analytics.com', '\'report-sample\'',
            ...(process.env.NODE_ENV === 'development' ? [ '\'unsafe-eval\'' ] : []),
          ],
          'style-src': [ '\'self\'', jsdelivr, cdnOrigin, '\'unsafe-inline\'', '\'report-sample\'' ],
          'font-src': [ '\'self\'', jsdelivr, cdnOrigin, '\'report-sample\'' ],
          'object-src': [ '\'none\'' ],
          'form-action': [ '\'self\'', '\'report-sample\'' ],
          'frame-ancestors': [ '\'self\'' ],
          'connect-src': [ '\'self\'', 'https://www.google-analytics.com' ],
          'report-uri': [ '/csp-vio' ],
        },
      },
  },
  loading: { color: '#f5fafd' },
  build: {
    extractCSS: true,
    optimization: {
      splitChunks: {
        cacheGroups: {
          pages: {
            name: 'pages',
            test: /pages/,
          },
          login: {
            name: 'login',
            test: /login/,
            priority: 5,
          },
        },
      },
    },
    publicPath,
    filenames: {
      app: ({ isDev }) => isDev ? '[name].js' : 'main.[contenthash].js',
      chunk: ({ isDev }) => isDev ? '[name].js' : '[name].[contenthash].js',
      css: ({ isDev }) => isDev ? '[name].css' : '[name].[contenthash].css',
    },
    extend (config, { isClient }) {
      if (isClient) {
        config.optimization.splitChunks.cacheGroups.commons.automaticNameDelimiter = '-'
      }
    },
  },
  buildModules: [
    '@nuxtjs/eslint-module',
    '@nuxtjs/vuetify',
    '@nuxtjs/google-analytics',
  ],
  googleAnalytics: { id: process.env.GA_ID },
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
      icons: false,
    },
  },
}
