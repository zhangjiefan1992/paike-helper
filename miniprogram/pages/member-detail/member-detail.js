const storage = require('../../utils/storage')

const MEDICAL_KEYWORDS = ['膝伤', '腰痛', '颈椎', '肩颈', '孕期', '经期', '受伤', '不适', '术后', '高血压', '低血压', '腰伤', '腰间盘']
const ACCENT_PALETTE = ['#4A7C59', '#A8B8A0', '#C2A882', '#B8A898', '#9EABA2']

function hashColor(name) {
  if (!name) return ACCENT_PALETTE[0]
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length]
}

function formatShort(s) {
  if (!s) return ''
  const [, m, d] = s.split('-')
  return parseInt(m) + '月' + parseInt(d) + '日'
}

function formatLong(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return y + '年' + parseInt(m) + '月' + parseInt(d) + '日'
}

function highlightMedical(text) {
  if (!text) return []
  const parts = []
  let cursor = 0
  const pattern = new RegExp('(' + MEDICAL_KEYWORDS.join('|') + ')', 'g')
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push({ t: text.slice(cursor, match.index), mark: false })
    }
    parts.push({ t: match[0], mark: true })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) parts.push({ t: text.slice(cursor), mark: false })
  return parts
}

function truncate(text, n) {
  if (!text) return ''
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

Page({
  data: {
    member: null,
    accent: ACCENT_PALETTE[0],
    notesParts: [],
    medicalKeywords: [],

    lastSession: null,
    daysSinceLast: null,
    daysSinceUnit: '',
    lastMeta: '',

    totalCompleted: 0,
    thisMonthCount: 0,
    thisWeekCount: 0,

    recent5: [],
    courseTypeDistribution: [],
    topFocusAreas: []
  },

  onLoad(options) {
    if (!options.id) {
      wx.navigateBack()
      return
    }
    this.memberId = options.id
  },

  onShow() {
    this._build()
  },

  _build() {
    const member = storage.getMemberById(this.memberId)
    if (!member) {
      wx.navigateBack()
      return
    }

    const sessions = storage.getSessionsByMemberId(this.memberId)
    const sorted = sessions.slice().sort((a, b) => {
      const da = a.date + ' ' + (a.startTime || '00:00')
      const db = b.date + ' ' + (b.startTime || '00:00')
      return db.localeCompare(da)
    })

    const lastSession = sorted.find(s => s.status === 'completed') || sorted[0] || null
    let daysSinceLast = null
    let daysSinceUnit = ''
    let lastMeta = ''
    if (lastSession) {
      const d = new Date(lastSession.date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diff = Math.round((today - d) / 86400000)
      daysSinceLast = diff < 0 ? 0 : diff
      daysSinceUnit = daysSinceLast === 0 ? '今天' : '天前'
      const dur = lastSession.duration ? (' · ' + lastSession.duration + ' 分钟') : ''
      lastMeta = formatLong(lastSession.date) + ' · ' + (lastSession.courseType || '') + dur
    }

    const totalCompleted = sessions.filter(s => s.status === 'completed').length

    const ym = new Date().toISOString().slice(0, 7)
    const thisMonthCount = sessions.filter(s => s.status === 'completed' && s.date.startsWith(ym)).length

    const t = new Date()
    const dayOfWeek = t.getDay() || 7
    const monday = new Date(t)
    monday.setDate(t.getDate() - dayOfWeek + 1)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const thisWeekCount = sessions.filter(s => {
      if (s.status !== 'completed') return false
      const dd = new Date(s.date + 'T00:00:00')
      return dd >= monday && dd <= sunday
    }).length

    const statusMap = { scheduled: '待上课', completed: '已完成', cancelled: '已取消', noshow: '未出勤' }
    const recent5 = sorted.slice(0, 5).map(s => ({
      id: s.id,
      date: formatShort(s.date),
      startTime: s.startTime || '',
      status: s.status || 'scheduled',
      statusLabel: statusMap[s.status] || s.status || '待上课',
      courseType: s.courseType || '课程',
      location: s.location || '',
      focusAreas: s.focusAreas || [],
      focusJoin: (s.focusAreas || []).join('、'),
      digestParts: highlightMedical(truncate(s.aiDigest || s.notes || '', 110)),
      hasContent: !!(s.aiDigest || s.notes)
    }))

    // 课程类型分布
    const typeCount = {}
    sessions.forEach(s => {
      if (s.status === 'cancelled' || !s.courseType) return
      typeCount[s.courseType] = (typeCount[s.courseType] || 0) + 1
    })
    const typeItems = Object.keys(typeCount).map(k => ({ name: k, count: typeCount[k] }))
    typeItems.sort((a, b) => b.count - a.count)
    const max = (typeItems[0] && typeItems[0].count) || 1
    const courseTypeDistribution = typeItems.slice(0, 5).map(x => ({
      name: x.name,
      count: x.count,
      pct: Math.round((x.count / max) * 100)
    }))

    // 训练重点
    const faCount = {}
    sessions.forEach(s => {
      if (s.status === 'cancelled') return
      ;(s.focusAreas || []).forEach(a => { faCount[a] = (faCount[a] || 0) + 1 })
    })
    const faItems = Object.keys(faCount).map(k => ({ name: k, count: faCount[k] }))
    faItems.sort((a, b) => b.count - a.count)
    const topFocusAreas = faItems.slice(0, 8).map((x, i) => ({
      name: x.name,
      size: Math.max(22, 36 - i * 2),
      opacity: Math.max(0.4, 1 - i * 0.08)
    }))

    // 医疗关键词
    const haystack = (member.notes || '') + '\n' + sessions.map(s => (s.notes || '') + ' ' + (s.aiDigest || '')).join('\n')
    const medicalKeywords = MEDICAL_KEYWORDS.filter(kw => haystack.includes(kw))

    this.setData({
      member,
      accent: hashColor(member.name),
      notesParts: highlightMedical(member.notes || ''),
      medicalKeywords,
      lastSession,
      daysSinceLast,
      daysSinceUnit,
      lastMeta,
      totalCompleted,
      thisMonthCount,
      thisWeekCount,
      recent5,
      courseTypeDistribution,
      topFocusAreas
    })
  },

  onSessionTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/session/session?id=' + id })
  },

  onEdit() {
    wx.navigateTo({ url: '/pages/member-edit/member-edit?id=' + this.memberId })
  }
})
