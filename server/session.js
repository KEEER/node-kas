const maxmind = require('maxmind')
const parseUa = require('ua-parser-js')

const db = maxmind.open(require.resolve('../maxmind-data/GeoLite2-City.mmdb'))
const unknown = '未知地点'
const parseCity = c => c ? c.city ? `${c.city.names['zh-CN']}，${c.country.names['zh-CN']}` : c.country ? c.country.names['zh-CN'] : unknown : unknown
exports.showSession = async (session, ctx) => {
  const lookup = await db
  const { created: loginTime, last_seen: lastSeenTime, user_agent: ua, login_ip: lip, last_seen_ip: lsip, id } = session
  const loginLocation = lip ? parseCity(lookup.get(lip)) : unknown
  const lastSeenLocation = lsip ? parseCity(lookup.get(lsip)) : unknown
  const { browser, os, device } = parseUa(ua)
  const icons = [ [ deviceTypes, device.type ], [ oss, os.name ], [ browsers, browser.name ] ]
    .map(([ dict, key ]) => key ? dict[key.toLowerCase()] : null)
    .filter(Boolean)
  const uaString = [ [ os.name, os.version ], [ device.vendor, device.model ], [ browser.name, browser.version ] ]
    .map(([ name, version ]) => name ? version ? `${name} ${version}` : name : null)
    .filter(Boolean)
    .join('，') || '未知设备'
  const current = ctx ? ctx.cookies.get(process.env.TOKEN_COOKIE_NAME) === session.token : null
  return { id, current, loginTime, lastSeenTime, loginLocation, lastSeenLocation, icons, uaString }
}

// dictionary order please
const browsers = {
  chrome: 'google-chrome',
  chromium: 'google-chrome',
  fennec: 'firefox',
  firefox: 'firefox',
  icecat: 'firefox',
  iceweasel: 'firefox',
  ie: 'microsoft-internet-explorer',
  qq: 'qqchat',
  qqbrowser: 'qqchat',
  waterfox: 'firefox',
  wechat: 'wechat',
}
const deviceTypes = {
  console: 'console',
  mobile: 'cellphone',
  tablet: 'tablet',
}
const oss = {
  android: 'android',
  arch: 'arch',
  centos: 'centos',
  debian: 'debian',
  fedora: 'fedora',
  gentoo: 'gentoo',
  ios: 'apple-ios',
  linux: 'linux',
  'mac os': 'apple',
  mint: 'linux-mint',
  redhat: 'linux',
  suse: 'linux',
  ubuntu: 'ubuntu',
  windows: 'microsoft-windows',
}
