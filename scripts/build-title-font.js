const fs = require('fs')
const path = require('path')
const fc2 = require('font-carrier2')

const chars = fs.readFileSync(require.resolve('../title-font-chars')).toString()
const font = fc2.transfer('./SourceHanSansCN-ExtraLight.otf')
font.min(chars)
font.output({ path: path.join(__dirname, '../assets/font/title'), types: [ 'woff', 'woff2' ] })
