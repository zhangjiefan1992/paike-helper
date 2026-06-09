const storage = require('../../utils/storage')
const themeUtil = require('../../utils/theme')

const MEDICAL_KEYWORDS = ['膝伤', '腰痛', '颈椎', '肩颈', '孕期', '经期', '受伤', '不适', '术后', '高血压', '低血压', '腰伤', '腰间盘']
const ACCENT_PALETTE = ['#4A7C59', '#A8B8A0', '#C2A882', '#B8A898', '#9EABA2']

function hashColor(name) {
  if (!name) return ACCENT_PALETTE[0]
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length]
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - d) / 86400000)
  return diff < 0 ? 0 : diff
}

function relativeLabel(dateStr) {
  const d = daysSince(dateStr)
  if (d === null) return '未开始'
  if (d === 0) return '今天'
  if (d === 1) return '昨天'
  if (d <= 30) return d + ' 天前'
  const dt = new Date(dateStr)
  return (dt.getMonth() + 1) + '月' + dt.getDate() + '日'
}

Page({
  data: {
    totalCount: 0,
    isEmpty: true,
    searchKeyword: '',
    sections: [],
    _members: [],
    _sessions: []
  },

  onShow() {
    themeUtil.applyAppTheme(storage.getConfig())
    this.loadMembers()
  },

  onPullDownRefresh() {
    this.loadMembers()
    wx.stopPullDownRefresh()
  },

  loadMembers() {
    const members = storage.getMembers()
    const sessions = storage.getSessions()
    this.setData({ _members: members, _sessions: sessions, totalCount: members.length })
    this._rebuildSections()
  },

  _rebuildSections() {
    const { _members: members, _sessions: sessions, searchKeyword } = this.data
    const kw = (searchKeyword || '').trim().toLowerCase()

    const filtered = members.filter(m => {
      if (!kw) return true
      const name = (m.name || '').toLowerCase()
      const phone = m.phone || ''
      const tags = (m.tags || []).join(' ').toLowerCase()
      return name.includes(kw) || phone.includes(kw) || tags.includes(kw)
    })

    const enriched = filtered.map(m => {
      const memberSessions = sessions.filter(
        s => s.memberId === m.id || (s.memberIds && s.memberIds.includes(m.id))
      )
      const sorted = memberSessions
        .filter(s => s.status !== 'cancelled')
        .sort((a, b) => (b.date + ' ' + (b.startTime || '00:00')).localeCompare(a.date + ' ' + (a.startTime || '00:00')))
      const lastDate = sorted.length > 0 ? sorted[0].date : null
      const d = daysSince(lastDate)

      const haystack = (m.notes || '') + ' ' + (m.tags || []).join(' ')
      const hasMedical = MEDICAL_KEYWORDS.some(kw => haystack.includes(kw))

      return {
        id: m.id,
        name: m.name,
        phone: m.phone || '',
        tags: (m.tags || []).slice(0, 3),
        totalSessions: memberSessions.length,
        daysSince: d,
        relativeLabel: relativeLabel(lastDate),
        hasMedical,
        accent: hashColor(m.name),
        _sortKey: d === null ? Infinity : d,
        createdAt: m.createdAt || 0
      }
    })

    const groups = [
      { label: '本周活跃', members: [] },
      { label: '本月', members: [] },
      { label: '更早', members: [] },
      { label: '新会员', members: [] }
    ]

    enriched.forEach(m => {
      if (m.daysSince === null) groups[3].members.push(m)
      else if (m.daysSince <= 7) groups[0].members.push(m)
      else if (m.daysSince <= 30) groups[1].members.push(m)
      else groups[2].members.push(m)
    })

    groups.forEach(g => {
      g.members.sort((a, b) => {
        if (a._sortKey === b._sortKey) return b.createdAt - a.createdAt
        return a._sortKey - b._sortKey
      })
    })

    const sections = groups.filter(g => g.members.length > 0)
    this.setData({
      sections,
      isEmpty: enriched.length === 0
    })
  },

  onSearch(e) {
    this.setData({ searchKeyword: e.detail.value })
    this._rebuildSections()
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' })
    this._rebuildSections()
  },

  onMemberTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/member-detail/member-detail?id=' + id })
  },

  onGoStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  },

  onAddMember() {
    wx.navigateTo({ url: '/pages/member-edit/member-edit' })
  },

  onShareAppMessage() {
    return {
      title: '排课助手 · 轻松管理你的私教课程',
      path: '/pages/week/week',
    }
  },
})
