const { createHash, randomBytes: randomBytesCb, timingSafeEqual } = require('crypto')
const { promisify } = require('util')
const consola = require('consola')
const { v4: uuid } = require('uuid')
const { checkNumber } = require('./sms')
const { types: TRADE_TYPES } = require('./payjs')
const { query, update, useClient } = require('./db')
const randomBytes = promisify(randomBytesCb)

const snakeFromCamel = {
  phoneNumber: 'phone_number',
  keeerId: 'keeer_id',
  avatarName: 'avatar_name',
}
const camelFromSnake = {
  phone_number: 'phoneNumber',
  keeer_id: 'keeerId',
  avatar_name: 'avatarName',
}

exports.User = class User {
  constructor (options) {
    options = { ...options }
    for (const k in camelFromSnake) if (k in options) {
      options[camelFromSnake[k]] = options[k]
      delete options[k]
    }
    this._changes = new Set()
    this.options = new Proxy(options, {
      set: (obj, prop, val) => {
        this._changes.add(prop)
        obj[prop] = val
        return true
      },
    })
  }

  async createToken (ctx) {
    const token = uuid()
    if (ctx) {
      const sql = 'INSERT INTO PRE_sessions (token, user_id, login_ip, last_seen_ip, user_agent) VALUES ($1, $2, $3, $3, $4);'
      await query(sql, [ token, this.options.id, ctx.state.ip, ctx.get('User-Agent') ])
    } else {
      await query('INSERT INTO PRE_sessions (token, user_id) VALUES ($1, $2);', [ token, this.options.id ])
    }
    return token
  }

  static async _generateSalt () { return (await randomBytes(12)).toString('base64') }
  static _addSaltRaw (password, salt) { return createHash('sha512').update(password).update(salt.trim()).digest() }
  static _addSalt (password, salt) { return User._addSaltRaw(password, salt).toString('hex') }

  passwordMatches (password) {
    return timingSafeEqual(Buffer.from(this.options.password, 'hex'), User._addSaltRaw(password, this.options.salt))
  }

  async setPassword (password) {
    const salt = await User._generateSalt()
    const saltedPassword = User._addSalt(password, salt)
    await query('UPDATE PRE_users SET salt = $2, password = $3 WHERE id = $1;', [ this.options.id, salt, saltedPassword ])
    this.options.salt = salt
    this.options.password = saltedPassword
    this._changes.delete('salt')
    this._changes.delete('password')
  }

  _setKredit (val) {
    this.options.kredit = val
    this._changes.delete('kredit')
  }

  async pay (amount, serviceId = null, tradeType = TRADE_TYPES.TRADE_TYPE_PAYMENT) {
    const throwErr = (msg, constructor = Error) => {
      const err = new constructor(msg)
      err.code = 'EINVALID_AMOUNT'
      throw err
    }
    if (typeof amount !== 'number') throwErr('Refused to pay a non-number amount.', TypeError)
    if (Number.isNaN(amount)) throwErr('Refused to pay NaN.', TypeError)
    if (!Number.isInteger(amount)) throwErr('Refused to pay a non-integer amount.', TypeError)
    if (amount > 1638400) throwErr('Refused to pay such a large amount.')
    if (amount < 0) throwErr('Please use recharge() to recharge.')
    if (amount === 0) throwErr('Refused to pay 0 centi-kredit.')
    await useClient(async client => {
      await client.query('BEGIN;')
      const kredit = (await client.query('SELECT kredit FROM PRE_users WHERE id = $1;', [ this.options.id ])).rows[0].kredit
      if (kredit < amount) {
        const err = new Error('Insufficient kredit.')
        err.code = 'EINSUFFICIENT_KREDIT'
        throw err
      }
      const res = await client.query('UPDATE PRE_users SET kredit = kredit - $2 WHERE id = $1 RETURNING kredit;', [ this.options.id, amount ])
      this._setKredit(res.rows[0].kredit)
      await client.query(
        'INSERT INTO PRE_trade_records (amount, type, user_id, service_id) VALUES ($1, $2, $3, $4);',
        [ -amount, tradeType, this.options.id, serviceId ],
      )
      await client.query('COMMIT;')
    })
  }

  async recharge (amount) {
    if (typeof amount !== 'number') throw new TypeError('Refused to recharge a non-number amount.')
    if (Number.isNaN(amount)) throw new TypeError('Refused to recharge NaN.')
    if (!Number.isInteger(amount)) throw new TypeError('Refused to recharge a non-integer amount.')
    if (amount > 1638400) throw new Error('Refused to recharge such a large amount.')
    if (amount < 0) throw new Error('Please use pay() to pay.')
    if (amount === 0) throw new Error('Refused to recharge 0 centi-kredit.')
    const res = await query('UPDATE PRE_users SET kredit = kredit + $2 WHERE id = $1 RETURNING kredit;', [ this.options.id, amount ])
    this._setKredit(res.rows[0].kredit)
  }

  async setKredit (amount) {
    const res = await query('UPDATE PRE_users SET kredit = $2 WHERE id = $1;', [ this.options.id, amount ])
    this._setKredit(res.rows[0].kredit)
  }

  async update () {
    if (this._changes.size === 0) return
    const args = { last_update: new Date() }
    if (this._changes.has('id')) throw new Error('User ID is immutable')
    if (this._changes.has('kiuid')) throw new Error('User KIUID is immutable')
    if (this._changes.has('salt') || this._changes.has('password')) throw new Error('Use setPassword() to change password')
    if (this._changes.has('kredit')) throw new Error('Use pay() or recharge() or setKredit() to change kredit')
    for (const k of this._changes) args[k] = this.options[k]
    for (const k in snakeFromCamel) if (k in args) {
      args[snakeFromCamel[k]] = args[k]
      delete args[k]
    }
    if ('keeer_id' in args) args.lower_keeer_id = args.keeer_id.toLowerCase()
    await update('PRE_users', args, 'id', this.options.id)
    this._changes.clear()
  }

  async updateLastSeen (ip) {
    if (!ip) throw new Error('IP address must be provided')
    if (!this.currentToken) return
    await query('UPDATE PRE_sessions SET last_seen = NOW(), last_seen_ip = $2 WHERE token = $1;', [ this.currentToken, ip ])
  }

  static async create (phoneNumber, password) {
    const salt = await User._generateSalt()
    const saltedPassword = User._addSalt(password, salt)
    const kiuid = uuid()
    consola.log(`user:create number ${phoneNumber} password ***`)
    const sql = 'INSERT INTO PRE_users (phone_number, salt, password, kiuid) VALUES ($1, $2, $3, $4) RETURNING id;'
    const res = await query(sql, [ phoneNumber, salt, saltedPassword, kiuid ])
    return new User({
      id: res.rows[0].id,
      phoneNumber,
      salt,
      password,
      creation: new Date(),
      lastUpdate: new Date(),
      kredit: 0,
      status: 0,
      kiuid,
    })
  }

  static _fromDb (o) {
    if (!o) return null
    return new User(o)
  }

  static async _from (what, value) {
    const res = await query(`SELECT * FROM PRE_users WHERE ${what} = $1;`, [ value ])
    return User._fromDb(res.rows[0])
  }

  static async fromId (id) { return await User._from('id', id) }
  static async fromPhoneNumber (number) { return await User._from('phone_number', checkNumber(number)) }
  static async fromEmail (email) { return await User._from('email', email) }
  static async fromKeeerId (keeerId) { return await User._from('keeer_id', keeerId) }
  static async fromKiuid (kiuid) { return await User._from('kiuid', kiuid) }

  static async fromToken (token) {
    const res = await query('SELECT * FROM PRE_users WHERE id = (SELECT user_id FROM PRE_sessions WHERE token = $1);', [ token ])
    const user = User._fromDb(res.rows[0])
    if (user) user.currentToken = token
    return user
  }

  static async fromContext (ctx) {
    const token = ctx.cookies.get(process.env.TOKEN_COOKIE_NAME)
    const token2Match = ctx.get('Authorization').toLowerCase().match(/^bearer ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
    if (token2Match && token2Match[1]) {
      const user = await User.fromToken(token2Match[1])
      if (user) return user
    }
    return await User.fromToken(token)
  }

  static async login (identity, password) {
    if (!identity || !password) return null
    consola.log(`user:login ident ${identity} password ***`)
    const users = (await query('SELECT * FROM PRE_users WHERE lower_keeer_id = LOWER($1) OR phone_number = $1 OR email = $1;', [ identity ])).rows.map(o => User._fromDb(o))
    for (const user of users) if (user.passwordMatches(password)) return user
    consola.log(`user:login ident ${identity} failed!`)
    return null
  }
}

setInterval(async () => {
  await query('DELETE FROM PRE_sessions WHERE created < $1;', [ new Date(Date.now() - parseInt(process.env.TOKEN_MAXAGE)) ])
}, parseInt(process.env.TOKEN_CLEAR_INTERVAL))
