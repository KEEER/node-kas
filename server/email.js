const { randomBytes: randomBytesCb } = require('crypto')
const { promisify } = require('util')
const { createTransport } = require('nodemailer')
const validator = require('email-validator')
const consola = require('consola')
const fetch = require('node-fetch')
const { query } = require('./db')
const randomBytes = promisify(randomBytesCb)

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_ADDRESS, EMAIL_INTERVAL, EMAIL_MAXAGE, MAILPROXY, MAILPROXY_AUTH } = process.env

const transport = {
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
}
const sendMail = MAILPROXY
  ? async mail => {
    const res = await fetch(MAILPROXY, {
      method: 'post',
      body: JSON.stringify({ transport, mail }),
      headers: { Authorization: MAILPROXY_AUTH },
    })
    if (res.status === 401) throw new Error('Mail proxy: Unauthorized')
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    if (!data) return
    return data.result
  }
  : mail => createTransport(transport).sendMail(mail)
const send = options => sendMail({ from: SMTP_FROM_ADDRESS, ...options })

const checkAddress = address => {
  if (!validator.validate(address)) {
    const err = new Error('Invalid email address.')
    err.code = 'EINVALID_EMAIL_ADDRESS'
    throw err
  }
}

const generateToken = exports.generateToken = async () => (await randomBytes(32)).toString('hex')
exports.types = {
  EMAIL_TYPE_UNKNOWN: 0,
  EMAIL_TYPE_SET_VERIFICATION: 1,
  EMAIL_TYPE_OTHERS: 127,
}
exports.sendEmailVerification = async (address, type, user, token) => {
  if (!token) token = await generateToken()
  checkAddress(address)
  const checkRes = await query(
    'SELECT id FROM PRE_email_tokens WHERE time > $1 AND address = $2;',
    [ new Date(Date.now() - EMAIL_INTERVAL), address ],
  )
  if (checkRes.rows.length > 0) {
    const err = new Error('In cooling period.')
    err.code = 'ECOOLING_PERIOD'
    throw err
  }
  const userId = user ? user.options.id : null
  const res = await query('INSERT INTO PRE_email_tokens (address, type, user_id, token) VALUES ($1, $2, $3, $4) RETURNING id;', [ address, type, userId, token ])
  try {
    consola.info(`About to send ${token.substring(0, 6)}... to ${address} as #${res.rows[0].id}.`)
    const url = new URL('/confirm-email', process.env.BASE_URL)
    url.search = new URLSearchParams({ address, token })
    await send({
      to: address,
      subject: '验证您的 KEEER 帐号邮箱',
      text: `您好！\n点击以下链接以将您的邮箱绑定到 KEEER 帐号（如非本人操作请忽略！）：\n${url}\nKEEER`,
      html: `您好！<br>点击以下链接以将您的邮箱绑定到 KEEER 帐号（如非本人操作请忽略！）：<br><a href="${url}">${url}</a><br>KEEER`,
    })
  } catch (e) {
    try {
      await query('DELETE FROM PRE_email_tokens WHERE id = $1;', [ res.rows[0].id ])
    } catch (e) { consola.warn(e) }
    consola.warn(e)
    const err = new Error(`Error sending email: ${e}`)
    err.code = 'EEMAIL_SEND_ERROR'
    throw err
  }
}

exports.checkEmailVerificationToken = async (address, token, type, user) => {
  checkAddress(address)
  consola.log(`delete:verification user #${(user && user.options.id) || 'unknown'} token ${token.substr(0, 10)}... type ${type}`)
  const res = await query(
    `DELETE FROM PRE_email_tokens WHERE address = $1 AND token = $2 AND type = $3 AND time > $4${user ? ' AND user_id = $5' : ''} RETURNING user_id;`,
    [ address, token, type, new Date(Date.now() - EMAIL_MAXAGE), ...(user ? [ user.options.id ] : []) ],
  )
  return res.rowCount > 0 && res.rows[0] ? res.rows[0].user_id : true
}

setInterval(async () => {
  try {
    await query('DELETE FROM PRE_email_tokens WHERE time < $1;', [ new Date(Date.now() - EMAIL_MAXAGE) ])
  } catch (e) { consola.error(e) }
}, parseInt(process.env.EMAIL_CLEAR_INTERVAL))
