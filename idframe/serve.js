const { readFileSync } = require('fs')
const path = require('path')
const script = readFileSync(path.resolve(__dirname, 'appbar.dist.js')).toString()
const base = new URL(process.env.BASE_URL).origin

exports.applyIdframeRoutes = router => router.get('/api/idframe', ctx => {
  if (!/^https?:\/\/(?:[^.]+\.)?keeer.(net|local)(:\d+)?\//.test(ctx.get('referer'))) ctx.status = 403
  const info = ctx.getUserInformation()
  const data = info ? { ...info, base, loggedIn: true } : { base, loggedIn: false }
  const str = JSON.stringify(data).replace(/\//g, '\\u002F')
  ctx.set('Content-Type', 'application/javascript; charset=utf-8')
  ctx.set('Cache-Control', 'max-age=0')
  ctx.body = script.replace('__data__', str)
})
