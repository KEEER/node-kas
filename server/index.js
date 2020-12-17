require('dotenv').config()
const { randomBytes: randomBytesCb } = require('crypto')
const { promisify } = require('util')
const Koa = require('koa')
const Router = require('@koa/router')
const bodyparser = require('koa-body')
const OSS = require('ali-oss')
const consola = require('consola')
const winston = require('winston')
const koaWinston = require('koa2-winston')
const { Nuxt, Builder } = require('nuxt')
const { query } = require('./db')
const { User } = require('./user')
const { createCashierOrderUrl, createOrder, callback: payjsCallback, getOrderStatus } = require('./payjs')
const { types: SMS_TYPES, checkSmsVerificationCode, sendSmsVerificationCode, checkNumber } = require('./sms')
const { types: EMAIL_TYPES, sendEmailVerification, checkEmailVerificationToken } = require('./email')
const { applyGiteaRoutes } = require('./gitea')
const { showSession } = require('./session')
const { validateKeeerId, validateNickname } = require('./filter')
const randomBytes = promisify(randomBytesCb)

const app = new Koa()
const config = require('../nuxt.config.js') // eslint-disable-line import/order
config.dev = app.env !== 'production'

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'verbose.log', level: 'verbose' }),
  ],
})
consola._reporters.push(new consola.WinstonReporter(winstonLogger))

const rateLimit = (maxHits, maxAge, key = ctx => ctx.state.ip, store = {}, _intervalId = setInterval(() => {
  const now = Date.now()
  for (const key in store) if (store[key].expiry < now) delete store[key]
}, 10000)) => (ctx, next) => {
  const name = key(ctx)
  if (name === '__BYPASS__') return next()
  if (!store[name]) store[name] = { hits: 0, expiry: Date.now() + maxAge }
  const stats = store[name]
  if (++stats.hits < maxHits) return next()
  if (stats.hits === maxHits) consola.warn(`limit:exceed: ${name} is exceeding a rate limit!`)
  ctx.status = 429
  return ctx.body = { status: 429, code: 'EABUSE', message: '您的操作过于频繁，请稍候再试。' }
}
const rateLimitPhoneNumber = ctx => {
  if (!ctx.request.body || !ctx.request.body.number) return '__BYPASS__'
  try {
    const number = ctx.state.number = checkNumber(ctx.request.body.number)
    return number
  } catch (e) {
    if (e.code === 'EINVALID_PHONE_NUMBER') {
      ctx.body = { status: 4, message: '手机号不正确', code: e.code }
      return '__BYPASS__'
    }
  }
}

