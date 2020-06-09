// FIXME: refactor this one-liner
console.log('# KAS API Responses\nThis documentation is generated partially by using the command: `node scripts/doc-responses`.\n\n' + '### ' + Array.from(require('fs').readFileSync(require('path').resolve(__dirname, '../server/index.js')).toString().matchAll(/router\.(?<methods>[^(]+)\('(?<path>[^']+)'(?<content>(?:.*\n?(?! {2}\}\)))+\n?) {2}\}\)/g)).map(x => x.groups).map(x => '`' + x.methods.toUpperCase() + ' ' + x.path + '`\n' + (x.content.includes('requireLogin') ? 'Require Login\n' : '') + (x.content.includes('requireService') ? 'Require Service\n' : '') + '#### Responses\n- ' + (x.content.match(/\{ status.* \}|INVALID_REQUEST/g) || [ 'Not Available' ]).map(x => x === 'INVALID_REQUEST' ? '`{ status: 1, message: \'非法请求\', code: \'EINVALID_REQUEST\' }`' : x.includes('EUNKNOWN') ? '' : `\`${x}\``).filter(x => !!x).join('\n- ')).join('\n\n### '))