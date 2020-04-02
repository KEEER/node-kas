const { Pool } = require('pg')

const pool = exports.pool = new Pool()
const wrapQuery = (fn, ctx) => {
  return (...args) => {
    args[0] = args[0].replace(/PRE_/g, process.env.TABLE_PREFIX)
    return fn.apply(ctx, args)
  }
}
exports.useClient = async cb => {
  const client = await pool.connect()
  try {
    client.query = wrapQuery(client.query, client)
    return await cb(client)
  } finally {
    client.release()
  }
}
exports.query = wrapQuery(pool.query, pool)

exports.update = async (table, args, key, cond) => {
  const argarr = []
  let count = 0
  const values = []
  for (const i in args) {
    argarr.push(`${i} = $${++count}`)
    values.push(args[i])
  }
  values.push(cond)
  const stmt = `UPDATE ${table} SET ${argarr.join(', ')} WHERE ${key} = $${++count};`
  return await exports.query(stmt, values)
}
