function generateId(prefix) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return prefix + timestamp + random
}

function generateMemberId() {
  return generateId('m_')
}

function generateSessionId() {
  return generateId('s_')
}

module.exports = { generateMemberId, generateSessionId }
