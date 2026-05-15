const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')
const ai = require('../../utils/ai')

Page({
  data: {
    currentDate: '',
    dateLabel: '',
    sessions: [],
    memberMap: {},
    timeSlots: [],
    currentTimeTop: 0,
    showTimeLine: false,
    touchStartX: 0
  },

  onLoad(options) {
    const date = options.date || dateUtil.toDateStr(new Date())
    this.loadDay(date)
  },

  onShow() {
    if (this.data.currentDate) {
      this.loadDay(this.data.currentDate)
    }
  },

  loadDay(dateStr) {
    const config = storage.getConfig()
    const startHour = parseInt(config.workingHours.start.split(':')[0])
    const endHour = parseInt(config.workingHours.end.split(':')[0])
    const timeSlots = []
    for (let h = startHour; h <= endHour; h++) {
      timeSlots.push(String(h).padStart(2, '0') + ':00')
    }

    const sessions = storage.getSessionsByDate(dateStr)
    const members = storage.getMembers()
    const memberMap = {}
    members.forEach(m => { memberMap[m.id] = m })

    const sessionsWithPosition = sessions.map(s => {
      const [h, m] = s.startTime.split(':').map(Number)
      const top = (h - startHour) * 120 + m * 2
      const height = s.duration * 2
      return { ...s, _top: top, _height: Math.max(height, 60) }
    })

    const isToday = dateUtil.isToday(dateStr)
    let currentTimeTop = 0
    if (isToday) {
      const now = new Date()
      currentTimeTop = (now.getHours() - startHour) * 120 + now.getMinutes() * 2
    }

    const weekday = dateUtil.getWeekday(dateStr)
    const d = dateUtil.parseDate(dateStr)
    const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日 ${weekday}`

    this.setData({
      currentDate: dateStr,
      dateLabel,
      sessions: sessionsWithPosition,
      memberMap,
      timeSlots,
      currentTimeTop,
      showTimeLine: isToday,
      _startHour: startHour
    })
  },

  onTouchStart(e) {
    this.setData({ touchStartX: e.touches[0].clientX })
  },

  onTouchEnd(e) {
    const deltaX = e.changedTouches[0].clientX - this.data.touchStartX
    if (Math.abs(deltaX) < 50) return
    const nextDate = dateUtil.addDays(this.data.currentDate, deltaX < 0 ? 1 : -1)
    this.loadDay(nextDate)
  },

  onSessionTap(e) {
    const id = e.detail.id
    const session = storage.getSessionById(id)
    if (session && session.summaryText && !session.summarySent) {
      wx.navigateTo({ url: `/pages/summary/summary?id=${id}` })
    } else {
      wx.navigateTo({ url: `/pages/session/session?id=${id}` })
    }
  },

  onComplete(e) {
    const id = e.detail.id
    storage.updateSessionStatus(id, 'completed')
    wx.showToast({ title: '已标记完成', icon: 'success' })
    wx.vibrateShort({ type: 'medium' })
    this.loadDay(this.data.currentDate)
    const session = storage.getSessionById(id)
    if (session && !session.summaryText) {
      ai.generateSummary(session, storage.getMemberById(session.memberId), id)
        .then(text => {
          storage.updateSessionSummary(id, text)
        })
        .catch(err => console.error('auto generate summary failed:', err))
    }
  },

  onCancel(e) {
    storage.updateSessionStatus(e.detail.id, 'cancelled')
    wx.showToast({ title: '已取消', icon: 'none' })
    wx.vibrateShort({ type: 'light' })
    this.loadDay(this.data.currentDate)
  },

  onSlotTap(e) {
    const time = e.currentTarget.dataset.time
    wx.navigateTo({ url: `/pages/session/session?date=${this.data.currentDate}&time=${time}` })
  },

  onAddSession() {
    wx.navigateTo({ url: `/pages/session/session?date=${this.data.currentDate}` })
  }
})
