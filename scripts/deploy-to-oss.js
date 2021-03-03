require('dotenv').config()

const path = require('path')
const OSS = require('ali-oss')
const consola = require('consola')

const files = require('../.nuxt/dist/server/client.manifest.json').all.filter(file => !file.startsWith('.'))

;(async () => {
  const cfg = {
    accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
    region: process.env.ALI_OSS_REGION,
    bucket: process.env.ALI_OSS_BUCKET,
  }
  if (Object.values(cfg).some(x => typeof x !== 'string')) throw new Error('Invalid config')
  const store = new OSS(cfg)
  const distDir = '.nuxt/dist/client'
  for (const file of files) {
    await store.put(path.join(process.env.ALI_OSS_ASSETS_PREFIX || '', file), path.join(distDir, file), {
      headers: file === 'LICENSES' ? {} : { 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  }
})().catch(e => {
  consola.fatal(e)
  process.exit(1)
})
