const dateUtil = require('./date')

const STATUS_LABELS = {
  scheduled: '已约',
  completed: '已上',
  cancelled: '取消',
  noshow: '爽约'
}

function text(text) {
  return [{ type: 'text', text }]
}

function makeMemberMap(members) {
  const map = {}
  members.forEach(member => { map[member.id] = member })
  return map
}

function getSessionMemberName(session, memberMap) {
  if (session.memberId && memberMap[session.memberId]) return memberMap[session.memberId].name
  if (session.classMode === 'group') return ((session.memberIds || []).length || '') + '人团课'
  return '未选会员'
}

function shapeSession(session, memberMap) {
  return {
    id: session.id,
    date: session.date,
    dateLabel: dateUtil.formatMonthDay(session.date) + ' ' + dateUtil.getWeekday(session.date),
    startTime: session.startTime,
    duration: session.duration || 60,
    classMode: session.classMode || 'private',
    courseType: session.courseType || '课程',
    location: session.location || '',
    memberId: session.memberId || '',
    memberName: getSessionMemberName(session, memberMap),
    status: session.status || 'scheduled',
    statusLabel: STATUS_LABELS[session.status] || '已约'
  }
}

function groupWeekSessions(week, sessions, members) {
  const memberMap = makeMemberMap(members)
  const byDate = {}
  week.days.forEach(day => { byDate[day.date] = [] })
  sessions.forEach(session => {
    if (!byDate[session.date]) byDate[session.date] = []
    byDate[session.date].push(shapeSession(session, memberMap))
  })
  return week.days.map(day => ({
    date: day.date,
    weekday: day.weekday,
    dayNum: day.dayNum,
    count: byDate[day.date].length,
    sessions: byDate[day.date].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }))
}

function summarizeStats(sessions, lastWeekSessions) {
  const summary = {
    total: sessions.length,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    noshow: 0,
    privateCnt: 0,
    groupCnt: 0,
    totalMinutes: 0,
    lastWeekTotal: lastWeekSessions.length,
    diff: sessions.length - lastWeekSessions.length
  }
  const memberIds = {}
  const courseTypeCounts = {}
  sessions.forEach(session => {
    const status = session.status || 'scheduled'
    if (summary[status] !== undefined) summary[status] += 1
    if (session.classMode === 'group') summary.groupCnt += 1
    else summary.privateCnt += 1
    summary.totalMinutes += session.duration || 60
    if (session.memberId) memberIds[session.memberId] = true
    ;(session.memberIds || []).forEach(id => { memberIds[id] = true })
    if (session.courseType) courseTypeCounts[session.courseType] = (courseTypeCounts[session.courseType] || 0) + 1
  })
  summary.activeMemberCount = Object.keys(memberIds).length
  summary.totalHoursText = formatMinutes(summary.totalMinutes)
  const courseTypes = Object.keys(courseTypeCounts)
    .sort((a, b) => courseTypeCounts[b] - courseTypeCounts[a])
    .map(name => ({ name, count: courseTypeCounts[name] }))
  return { summary, courseTypes }
}

function formatMinutes(minutes) {
  if (minutes < 60) return minutes + '分钟'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? h + '小时' + m + '分' : h + '小时'
}

function cleanSessionForStorage(session) {
  const transientKeys = ['_raw', '_lineNum', '_memberName', '_weekday', 'checked', 'displayText']
  const next = {}
  Object.keys(session).forEach(key => {
    if (!transientKeys.includes(key)) next[key] = session[key]
  })
  return next
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

module.exports = {
  STATUS_LABELS,
  text,
  makeMemberMap,
  shapeSession,
  groupWeekSessions,
  summarizeStats,
  formatMinutes,
  cleanSessionForStorage,
  statusLabel
}
