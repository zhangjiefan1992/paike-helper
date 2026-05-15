const defaultConfig = require('../data/defaultConfig')

const KEYS = {
  MEMBERS: 'pk_members',
  SESSIONS: 'pk_sessions',
  CONFIG: 'pk_config'
}

function readKey(key, fallback) {
  try {
    return wx.getStorageSync(key) || fallback
  } catch (e) {
    return fallback
  }
}

function writeKey(key, data) {
  wx.setStorageSync(key, data)
}

// === Member CRUD ===

function getMembers() {
  return readKey(KEYS.MEMBERS, [])
}

function getMemberById(id) {
  const members = getMembers()
  return members.find(m => m.id === id) || null
}

function saveMember(member) {
  const members = getMembers()
  const index = members.findIndex(m => m.id === member.id)
  if (index >= 0) {
    member.updatedAt = Date.now()
    members[index] = member
  } else {
    members.push(member)
  }
  writeKey(KEYS.MEMBERS, members)
}

function deleteMember(id) {
  const members = getMembers().filter(m => m.id !== id)
  writeKey(KEYS.MEMBERS, members)
}

// === Session CRUD ===

function getSessions() {
  return readKey(KEYS.SESSIONS, [])
}

function getSessionById(id) {
  const sessions = getSessions()
  return sessions.find(s => s.id === id) || null
}

function getSessionsByDate(date) {
  return getSessions()
    .filter(s => s.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function getSessionsByDateRange(start, end) {
  return getSessions()
    .filter(s => s.date >= start && s.date <= end)
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
}

function getSessionsByMemberId(memberId) {
  return getSessions()
    .filter(s => s.memberId === memberId || (s.memberIds && s.memberIds.includes(memberId)))
    .sort((a, b) => b.date.localeCompare(a.date))
}

function saveSession(session) {
  const sessions = getSessions()
  const index = sessions.findIndex(s => s.id === session.id)
  if (index >= 0) {
    session.updatedAt = Date.now()
    sessions[index] = session
  } else {
    sessions.push(session)
  }
  writeKey(KEYS.SESSIONS, sessions)
}

function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id)
  writeKey(KEYS.SESSIONS, sessions)
}

function deleteSessionsByDate(date) {
  const sessions = getSessions().filter(s => s.date !== date)
  writeKey(KEYS.SESSIONS, sessions)
}

function updateSessionStatus(id, status) {
  const sessions = getSessions()
  const session = sessions.find(s => s.id === id)
  if (session) {
    session.status = status
    session.updatedAt = Date.now()
    writeKey(KEYS.SESSIONS, sessions)
  }
}

function updateSessionSummary(id, text) {
  const sessions = getSessions()
  const session = sessions.find(s => s.id === id)
  if (session) {
    session.summaryText = text
    session.summaryGeneratedAt = Date.now()
    session.updatedAt = Date.now()
    writeKey(KEYS.SESSIONS, sessions)
  }
}

function updateSessionPhotos(id, type, photos) {
  const sessions = getSessions()
  const session = sessions.find(s => s.id === id)
  if (session) {
    const key = type === 'before' ? 'beforePhotos' : 'afterPhotos'
    session[key] = photos
    session.updatedAt = Date.now()
    writeKey(KEYS.SESSIONS, sessions)
  }
}

function markSummarySent(id) {
  const sessions = getSessions()
  const session = sessions.find(s => s.id === id)
  if (session) {
    session.summarySent = true
    session.updatedAt = Date.now()
    if (session.status === 'scheduled') {
      session.status = 'completed'
    }
    writeKey(KEYS.SESSIONS, sessions)
  }
}

// === Config ===

function getConfig() {
  const config = readKey(KEYS.CONFIG, null)
  if (!config) return Object.assign({}, defaultConfig)
  return config
}

function saveConfig(config) {
  writeKey(KEYS.CONFIG, config)
}

// === Export / Import ===

function exportAllData() {
  return {
    members: getMembers(),
    sessions: getSessions(),
    config: getConfig(),
    exportTime: Date.now(),
    version: '1.0.0'
  }
}

function importData(jsonData) {
  if (!jsonData || !Array.isArray(jsonData.members) || !Array.isArray(jsonData.sessions)) {
    return { success: false, message: '数据格式无效' }
  }
  writeKey(KEYS.MEMBERS, jsonData.members)
  writeKey(KEYS.SESSIONS, jsonData.sessions)
  if (jsonData.config) {
    writeKey(KEYS.CONFIG, jsonData.config)
  }
  return { success: true, message: '导入成功' }
}

module.exports = {
  getMembers,
  getMemberById,
  saveMember,
  deleteMember,
  getSessions,
  getSessionById,
  getSessionsByDate,
  getSessionsByDateRange,
  getSessionsByMemberId,
  saveSession,
  deleteSession,
  deleteSessionsByDate,
  updateSessionStatus,
  updateSessionSummary,
  updateSessionPhotos,
  markSummarySent,
  getConfig,
  saveConfig,
  exportAllData,
  importData
}
