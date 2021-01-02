const { readFileSync } = require('fs')
const path = require('path')
const script = readFileSync(path.resolve(__dirname, 'appbar.dist.js')).toString()

exports.applyIdframeRoutes = router => router.get('/api/idframe', ctx => {
  const info = ctx.getUserInformation()
  const data = info ? { ...info, loggedIn: true } : { loggedIn: false }
  const str = JSON.stringify(data).replace(/\//g, '\\u002F')
  ctx.set('Content-Type', 'application/javascript')
  ctx.set('Cache-Control', 'no-cache')
  ctx.body = script.replace('__data__', str)
})
