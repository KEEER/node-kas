const { randomBytes: randomBytesCb } = require('crypto')
const { promisify } = require('util')
const consola = require('consola')
const { parsePhoneNumberFromString } = require('@keeer/libphonenumber/max')
const smsCb = require('ali-sms')
const { query } = require('./db')
const randomBytes = promisify(randomBytesCb)
const sms = promisify(smsCb)

const SMS_MAXAGE = parseInt(process.env.SMS_MAXAGE)
const SMS_INTERVAL = parseInt(process.env.SMS_INTERVAL)

const sendSms = async (number, templateCode, param) => await sms({
  accessKeyID: process.env.ALI_SMS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_SMS_ACCESS_KEY_SECRET,
  paramString: param,
  recNum: [ number ],
  signName: process.env.ALI_SMS_SIGN_NAME, // i.e. '客页KEEER'
  templateCode,
})

const checkNumber = exports.checkNumber = phoneNumber => {
  const number = parsePhoneNumberFromString(phoneNumber, 'CN')
  if (!number || !number.isValid() || number.getType() !== 'MOBILE' || number.country !== 'CN') {
    const err = new Error('Invalid phone number.')
    err.code = 'EINVALID_PHONE_NUMBER'
    throw err
  }
  return number.nationalNumber // format: '15000000000'
}

const generateCode = exports.generateCode = async () => String((await randomBytes(8)).readUInt32BE() % 10000).padStart(4, '0')

exports.types = {
  SMS_TYPE_UNKNOWN: 0,
  SMS_TYPE_REGISTER: 1,
  SMS_TYPE_FIND_BACK_PASSWORD: 2,
  SMS_TYPE_SET_PHONE_NUMBER: 3,
  SMS_TYPE_OTHER: 127,
}
exports.sendSmsVerificationCode = async (phoneNumber, type, user, code) => {
  if (!code) code = await generateCode()
  phoneNumber = checkNumber(phoneNumber)
  const checkRes = await query(
    'SELECT id FROM PRE_sms_codes WHERE time > $1 AND number = $2;',
    [ new Date(Date.now() - SMS_INTERVAL), phoneNumber ],
  )
  if (checkRes.rows.length > 0) {
    const err = new Error('In cooling period.')
    err.code = 'ECOOLING_PERIOD'
    throw err
  }
  const userId = user ? user.options.id : null
  const res = await query('INSERT INTO PRE_sms_codes (number, type, user_id, code) VALUES ($1, $2, $3, $4) RETURNING id;', [ phoneNumber, type, userId, code ])
  try {
    consola.info(`About to send ${code} to ${phoneNumber} as #${res.rows[0].id}.`)
    await sendSms(phoneNumber, process.env.ALI_SMS_VERIFICATION_TEMPLATE_CODE, { code })
  } catch (e) {
    try {
      await query('DELETE FROM PRE_sms_codes WHERE id = $1;', [ res.rows[0].id ])
    } catch (e) { consola.warn(e) }
    consola.warn(e)
    const err = new Error(`Error sending SMS: ${e}`)
    err.code = 'ESMS_SEND_ERROR'
    throw err
  }
}

exports.checkSmsVerificationCode = async (phoneNumber, code, type, user) => {
  phoneNumber = checkNumber(phoneNumber)
  consola.log(`delete:verification user #${(user && user.options.id) || 'unknown'} code ${code} type ${type}`)
  const res = await query(
    `DELETE FROM PRE_sms_codes WHERE number = $1 AND code = $2 AND type = $3 AND time > $4${user ? ' AND user_id = $5' : ''};`,
    [ phoneNumber, code, type, new Date(Date.now() - SMS_MAXAGE), ...(user ? [ user.options.id ] : []) ],
  )
  return res.rowCount > 0
}

setInterval(async () => {
  try {
    await query('DELETE FROM PRE_sms_codes WHERE time < $1;', [ new Date(Date.now() - SMS_MAXAGE) ])
  } catch (e) { consola.error(e) }
}, parseInt(process.env.SMS_CLEAR_INTERVAL))
