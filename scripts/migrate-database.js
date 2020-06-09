const latestVersion = 3

require('dotenv').config()
const { readFileSync } = require('fs')
const path = require('path')
const consola = require('consola')
const { query } = require('../server/db')

;(async () => {
  const currentVersion = Number((await query('SELECT version FROM PRE_version;')).rows[0].version)
  if (currentVersion === latestVersion) return consola.info(`Already on latest version (v${currentVersion})!`)
  consola.info(`We are migrating from database schema v${currentVersion} to v${latestVersion}`)
  consola.info('Starting migration in 10 seconds, press Ctrl+C to abort.')
  await new Promise(resolve => setTimeout(resolve, 10000))
  consola.info('Starting migration now.')
  for (let version = currentVersion; version < latestVersion; version++) {
    consola.info(`About to run migration script v${version}.sql.`)
    await query(
      readFileSync(path.resolve(__dirname, `../sql/migration/v${version}.sql`))
        .toString()
        .replace(/public\./g, 'public.PRE_')
        .replace(/IDX_/g, 'IDX_PRE_'),
    )
    consola.success(`Finished running migration script v${version}.sql.`)
  }
  consola.success({ message: 'Migration done!', badge: true })
})().catch(e => {
  consola.fatal(e)
  process.exit(-1)
}).then(() => process.exit(0))
