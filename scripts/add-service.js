require('dotenv').config()

const inquirer = require('inquirer')
const consola = require('consola')
const uuid = require('uuid').v4
const { query } = require('../server/db')

const loginPrefQuestions = {
  title: 'Login page title:',
  logoSrc: 'Service icon URL:',
  backgroundUrl: 'Login page background image URL:',
  backgroundCopyright: 'Background image copyright text:',
  backgroundCopyrightUrl: 'Background image copyright link URL:',
  themeColor: 'Login page theme color:',
  redirectUrl: 'Login redirect URL:',
}

;(async () => {
  const { name, hasLoginPrefs, loginPrefs } = await inquirer.prompt([
    {
      name: 'name',
      message: 'Service name:',
      async validate (name) {
        if (!name) return 'Please provide a service name.'
        if (!/^[a-z0-9-]*$/.test(name)) return 'Service names should be kebab-case.'
        const res = await query('SELECT id FROM PRE_services WHERE name = $1;', [ name ])
        if (res.rows.length > 0) return 'This service name is already taken.'
        return true
      },
    },
    {
      name: 'hasLoginPrefs',
      type: 'confirm',
      message: 'Does this service has a custom login interface?',
      dafault: true,
    },
    ...Object.keys(loginPrefQuestions).map(k => ({
      name: `loginPrefs.${k}`,
      message: loginPrefQuestions[k],
      when: ({ hasLoginPrefs }) => hasLoginPrefs,
    })),
  ])
  const token = uuid()
  const stmt = 'INSERT INTO PRE_services (name, token, login_prefs) VALUES ($1, $2, $3) RETURNING id;'
  const res = await query(stmt, [ name, token, hasLoginPrefs ? loginPrefs : null ])
  const message = `Your service ID is #${res.rows[0].id} , service token is ${token}` +
    (hasLoginPrefs ? `\n${' '.repeat(10)}Your login URL is ${new URL(`/login?service=${name}`, process.env.BASE_URL)}` : '') +
    '\n\n' + ' '.repeat(10) + 'Be sure to save this token cause it will only appear once!'.toUpperCase()
  consola.success({ message, badge: true })
  process.exit(0)
})().catch(e => {
  consola.fatal(e)
  process.exit(1)
})
