const KEYS = {
  MEMBERS: 'pk_members',
  SESSIONS: 'pk_sessions',
  CONFIG: 'pk_config'
}

const defaultConfig = {
  courseTypes: ['瑜伽', '普拉提', '体能训练', '拉伸放松'],
  locations: [],
  focusAreaOptions: ['核心', '髋关节', '肩颈', '下肢', '上肢', '全身', '平衡', '柔韧'],
  defaultDuration: 60,
  theme: 'anime-warm',
  workingHours: { start: '08:00', end: '21:00' }
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function getMembers() { return read(KEYS.MEMBERS, []) }

export function getMemberById(id) {
  return getMembers().find(m => m.id === id) || null
}

export function saveMember(member) {
  const members = getMembers()
  const idx = members.findIndex(m => m.id === member.id)
  if (idx >= 0) { member.updatedAt = Date.now(); members[idx] = member }
  else members.push(member)
  write(KEYS.MEMBERS, members)
}

export function deleteMember(id) {
  write(KEYS.MEMBERS, getMembers().filter(m => m.id !== id))
}

export function getSessions() { return read(KEYS.SESSIONS, []) }

export function getSessionById(id) {
  return getSessions().find(s => s.id === id) || null
}

export function getSessionsByDate(date) {
  return getSessions()
    .filter(s => s.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function getSessionsByDateRange(start, end) {
  return getSessions()
    .filter(s => s.date >= start && s.date <= end)
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
}

export function getSessionsByMemberId(memberId) {
  return getSessions()
    .filter(s => s.memberId === memberId || (s.memberIds && s.memberIds.includes(memberId)))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function saveSession(session) {
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === session.id)
  if (idx >= 0) { session.updatedAt = Date.now(); sessions[idx] = session }
  else sessions.push(session)
  write(KEYS.SESSIONS, sessions)
}

export function deleteSession(id) {
  write(KEYS.SESSIONS, getSessions().filter(s => s.id !== id))
}

export function deleteSessionsByDate(date) {
  write(KEYS.SESSIONS, getSessions().filter(s => s.date !== date))
}

export function updateSessionStatus(id, status) {
  const sessions = getSessions()
  const s = sessions.find(s => s.id === id)
  if (s) { s.status = status; s.updatedAt = Date.now(); write(KEYS.SESSIONS, sessions) }
}

export function updateSessionSummary(id, text) {
  const sessions = getSessions()
  const s = sessions.find(s => s.id === id)
  if (s) { s.summaryText = text; s.summaryGeneratedAt = Date.now(); s.updatedAt = Date.now(); write(KEYS.SESSIONS, sessions) }
}

export function markSummarySent(id) {
  const sessions = getSessions()
  const s = sessions.find(s => s.id === id)
  if (s) { s.summarySent = true; s.updatedAt = Date.now(); write(KEYS.SESSIONS, sessions) }
}

export function getConfig() {
  return read(KEYS.CONFIG, null) || { ...defaultConfig }
}

export function saveConfig(config) { write(KEYS.CONFIG, config) }

export function exportAllData() {
  return { members: getMembers(), sessions: getSessions(), config: getConfig(), exportTime: Date.now(), version: '1.0.0' }
}

export function importData(jsonData) {
  if (!jsonData || !Array.isArray(jsonData.members) || !Array.isArray(jsonData.sessions))
    return { success: false, message: '数据格式无效' }
  write(KEYS.MEMBERS, jsonData.members)
  write(KEYS.SESSIONS, jsonData.sessions)
  if (jsonData.config) write(KEYS.CONFIG, jsonData.config)
  return { success: true, message: '导入成功' }
}
