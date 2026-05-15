function generateId(prefix) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return prefix + timestamp + random
}

export function generateMemberId() { return generateId('m_') }
export function generateSessionId() { return generateId('s_') }
