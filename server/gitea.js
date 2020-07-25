// in-memory code storage
const codes = {}
const { randomBytes: randomBytesCb } = require('crypto')
const { promisify } = require('util')
const randomBytes = promisify(randomBytesCb)

exports.applyGiteaRoutes = router => {
  router.get('/git/authorize', async ctx => {
    const { redirect_uri: redir, state } = ctx.query
    if (!redir) return ctx.status = 400
    if (ctx.state.user) {
      const code = (await randomBytes(16)).toString('hex')
      codes[code] = { user: ctx.state.user, time: Date.now() }
      try {
        const url = new URL(redir)
        url.search = new URLSearchParams({ code, state })
        return ctx.redirect(url)
      } catch (e) {
        return ctx.statue = 400
      }
    }
    return ctx.redirect('/login?' + new URLSearchParams({ redirect_uri: redir, state, git: 1 }))
  })

  router.post('/git/token', ctx => {
    if (!ctx.request.body) return ctx.status = 400
    const { code, client_secret: secret } = ctx.request.body
    if (secret !== process.env.GITEA_API_SECRET) return ctx.status = 403
    if (!(code in codes)) return ctx.status = 403
    return ctx.body = {
      access_token: secret + code,
      token_type: 'bearer',
      expires_in: 3600,
    }
  })

  router.get('/git/profile', ctx => {
    const { access_token: token } = ctx.query
    if (!token.startsWith(process.env.GITEA_API_SECRET)) return ctx.statue = 401
    const code = token.replace(process.env.GITEA_API_SECRET, '')
    if (!(code in codes)) return ctx.status = 403
    const { user } = codes[code]
    delete codes[code]
    return ctx.body = {
      full_name: '',
      email: '',
      login: '',
      id: Number(user.options.id),
      avatar_url: '',
    }
  })
}

// clear cache
setInterval(() => {
  const minTime = Date.now() - 120000
  for (const code in codes) {
    if (codes[code].time < minTime) delete codes[code]
  }
}, 60000)
