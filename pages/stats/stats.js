const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')

Page({
  data: {
    weekLabel: '',
    summary: {
      total: 0,
      completed: 0,
      cancelled: 0,
      noshow: 0,
      privateCnt: 0,
      groupCnt: 0,
      totalMinutes: 0,
      lastWeekTotal: 0,
      diff: 0
    },
    activeMembers: [],
    inactiveMembers: [],
    courseTypeBars: [],
    locationBars: [],
    isEmpty: true
  },

  onShow() {
    if (!this._currentDate) this._currentDate = new Date()
    this.loadStats(this._currentDate)
  },

  loadStats(date) {
    const currentWeek = dateUtil.getWeekRange(date)
    const lastWeek = dateUtil.getLastWeekRange(date)

    const thisWeekSessions = storage.getSessionsByDateRange(currentWeek.start, currentWeek.end)
    const lastWeekSessions = storage.getSessionsByDateRange(lastWeek.start, lastWeek.end)
    const members = storage.getMembers()
    const allSessions = storage.getSessions()

    const startDay = currentWeek.days[0]
    const endDay = currentWeek.days[6]
    const weekLabel = startDay.date.substring(5).replace('-', '/') + ' - ' + endDay.date.substring(5).replace('-', '/')

    const summary = this.calcSummary(thisWeekSessions, lastWeekSessions)
    summary.totalHoursText = this.formatHours(summary.totalMinutes)
    summary.diffText = summary.diff > 0 ? '+' + summary.diff : String(summary.diff)
    const { activeMembers, inactiveMembers } = this.calcMemberActivity(thisWeekSessions, members, allSessions)
    const courseTypeBars = this.calcDistribution(thisWeekSessions, 'courseType')
    const locationBars = this.calcDistribution(thisWeekSessions, 'location')

    this._currentDate = date

    this.setData({
      weekLabel,
      summary,
      activeMembers,
      inactiveMembers,
      courseTypeBars,
      locationBars,
      isEmpty: thisWeekSessions.length === 0
    })
  },

  onPrevWeek() {
    const d = new Date(this._currentDate)
    d.setDate(d.getDate() - 7)
    this.loadStats(d)
  },

  onNextWeek() {
    const d = new Date(this._currentDate)
    d.setDate(d.getDate() + 7)
    this.loadStats(d)
  },

  onTouchStart(e) {
    this._touchStartX = e.touches[0].clientX
  },

  onTouchEnd(e) {
    const deltaX = e.changedTouches[0].clientX - this._touchStartX
    if (Math.abs(deltaX) < 50) return
    const d = new Date(this._currentDate)
    d.setDate(d.getDate() + (deltaX < 0 ? 7 : -7))
    this.loadStats(d)
  },

  calcSummary(sessions, lastWeekSessions) {
    let total = 0, completed = 0, cancelled = 0, noshow = 0
    let privateCnt = 0, groupCnt = 0, totalMinutes = 0

    sessions.forEach(s => {
      total++
      if (s.status === 'completed') completed++
      if (s.status === 'cancelled') cancelled++
      if (s.status === 'noshow') noshow++
      if (s.classMode === 'group') groupCnt++
      else privateCnt++
      totalMinutes += (s.duration || 60)
    })

    const lastWeekTotal = lastWeekSessions.length
    const diff = total - lastWeekTotal

    return { total, completed, cancelled, noshow, privateCnt, groupCnt, totalMinutes, lastWeekTotal, diff }
  },

  calcMemberActivity(weekSessions, members, allSessions) {
    const memberMap = {}
    members.forEach(m => { memberMap[m.id] = m })

    const weekCount = {}
    weekSessions.forEach(s => {
      const ids = []
      if (s.memberId) ids.push(s.memberId)
      if (s.memberIds) s.memberIds.forEach(id => ids.push(id))
      ids.forEach(id => { weekCount[id] = (weekCount[id] || 0) + 1 })
    })

    const now = new Date()
    const thisMonthPrefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const monthCount = {}
    allSessions.forEach(s => {
      if (!s.date.startsWith(thisMonthPrefix)) return
      const ids = []
      if (s.memberId) ids.push(s.memberId)
      if (s.memberIds) s.memberIds.forEach(id => ids.push(id))
      ids.forEach(id => { monthCount[id] = (monthCount[id] || 0) + 1 })
    })

    const lastSessionDate = {}
    allSessions.forEach(s => {
      const ids = []
      if (s.memberId) ids.push(s.memberId)
      if (s.memberIds) s.memberIds.forEach(id => ids.push(id))
      ids.forEach(id => {
        if (!lastSessionDate[id] || s.date > lastSessionDate[id]) {
          lastSessionDate[id] = s.date
        }
      })
    })

    const todayStr = dateUtil.toDateStr(now)
    const sevenDaysAgo = dateUtil.addDays(todayStr, -7)

    const activeMembers = []
    const inactiveMembers = []

    members.forEach(m => {
      const wk = weekCount[m.id] || 0
      const mo = monthCount[m.id] || 0
      const lastDate = lastSessionDate[m.id] || ''

      if (wk > 0) {
        activeMembers.push({
          id: m.id,
          name: m.name,
          avatar: m.avatar || '',
          weekCount: wk,
          monthCount: mo
        })
      } else if (lastDate && lastDate < sevenDaysAgo) {
        const daysSince = Math.floor((dateUtil.parseDate(todayStr) - dateUtil.parseDate(lastDate)) / 86400000)
        inactiveMembers.push({
          id: m.id,
          name: m.name,
          avatar: m.avatar || '',
          daysSince,
          lastDate
        })
      }
    })

    activeMembers.sort((a, b) => b.weekCount - a.weekCount)
    inactiveMembers.sort((a, b) => b.daysSince - a.daysSince)

    return { activeMembers, inactiveMembers }
  },

  calcDistribution(sessions, field) {
    const counts = {}
    sessions.forEach(s => {
      const val = s[field]
      if (val) counts[val] = (counts[val] || 0) + 1
    })

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const max = entries.length > 0 ? entries[0][1] : 1

    return entries.map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / max) * 100)
    }))
  },

  onMemberTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/member-detail/member-detail?id=' + id })
  },

  formatHours(minutes) {
    if (minutes < 60) return minutes + '分钟'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? h + '小时' + m + '分' : h + '小时'
  }
})
