const { createHash } = require('crypto')
const fetch = require('node-fetch')
const consola = require('consola')
const { query, useClient } = require('./db')

const PAYJS_BASE = new URL('https://payjs.cn/')
const { PAYJS_MCHID, PAYJS_KEY, PAYJS_LOGO_URL, PAYJS_ORDER_PREFIX } = process.env

const sign = params => {
  const stringToSign = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k] || ''}`)
    .join('&') +
    `&key=${PAYJS_KEY}`
  return createHash('md5').update(stringToSign).digest('hex').toUpperCase()
}

const getMessage = (user, amount) => {
  const name = user.options.nickname || '新用户'
  return `为 ${name.length > 10 ? name.substr(0, 10) + '…' : name} 充值 ${amount / 100} Kredit`
}

const checkAmount = amount => {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0 || amount > 100000) {
    const err = new Error('Invalid amount.')
    err.code = 'EINVALID_AMOUNT'
    throw err
  }
}

const createId = async (user, amount) => {
  const insertIdRes = await query('INSERT INTO PRE_payjs_orders (user_id, amount) VALUES ($1, $2) RETURNING id;', [ user.options.id, amount ])
  const id = Number(insertIdRes.rows[0].id)
  const idToPayjs = PAYJS_ORDER_PREFIX + id.toString(16) // hexadecimal
  return { id, idToPayjs }
}

const types = exports.types = {
  TRADE_TYPE_UNKNOWN: 0,
  TRADE_TYPE_RECHARGE: 1,
  TRADE_TYPE_PAYMENT: 2,
  TRADE_TYPE_OTHER: 127,
}

exports.createOrder = async (user, amount, message = getMessage(user, amount)) => {
  checkAmount(amount)
  const { id, idToPayjs } = await createId(user, amount)
  consola.info(`Creating order #${id} as ${idToPayjs} for amount ${amount}`)
  const body = {
    mchid: PAYJS_MCHID,
    out_trade_no: idToPayjs,
    total_fee: amount,
    body: message,
    notify_url: String(new URL('/api/payjs-callback', process.env.BASE_URL)),
  }
  body.sign = sign(body)
  const res = await fetch(new URL('/api/native', PAYJS_BASE), {
    method: 'post',
    body: new URLSearchParams(body),
  }).then(res => res.json())
  if (res.return_code !== 1) { // failed
    const err = new Error(`Payjs Failed: ${res.return_msg}`)
    err.code = 'EPAYJS_FAILED'
    throw err
  }
  await query('UPDATE PRE_payjs_orders SET payjs_order_id = $2 WHERE id = $1;', [ id, res.payjs_order_id ])
  return { qrcode: res.qrcode, id, codeUrl: res.code_url }
}

exports.createCashierOrderUrl = async (user, amount, callbackUrl = process.env.BASE_URL, message = getMessage(user, amount)) => {
  checkAmount(amount)
  const { idToPayjs } = await createId(user, amount)
  consola.info(`Creating cashier ${idToPayjs} for amount ${amount}`)
  const body = {
    mchid: PAYJS_MCHID,
    out_trade_no: idToPayjs,
    total_fee: amount,
    body: message,
    notify_url: String(new URL('/api/payjs-callback', process.env.BASE_URL)),
    callback_url: callbackUrl,
    logo: PAYJS_LOGO_URL,
  }
  body.sign = sign(body)
  const url = new URL('/api/cashier', PAYJS_BASE)
  url.search = new URLSearchParams(body)
  return String(url)
}

exports.callback = async data => {
  if (!data || Number(data.return_code) !== 1) return false
  const { sign: dataSign, out_trade_no: idToPayjs } = data
  delete data.sign
  const expectedSign = sign(data)
  if (dataSign !== expectedSign) { // don't need timingSafeEqual()
    consola.warn(`invalid signature, expect ${expectedSign}, actual ${dataSign}`)
    return false
  }
  data.sign = dataSign
  const id = parseInt(idToPayjs.replace(PAYJS_ORDER_PREFIX, ''), 16)
  const amount = Number(data.total_fee)
  return await useClient(async client => {
    await client.query('BEGIN;')
    const done = await client.query('SELECT payjs_callback FROM PRE_payjs_orders WHERE id = $1;', [ id ])
    if (done.rows.length < 1 || done.rows[0].payjs_callback) return false
    const userAffected = await client.query('SELECT user_id FROM PRE_payjs_orders WHERE id = $1;', [ id ])
    if (userAffected.rows.length !== 1) {
      const err = new Error(`Users affected in order #${id} is not 1 but ${userAffected}!`)
      err.code = 'EDUPLICATE_ID'
      throw err
    }
    const uid = userAffected.rows[0].user_id
    consola.log(`put:payjs-callback #${id} for ${amount} user #${uid}`)
    await client.query('UPDATE PRE_users SET kredit = kredit + $1 WHERE id = $2;', [ amount, uid ])
    await client.query('INSERT INTO PRE_trade_records (amount, type, order_id, user_id) VALUES ($1, $2, $3, $4);', [ amount, types.TRADE_TYPE_RECHARGE, id, uid ])
    await client.query('UPDATE PRE_payjs_orders SET payjs_callback = $2, payjs_order_id = $3 WHERE id = $1;', [ id, data, data.payjs_order_id ])
    await client.query('COMMIT;')
    return id
  })
}

exports.getOrderStatus = async id => {
  const res = await query('SELECT payjs_callback FROM PRE_payjs_orders WHERE id = $1;', [ id ])
  if (res.rows.length < 1) {
    const err = new Error('Order does not exist')
    err.code = 'ENOTFOUND'
    throw err
  }
  return !!res.rows[0].payjs_callback
}
