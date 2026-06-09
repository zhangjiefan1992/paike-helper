const KEYS = {
  MEMBERS: 'pk_members',
  SESSIONS: 'pk_sessions',
  CONFIG: 'pk_config',
  IMPORT_PREVIEWS: 'pk_ai_import_previews'
}

const defaultConfig = {
  courseTypes: ['瑜伽', '普拉提', '体能训练', '拉伸放松'],
  locations: [],
  focusAreaOptions: ['核心', '髋关节', '肩颈', '下肢', '上肢', '全身', '平衡', '柔韧'],
  defaultDuration: 60,
  workingHours: { start: '08:00', end: '21:00' }
}

function readKey(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    return value || fallback
  } catch (err) {
    return fallback
  }
}

function writeKey(key, value) {
  wx.setStorageSync(key, value)
}

function getMembers() {
  return readKey(KEYS.MEMBERS, [])
}

function getMemberById(id) {
  return getMembers().find(member => member.id === id) || null
}

function getMemberByName(name) {
  if (!name) return null
  return getMembers().find(member => member.name === name) || null
}

function saveMember(member) {
  const members = getMembers()
  const idx = members.findIndex(item => item.id === member.id)
  const next = Object.assign({}, member, { updatedAt: Date.now() })
  if (idx >= 0) members[idx] = next
  else members.push(next)
  writeKey(KEYS.MEMBERS, members)
  return next
}

function getSessions() {
  return readKey(KEYS.SESSIONS, [])
}

function getSessionById(id) {
  return getSessions().find(session => session.id === id) || null
}

function getSessionsByDateRange(start, end) {
  return getSessions()
    .filter(session => session.date >= start && session.date <= end)
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
}

function saveSession(session) {
  const sessions = getSessions()
  const idx = sessions.findIndex(item => item.id === session.id)
  const next = Object.assign({}, session, { updatedAt: Date.now() })
  if (idx >= 0) sessions[idx] = next
  else sessions.push(next)
  writeKey(KEYS.SESSIONS, sessions)
  return next
}

function deleteSessionsByDate(date) {
  writeKey(KEYS.SESSIONS, getSessions().filter(session => session.date !== date))
}

function updateSessionStatus(id, status) {
  const sessions = getSessions()
  const idx = sessions.findIndex(session => session.id === id)
  if (idx < 0) return null
  sessions[idx] = Object.assign({}, sessions[idx], { status, updatedAt: Date.now() })
  writeKey(KEYS.SESSIONS, sessions)
  return sessions[idx]
}

function getConfig() {
  return readKey(KEYS.CONFIG, defaultConfig)
}

function getImportPreviews() {
  return readKey(KEYS.IMPORT_PREVIEWS, [])
}

function saveImportPreview(preview) {
  const previews = getImportPreviews().filter(item => item.token !== preview.token)
  previews.push(preview)
  writeKey(KEYS.IMPORT_PREVIEWS, previews.slice(-20))
  return preview
}

function getImportPreview(token) {
  return getImportPreviews().find(item => item.token === token) || null
}

function markImportPreviewConsumed(token) {
  const previews = getImportPreviews()
  const idx = previews.findIndex(item => item.token === token)
  if (idx < 0) return null
  previews[idx] = Object.assign({}, previews[idx], { consumed: true, consumedAt: Date.now() })
  writeKey(KEYS.IMPORT_PREVIEWS, previews)
  return previews[idx]
}

module.exports = {
  KEYS,
  getMembers,
  getMemberById,
  getMemberByName,
  saveMember,
  getSessions,
  getSessionById,
  getSessionsByDateRange,
  saveSession,
  deleteSessionsByDate,
  updateSessionStatus,
  getConfig,
  saveImportPreview,
  getImportPreview,
  markImportPreviewConsumed
}