;(async () => {
  const nuxt = new Nuxt(config)
  const {
    host = process.env.HOST || '127.0.0.1',
    port = process.env.PORT || 3000,
  } = nuxt.options.server
  await nuxt.ready()
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  }
  const router = new Router()

  // misc
  const validateCsrf = (ctx, token) => token === ctx.cookies.get('_csrf')
  const NOT_LOGGED_IN = { status: -2, message: '您没有登录', code: 'EUNAUTHORIZED' }
  const requireLogin = (ctx, next) => {
    if (!ctx.state.user) return ctx.body = NOT_LOGGED_IN
    return next()
  }
  const requireService = async (ctx, next) => {
    if (ctx.state.serviceId === null) ctx.throw(401)
    await next()
  }
  const INVALID_REQUEST = { status: 1, message: '非法请求', code: 'EINVALID_REQUEST' }
  app.context.getServiceLoginConfig = async name => {
    const res = await query('SELECT login_prefs FROM PRE_services WHERE name = $1;', [ name ])
    if (res.rows.length < 1) return null
    return res.rows[0].login_prefs
  }
  app.context.getSessions = async function () { // not arrow function because the use of `this`
    const sessions = (await query('SELECT * FROM PRE_sessions WHERE user_id = $1 ORDER BY last_seen DESC LIMIT 100;', [ this.state.user.options.id ])).rows
    return await Promise.all(sessions.map(s => showSession(s, this)))
  }
  app.context.avatarFromName = name => {
    const { ALI_OSS_REGION, ALI_OSS_BUCKET, ALI_OSS_AVATAR_PREFIX } = process.env
    return `https://${ALI_OSS_BUCKET}.${ALI_OSS_REGION}.aliyuncs.com/${ALI_OSS_AVATAR_PREFIX || ''}${name || 'default.svg'}`
  }
  app.context.createOrder = async function () {
    try {
      const { qrcode, id } = await createOrder(this.state.user, Number(this.query.amount))
      return { status: 0, result: { qrcode, id } }
    } catch (e) {
      if (e && e.code === 'EINVALID_AMOUNT') return INVALID_REQUEST
      if (e && e.code === 'EPAYJS_FAILED') {
        consola.warn(e)
        return { status: 2, message: '无法发起支付', code: 'EPAYJS_FAILED' }
      }
      consola.warn(e)
      return { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
    }
  }
  app.context.createCashierOrder = async function () {
    try {
      const url = await createCashierOrderUrl(this.state.user, Number(this.query.amount))
      return { status: 0, result: url }
    } catch (e) {
      if (e && e.code === 'EINVALID_AMOUNT') return INVALID_REQUEST
      consola.warn(e)
      return { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
    }
  }
  app.context.isMobile = function () {
    const regexp = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i
    return regexp.test(this.get('User-Agent'))
  }
  router/* nodoc */.all('/api/*', async (ctx, next) => {
    try {
      await next()
    } catch (e) {
      console.warn(e)
      if (!ctx.body) ctx.body = { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
      throw e
    }
  })
  router/* nodoc */.get('/api/status', ctx => ctx.body = { status: 0 })

  // set props
  router.post('/api/avatar', requireLogin, async ctx => {
    if (!validateCsrf(ctx, ctx.request.body._csrf)) return ctx.body = 'Invalid CSRF'
    const user = ctx.state.user
    const frontend = ctx.request.body.frontend
    const { size, path, type, name: filename } = ctx.request.files.avatar
    if (!type.startsWith('image/')) return ctx.body = frontend ? 'Not an image' : { status: 2, message: 'Not an image', code: 'ENOT_IMAGE' }
    if (size > 5 * 1024 * 1024) return ctx.body = frontend ? 'Image too large' : { status: 3, message: 'Image too large', code: 'ETOO_LARGE' }
    const uid = user.options.id
    const ext = filename.split('.').pop()
    const name = `${uid}-${(await randomBytes(16)).toString('hex')}.${ext}`
    consola.log(`post:avatar user#${user.options.id} size ${size} to ${name}`)
    // `https://${bucket}.${region}.aliyuncs.com/${name}`
    const cfg = {
      accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
      region: process.env.ALI_OSS_REGION, // 'oss-cn-beijing'
      bucket: process.env.ALI_OSS_BUCKET,
    }
    const { ALI_OSS_AVATAR_PREFIX } = process.env
    const store = new OSS(cfg)
    await store.put(`${ALI_OSS_AVATAR_PREFIX || ''}${name}`, path, {
      headers: { 'Cache-Control': 'public, max-age=31536000' },
    })
    if (user.options.avatarName) { // delete previous avatar
      consola.log(`delete:avatar user#${user.options.id} of ${user.options.avatarName}`)
      try {
        await store.delete(`${ALI_OSS_AVATAR_PREFIX || ''}${user.options.avatarName}`)
      } catch (e) {
        consola.warn(e)
      }
    }
    user.options.avatarName = name
    await user.update()
    if (frontend) return ctx.redirect('/')
    else return ctx.body = { status: 0 }
  })
  router.put('/api/email', rateLimit(Number(process.env.EMAIL_LIMIT_HITS), Number(process.env.EMAIL_LIMIT_AGE)), requireLogin, async ctx => {
    const params = ctx.request.body
    if (typeof params !== 'object' || !params) return ctx.body = INVALID_REQUEST
    const { email } = params
    if (!email) return ctx.body = INVALID_REQUEST
    try {
      const user = await User.fromEmail(email)
      if (user) return ctx.body = { status: 2, message: '这个地址已经被其他帐号绑定。', code: 'ETAKEN' }
      await sendEmailVerification(email, EMAIL_TYPES.EMAIL_TYPE_SET_VERIFICATION, ctx.state.user)
      return ctx.body = { status: 0, message: '验证码已发送，请查收。' }
    } catch (e) {
      if (e.code === 'ECOOLING_PERIOD') return ctx.body = { status: 3, message: '操作过于频繁，请过一分钟后再试', code: 'EABUSE' }
      if (e.code === 'EINVALID_EMAIL_ADDRESS') return ctx.body = { status: 4, message: '邮件地址不正确', code: 'EINVALID_ADDRESS' }
      if (e.code === 'EEMAIL_SEND_ERROR') {
        consola.warn(e)
        return ctx.body = { status: 5, message: '暂时无法发送邮件', code: 'ESEND' }
      }
      consola.error(e)
      return ctx.body = { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
    }
  })
  router.get('/confirm-email', async ctx => {
    const { address, token } = ctx.query
    try {
      const uid = await checkEmailVerificationToken(address, token, EMAIL_TYPES.EMAIL_TYPE_SET_VERIFICATION)
      const user = uid && await User.fromId(uid)
      if (!address || !token || !uid || !user) return ctx.body = '无效的验证地址'
      const dupUser = await User.fromEmail(address)
      if (dupUser) return ctx.body = '这个地址已经被其他帐号绑定。'
      consola.log(`put:email user #${uid} token ${token.substr(0, 10)}... address ${address[0]}**@**.**${address.substr(-1)}`)
      user.options.email = address
      await user.update()
      return ctx.body = '您已经成功绑定电子邮箱！'
    } catch (e) {
      if (e.code === 'EINVALID_EMAIL_ADDRESS') return ctx.body = '邮箱地址不正确'
      consola.error(e)
      return ctx.body = String(e)
    }
  })
  router.put('/api/keeer-id', requireLogin, async ctx => {
    if (ctx.state.user.options.keeerId) return ctx.body = {
      status: 2,
      message: `您已经设置您的 KEEER ID 为 ${ctx.state.user.options.keeerId}，无法修改`,
      code: 'EID_ALREADY_SET',
      keeerId: ctx.state.user.options.keeerId,
    }
    const id = ctx.request.body.keeerId
    if (typeof id !== 'string') return ctx.body = INVALID_REQUEST
    if (!/^[a-zA-Z][0-9a-zA-Z_-]{1,31}$/.test(id)) return ctx.body = { status: 3, message: 'KEEER ID 包含非法字符', code: 'EINVALID_ID' }
    if (!validateKeeerId(id)) return ctx.body = { status: 3, message: '您不能使用这个 KEEER ID，确需使用请联系 KEEER', code: 'EINVALID_ID' }
    const res = await query('SELECT keeer_id FROM PRE_users WHERE lower_keeer_id = LOWER($1);', [ id ])
    if (res.rows.length > 0) return ctx.body = { status: 4, message: '这个 KEEER ID 已被占用', code: 'EDUPLICATE' }
    consola.log(`put:keeer-id user #${ctx.state.user.options.id} as ${id}`)
    ctx.state.user.options.keeerId = id
    await ctx.state.user.update()
    return ctx.body = { status: 0, message: '成功设置 KEEER ID' }
  })
  router.put('/api/nickname', requireLogin, async ctx => {
    const nickname = ctx.request.body.nickname
    if (typeof nickname !== 'string') return ctx.body = INVALID_REQUEST
    if (nickname.length > 64) return ctx.body = { status: 2, message: '昵称过长', code: 'ETOO_LONG' }
    if (!validateNickname(nickname)) return ctx.body = { status: 3, message: '您不能使用这个昵称，确需使用请联系 KEEER', code: 'EINVALID_NICKNAME' }
    consola.log(`put:nickname user #${ctx.state.user.options.id} as ${nickname}`)
    ctx.state.user.options.nickname = nickname
    await ctx.state.user.update()
    return ctx.body = { status: 0, message: '成功修改昵称' }
  })
  router.put('/api/password', async ctx => { // set or find back
    const params = ctx.request.body
    if (typeof params !== 'object' || !params) return ctx.body = INVALID_REQUEST
    const { current, code, number, password } = params
    if (((!code || !number) && !current) || (code && current) || !password) return ctx.body = INVALID_REQUEST
    if (!/^[\x21-\x7E]{6,32}$/.test(password)) return ctx.body = { status: 2, message: '密码不符合要求', code: 'EINVALID_PASSWORD' }
    if (code) { // find back
      const user = await User.fromPhoneNumber(number)
      try {
        if (await checkSmsVerificationCode(number, code, SMS_TYPES.SMS_TYPE_FIND_BACK_PASSWORD, user)) {
          consola.log(`put:password user #${user.options.id}`)
          await user.setPassword(password)
          return ctx.body = { status: 0, message: '成功重置密码' }
        } else return ctx.body = { status: 3, message: '验证码错误', code: 'EBAD_TOKEN' }
      } catch (e) {
        if (e.code === 'EINVALID_PHONE_NUMBER') return ctx.body = { status: 4, message: '手机号不正确', code: e.code }
        consola.error(e)
        return ctx.body = { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
      }
    } else if (ctx.state.user.passwordMatches(current)) { // set
      await ctx.state.user.setPassword(password)
      return ctx.body = { status: 0, message: '成功修改密码' }
    } else {
      return ctx.body = { status: 5, message: '密码错误', code: 'EBAD_PASSWORD' }
    }
  })
  router.put('/api/phone-number', requireLogin, async ctx => {
    const params = ctx.request.body
    const user = ctx.state.user
    if (typeof params !== 'object' || !params) return ctx.body = INVALID_REQUEST
    const { number: numberIn, code, password } = params
    if (!user.passwordMatches(password)) return ctx.body = { status: 2, message: '密码错误', code: 'EBAD_PASSWORD' }
    try {
      const number = checkNumber(numberIn)
      if (await checkSmsVerificationCode(number, code, SMS_TYPES.SMS_TYPE_SET_PHONE_NUMBER, user)) {
        user.options.phoneNumber = number
        await user.update()
        return ctx.body = { status: 0, message: '成功设置手机号' }
      } else return ctx.body = { status: 3, message: '验证码不正确', code: 'EBAD_TOKEN' }
    } catch (e) {
      if (e.code === 'EINVALID_PHONE_NUMBER') return ctx.body = { status: 4, message: '手机号不正确', code: e.code }
      consola.error(e)
      return ctx.body = { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
    }
  })

  // sms
  router.put('/api/sms-code', rateLimit(Number(process.env.SMS_LIMIT_HITS), Number(process.env.SMS_LIMIT_AGE)), async ctx => {
    const params = ctx.request.body
    if (typeof params !== 'object' || !params) return ctx.body = INVALID_REQUEST
    const { number, type: typeKey } = params
    const type = SMS_TYPES[typeKey]
    // eslint-disable-next-line no-prototype-builtins
    if (!SMS_TYPES.hasOwnProperty(typeKey) || type === SMS_TYPES.SMS_TYPE_UNKNOWN || type === SMS_TYPES.SMS_TYPE_OTHER) {
      return ctx.body = INVALID_REQUEST
    }
    try {
      const user = await User.fromPhoneNumber(number)
      if (
        (type === SMS_TYPES.SMS_TYPE_REGISTER && user) ||
        (type === SMS_TYPES.SMS_TYPE_FIND_BACK_PASSWORD && !user)
      ) return ctx.body = { status: 2, message: `您${user ? '已经' : '尚未'}注册。`, code: user ? 'EDUPLICATE' : 'ENOTFOUND' }
      await sendSmsVerificationCode(number, type, user)
      return ctx.body = { status: 0, message: '验证码已发送，请查收。' }
    } catch (e) {
      if (e.code === 'ECOOLING_PERIOD') return ctx.body = { status: 3, message: '操作过于频繁，请过一分钟后再试', code: 'EABUSE' }
      if (e.code === 'EINVALID_PHONE_NUMBER') return ctx.body = { status: 4, message: '手机号不正确', code: e.code }
      if (e.code === 'ESMS_SEND_ERROR') {
        consola.warn(e)
        return ctx.body = { status: 5, message: '暂时无法发送短信', code: 'ESEND' }
      }
      consola.error(e)
      return ctx.body = { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
    }
  })

  // queries
  router.get('/api/user-information', requireLogin, ctx => {
    if (/^https?:\/\/(?:[^.]+\.)?keeer.net$/.test(ctx.get('origin'))) {
      ctx.set('Access-Control-Allow-Origin', ctx.get('origin'))
      ctx.set('Vary', 'Origin')
      ctx.set('Access-Control-Allow-Credentials', 'true')
    }
    const { avatarName, nickname, keeerId, kredit } = ctx.state.user.options
    const avatar = ctx.avatarFromName(avatarName)
    return ctx.body = { status: 0, result: { avatar, nickname, keeerId, kredit } }
  })
  router.get('/api/sessions', requireLogin, async ctx => ctx.body = { status: 0, result: await ctx.getSessions() })
  router.get('/api/login-config', async ctx => {
    if (!ctx.query.service) return ctx.body = INVALID_REQUEST
    const cfg = await ctx.getServiceLoginConfig(ctx.query.service)
    // cfg: { title, logoSrc, backgroundUrl, themeColor, redirectUrl, backgroundCopyright, backgroundCopyrightUrl }
    if (cfg) return ctx.body = { status: 0, result: cfg }
    return ctx.body = { status: 0, result: false }
  })
  router.get('/api/:token/kiuid', requireService, async ctx => {
    consola.log(`get:kiuid Processing kiuid query from service ${ctx.state.serviceId}`)
    const { token } = ctx.params
    const user = await User.fromToken(token)
    if (!user) return ctx.body = { status: 2, message: '这个帐号不存在。', code: 'ENOTFOUND' }
    return ctx.body = { status: 0, result: user.options.kiuid }
  })

  // kredit
  const polls = new Map()
  const createLongPoll = id => new Promise((resolve, reject) => {
    let set = polls.get(id)
    if (!set) {
      set = new Set()
      polls.set(id, set)
    }
    const cb = () => {
      clearTimeout(rejectionTimeoutId)
      resolve(true)
    }
    set.add(cb)
    const rejectionTimeoutId = setTimeout(() => {
      const err = new Error('Timeout.')
      err.code = 'ETIMEOUT'
      reject(err)
      set.delete(cb)
    }, 30000)
  })
  router.get('/api/recharge-order', requireLogin, async ctx => {
    const isLongPoll = !!ctx.query.watch
    const id = Number(ctx.query.id)
    if (!Number.isSafeInteger(id)) return ctx.body = INVALID_REQUEST
    try {
      const state = await getOrderStatus(id)
      if (!isLongPoll || state) return ctx.body = { status: 0, result: state }
      else return ctx.body = { status: 0, result: await createLongPoll(id) }
    } catch (e) {
      if (e.code === 'ENOTFOUND') return ctx.body = { status: 2, message: '订单不存在', code: 'ENOTFOUND' }
      if (e.code === 'ETIMEOUT') return ctx.body = { status: 127, message: '超时', code: 'ETIMEOUT' }
      consola.warn(e)
      ctx.body = { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
    }
  })
  router.put('/api/recharge-order', rateLimit(30, 60000), requireLogin, async ctx => {
    if (ctx.isMobile()) return ctx.body = await ctx.createCashierOrder()
    else {
      const order = await ctx.createOrder()
      if (order.status !== 0) return ctx.body = order
      const search = String(new URLSearchParams({ amount: ctx.query.amount, ...order.result }))
      return ctx.body = { status: 0, result: '/recharge-cashier?' + search }
    }
  })
  router.post('/api/payjs-callback', async ctx => {
    const params = ctx.request.body
    if (!params || typeof params !== 'object') return ctx.status = 400
    const id = await payjsCallback(params)
    consola.info(`received payjs callback for #${id}`)
    if (!id) {
      consola.warn('Payjs callback Failed!')
      return ctx.body = { status: -1, code: 'EINTERNAL' }
    }
    const set = polls.get(id)
    if (set) {
      for (const cb of set) try { cb() } catch (_e) {}
      set.clear()
      polls.delete(id)
    }
    return ctx.body = { status: 0 }
  })
  router.post('/api/pay', requireService, async ctx => {
    const params = ctx.request.body
    if (!params || typeof params !== 'object') return
    const { identity, type, amount } = params
    if (!identity || !type || !amount) return ctx.body = INVALID_REQUEST
    let user
    if (type === 'phone-number' || type === 'phoneNumber') user = await User.fromPhoneNumber(identity)
    if (type === 'email') user = await User.fromEmail(identity)
    if (type === 'keeer-id' || type === 'keeerId') user = await User.fromKeeerId(identity)
    if (type === 'kiuid') user = await User.fromKiuid(identity)
    if (!user) return ctx.body = { status: 2, message: '找不到帐号', code: 'ENOTFOUND' }
    try {
      await user.pay(Number(amount), ctx.state.serviceId)
      consola.info(`Creating payment for service ${ctx.state.serviceId} and ${amount} centi-kredit`)
      return ctx.body = { status: 0 }
    } catch (e) {
      if (e.code === 'EINVALID_AMOUNT') return ctx.body = { status: 3, message: String(e), code: e.code }
      if (e.code === 'EINSUFFICIENT_KREDIT') return ctx.body = { status: 4, message: '余额不足', code: e.code }
      consola.warn(e)
      return ctx.body = { status: -1, message: String(e) }
    }
  })

  // authorization
  const setTokenCookie = (ctx, token, maxAge) => {
    const { TOKEN_COOKIE_NAME, TOKEN_COOKIE_DOMAIN, TOKEN_MAXAGE } = process.env
    if (!maxAge) maxAge = parseInt(TOKEN_MAXAGE)
    ctx.cookies.set(TOKEN_COOKIE_NAME, token, { domain: TOKEN_COOKIE_DOMAIN, maxAge, httpOnly: false, signed: false })
  }
  router.put('/api/token', rateLimit(10, 60000), async ctx => { // log in
    const auth = ctx.get('Authorization')
    if (!auth) return ctx.body = INVALID_REQUEST
    const match = auth.match(/^basic ([A-Za-z0-9+=]+)$/i)
    if (!match || !match[1]) return ctx.body = INVALID_REQUEST
    const credMatch = Buffer.from(match[1], 'base64').toString().match(/^([^:]*):(.*)$/)
    if (!credMatch || !credMatch[1] || !credMatch[2]) return ctx.body = INVALID_REQUEST
    const [ , identity, password ] = credMatch
    const user = await User.login(identity, password)
    if (!user) return ctx.body = { status: 2, message: '用户名或密码错误', code: 'EBAD_CREDENTIALS' }
    const token = await user.createToken(ctx)
    if (ctx.query['set-cookie']) setTokenCookie(ctx, token)
    return ctx.body = { status: 0, message: '登录成功', result: token }
  })
  router.delete('/api/token/:token?', async ctx => { // log out
    const token = ctx.params.token || ctx.cookies.get(process.env.TOKEN_COOKIE_NAME)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token)) {
      const res = await query('DELETE FROM PRE_sessions WHERE token = $1;', [ token ])
      if (res.rowCount < 1) return ctx.body = { status: 2, message: '已失效的登录', code: 'ENOTFOUND' }
      if (ctx.query['set-cookie']) setTokenCookie(ctx, '', 0)
      return ctx.body = { status: 0, message: '退出登录成功' }
    } else if (isFinite(token)) { // token ID
      if (!ctx.state.user) return ctx.body = NOT_LOGGED_IN
      const res = await query('DELETE FROM PRE_sessions WHERE user_id = $1 and id = $2;', [ ctx.state.user.options.id, Number(token) ])
      if (res.rowCount > 0) return ctx.body = { status: 0, message: '移除设备成功' }
      return ctx.body = { status: 3, message: '不存在这个设备', code: 'ENOTFOUND' }
    }
    return ctx.body = INVALID_REQUEST
  })
  router.put('/api/user', rateLimit(10, 60000), rateLimit(10, 60000, rateLimitPhoneNumber), async ctx => { // sign up
    const params = ctx.request.body
    if (typeof params !== 'object' || !params) return ctx.body = INVALID_REQUEST
    const { number: numberIn, code, password } = params
    if (!numberIn || !code || !password) return ctx.body = INVALID_REQUEST
    if (!/^[\x21-\x7E]{6,32}$/.test(password)) return ctx.body = { status: 2, message: '密码不符合要求', code: 'EINVALID_PASSWORD' }
    try {
      const number = ctx.state.number
      const dupRes = await query('SELECT phone_number FROM PRE_users WHERE phone_number = $1;', [ number ])
      if (dupRes.rows.length > 0) return ctx.body = { status: 5, message: '您已经注册，请直接登录或找回密码', code: 'EDUPLICATE' }
      if (await checkSmsVerificationCode(number, code, SMS_TYPES.SMS_TYPE_REGISTER)) {
        const user = await User.create(number, password)
        const token = await user.createToken(ctx)
        if (ctx.query['set-cookie']) setTokenCookie(ctx, token)
        return ctx.body = { status: 0, message: '您已经成功注册！', result: token }
      } else return ctx.body = { status: 3, message: '验证码错误', code: 'EBAD_TOKEN' }
    } catch (e) {
      consola.error(e)
      return ctx.body = { status: -1, message: String(e), code: (e && e.code) || 'EUNKNOWN' }
    }
  })
  router.post('/csp-vio', rateLimit(60, 60000), ctx => {
    consola.info('sec:csp caught a violation!')
    winstonLogger.warn(ctx.request.body)
    return ctx.body = 'Thank you for reporting a CSP violation!'
  })

  applyGiteaRoutes(router)

  const { GLOBAL_LIMIT_HITS, GLOBAL_LIMIT_AGE } = process.env
  if (GLOBAL_LIMIT_HITS && GLOBAL_LIMIT_AGE) app.use(rateLimit(Number(GLOBAL_LIMIT_HITS), Number(GLOBAL_LIMIT_AGE)))
  app.use(koaWinston.logger({
    transports: new winston.transports.File({ filename: 'access.log' }),
    reqUnselect: [ 'header.cookie', 'header.authorization' ],
  }))
  app.use(bodyparser({ multipart: true }))
  app.use(async (ctx, next) => { // get service ID
    ctx.state.serviceId = null
    const auth = ctx.get('Authorization')
    if (!auth) return await next()
    const match = auth.toLowerCase().match(/^bearer ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
    if (!match || !match[1]) return await next()
    const token = match[1]
    const res = await query('SELECT id FROM PRE_services WHERE token = $1;', [ token ])
    if (res.rows.length === 0) return await next()
    ctx.state.serviceId = res.rows[0].id
    return await next()
  })
  app.use(async (ctx, next) => { // common headers
    ctx.set('X-Frame-Options', 'SAMEORIGIN')
    ctx.set('X-Powered-By', 'KEEER Account System v4/1.0.1')
    ctx.state.ip = ctx.get(process.env.REAL_IP_HEADER || 'X-Forwarded-For') || ctx.request.ip
    return await next()
  })
  app.use(async (ctx, next) => {
    ctx.state.user = await User.fromContext(ctx)
    if (ctx.cookies.get(process.env.TOKEN_COOKIE_NAME) && !ctx.state.user) setTokenCookie(ctx, '', 0)
    await next()
  })
  app.use(router.routes()).use(router.allowedMethods())
  app.use(ctx => {
    ctx.status = 200
    ctx.respond = false
    ctx.req.ctx = ctx
    if (ctx.state.user) {
      ctx.state.user.updateLastSeen(ctx.state.ip).catch(e => consola.warn(e))
    }
    nuxt.render(ctx.req, ctx.res)
  })
  app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true,
  })
})()
