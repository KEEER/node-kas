const keeerIdBlacklist = [ 'keeer', 'rdfz', 'official' ]
const nicknameBlacklist = [ 'keeer', 'rdfz', 'official', '官方', '人大附中', '中国人民大学附属中学' ]

// TODO
exports.validateKeeerId = id => {
  if (keeerIdBlacklist.some(b => id.includes(b))) return false
  return true
}

exports.validateNickname = id => {
  const lowercase = id.toLowerCase()
  if (nicknameBlacklist.some(b => lowercase.includes(b))) return false
  return true
}
