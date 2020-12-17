require('dotenv').config()
const { readFileSync } = require('fs')
const path = require('path')
const consola = require('consola')
const { useClient } = require('../server/db')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

useClient(async client => {
  consola.warn('PLEASE BACK UP BEFORE MIGRATION, press Ctrl+C in 15 seconds to abort')
  consola.warn('ALL VERIFICATION CODES ARE DROPPED!')
  await delay(15000)
  consola.info('Migration started.')
  await client.query('BEGIN;')
  const tables = [ 'users', 'tokens', 'trade_records', 'user_profile', 'verification_codes' ]
  const startTime = Date.now()
  consola.info('Retrieve information...')
  const [ users, tokens, tradeRecords, userProfile ] = (await Promise.all(tables.map(table => client.query(`SELECT * FROM ${table};`)))).map(x => x.rows)
  consola.info('Drop old tables...')
  await Promise.all(tables.map(t => client.query(`DROP TABLE IF EXISTS ${t} CASCADE;`)))
  consola.info('Load init script...')
  const initScript = readFileSync(path.resolve(__dirname, '../sql/init.sql'))
    .toString()
    .replace('BEGIN;', '')
    .replace('COMMIT;', '')
    .replace(/public\./g, 'public.PRE_')
    .replace(/IDX_/g, 'IDX_PRE_')
  consola.info('Run init script...')
  await client.query(initScript)
  consola.info('Migrate users...')
  const kiuidMapping = new Map()
  for (const user of users) {
    const profile = userProfile.find(x => x.kiuid === user.kiuid)
    const userdata = {
      phone_number: user.phone_number,
      salt: user.salt,
      password: user.salty_password,
      keeer_id: user.keeer_id,
      email: user.email,
      kiuid: user.kiuid,
      kredit: user.kredit,
      nickname: profile.nickname,
      avatar_name: profile.avatar_id,
    }
    const params = Object.keys(userdata)
    const stmt = `INSERT INTO PRE_users (${params.join(', ')}) VALUES (${params.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id;`
    const id = (await client.query(stmt, params.map(k => userdata[k]))).rows[0].id
    kiuidMapping.set(user.kiuid, id)
  }
  consola.info('Migrate tokens...')
  for (const token of tokens) await client.query('INSERT INTO sessions (user_id, token) VALUES ($1, $2);', [ kiuidMapping.get(token.kiuid), token.token_id ])
  consola.info('Migrate trade records...')
  for (const record of tradeRecords) {
    const uid = kiuidMapping.get(record.user_kiuid)
    const time = new Date(record.trade_time * 1000)
    if (record.trade_type === 1) { // recharge
      const orderId = await client.query('INSERT INTO PRE_payjs_orders (user_id, payjs_order_id, amount, payjs_callback, time) VALUES ($1, $2, $3, $4, $5) RETURNING id;', [ uid, record.payjs_order_id, record.absolute_amount, { migrated: true }, time ])
      await client.query('INSERT INTO PRE_trade_records (user_id, amount, time, type, order_id) VALUES ($1, $2, $3, $4, $5);', [ uid, record.absolute_amount, time, 1, orderId.rows[0].id ])
    } else if (record.trade_type === 2) { // payment
      await client.query('INSERT INTO PRE_trade_records (user_id, amount, time, type) VALUES ($1, $2, $3, $4);', [ uid, -record.absolute_amount, time, 2 ])
    }
  }
  consola.info('Finalize migration...')
  await client.query('COMMIT;')
  consola.success({ message: `Migration success in ${(Date.now() - startTime) / 1000} second(s)!`, badge: true })
  process.exit(0)
}).catch(e => {
  consola.fatal(e)
  process.exit(1)
})
