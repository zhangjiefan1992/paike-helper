const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')
const textImportExport = require('../../utils/textImportExport')

const TIME_PERIODS = [
  { name: '上午', range: '7:00-12:00', startMin: 0, endMin: 720 },
  { name: '中午', range: '12:00-14:00', startMin: 720, endMin: 840 },
  { name: '下午', range: '14:00-18:00', startMin: 840, endMin: 1080 },
  { name: '晚上', range: '18:00-22:00', startMin: 1080, endMin: 1440 }
]

const CARD_COLORS = [
  '#4A7C59', '#7E9F7A', '#A8B8A0', '#C2A882', '#B8A898', '#9EABA2',
  '#80CBC4', '#F48FB1', '#AED581', '#FFB74D'
]

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

Page({
  data: {
    currentWeek: null,
    grid: [],
    stats: { total: 0, completed: 0, cancelled: 0 },
    isEmpty: true,
    showImportModal: false,
    importText: '',
    importStep: 1,
    importParsedGroups: [],
    importSkippedCount: 0,
    importErrorCount: 0,
    importCheckedCount: 0,
    importTotalCount: 0,
    importClearExisting: false
  },

  onShow() {
    this.loadWeek(this._currentDate || new Date())
  },

  loadWeek(date) {
    const currentWeek = dateUtil.getWeekRange(date)
    const sessions = storage.getSessionsByDateRange(currentWeek.start, currentWeek.end)
    const members = storage.getMembers()
    const memberMap = {}
    members.forEach(m => { memberMap[m.id] = m })

    const courseTypes = []
    sessions.forEach(s => {
      if (s.courseType && courseTypes.indexOf(s.courseType) === -1) courseTypes.push(s.courseType)
    })
    const colorMap = {}
    courseTypes.forEach((t, i) => { colorMap[t] = CARD_COLORS[i % CARD_COLORS.length] })

    const days = currentWeek.days.map(d => ({
      ...d,
      monthDay: parseInt(d.date.substring(5, 7)) + '月' + parseInt(d.date.substring(8)) + '日'
    }))

    const grid = TIME_PERIODS.map(p => {
      const slots = {}
      days.forEach(d => { slots[d.date] = [] })
      return { name: p.name, range: p.range, startMin: p.startMin, endMin: p.endMin, slots }
    })

    sessions.forEach(s => {
      if (s.status === 'cancelled') return
      const sMin = this.timeToMin(s.startTime)
      const period = grid.find(g => sMin >= g.startMin && sMin < g.endMin)
      if (period && period.slots[s.date]) {
        const member = memberMap[s.memberId]
        period.slots[s.date].push({
          id: s.id,
          startTime: s.startTime,
          endTime: this.calcEndTime(s.startTime, s.duration || 60),
          courseType: s.courseType || '',
          location: s.location || '',
          displayName: member ? member.name : (s.classMode === 'group' ? '团课' : ''),
          cardColor: colorMap[s.courseType] || '#90A4AE',
          status: s.status
        })
      }
    })

    grid.forEach(g => {
      Object.keys(g.slots).forEach(dt => {
        g.slots[dt].sort((a, b) => a.startTime.localeCompare(b.startTime))
      })
    })

    let total = 0, completed = 0, cancelled = 0
    sessions.forEach(s => {
      total++
      if (s.status === 'completed') completed++
      if (s.status === 'cancelled') cancelled++
    })

    this._currentDate = date
    this.setData({
      currentWeek: { ...currentWeek, days },
      grid,
      stats: { total, completed, cancelled },
      isEmpty: total === 0
    })
  },

  timeToMin(time) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  },

  calcEndTime(startTime, duration) {
    const totalMin = this.timeToMin(startTime) + duration
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
  },

  onPrevWeek() {
    const d = new Date(this._currentDate)
    d.setDate(d.getDate() - 7)
    this.loadWeek(d)
  },

  onNextWeek() {
    const d = new Date(this._currentDate)
    d.setDate(d.getDate() + 7)
    this.loadWeek(d)
  },

  onDayTap(e) {
    const date = e.currentTarget.dataset.date
    wx.navigateTo({ url: '/pages/day/day?date=' + date })
  },

  onCellTap(e) {
    const date = e.currentTarget.dataset.date
    wx.navigateTo({ url: '/pages/session/session?date=' + date })
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id
    const session = storage.getSessionById(id)
    if (session && session.summaryText && !session.summarySent) {
      wx.navigateTo({ url: '/pages/summary/summary?id=' + id })
    } else {
      wx.navigateTo({ url: '/pages/session/session?id=' + id })
    }
  },

  onGoStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  },

  onShareSchedule() {
    wx.showModal({
      title: '分享课表',
      content: '请截屏保存当前课表，即可分享给好友或发朋友圈',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // === 文本导入（两步流程）===

  onTextImport() {
    this.setData({
      showImportModal: true,
      importStep: 1,
      importText: '',
      importParsedGroups: [],
      importCheckedCount: 0,
      importTotalCount: 0,
      importClearExisting: false
    })
  },

  onImportInput(e) {
    this.setData({ importText: e.detail.value })
  },

  onImportClose() {
    this.setData({ showImportModal: false })
  },

  onImportParse() {
    const text = this.data.importText
    if (!text || !text.trim()) {
      wx.showToast({ title: '请输入课程文本', icon: 'none' })
      return
    }

    const { results, skipped, errors } = textImportExport.parseTextToSessions(text)

    if (results.length === 0) {
      const msg = errors.length > 0
        ? '解析失败: ' + errors[0].message
        : '未识别到有效课程'
      wx.showToast({ title: msg, icon: 'none' })
      return
    }

    const dateGroups = {}
    const dateOrder = []
    results.forEach(s => {
      if (!dateGroups[s.date]) {
        dateGroups[s.date] = []
        dateOrder.push(s.date)
      }
      dateGroups[s.date].push({ ...s, checked: true })
    })

    dateOrder.sort()
    const importParsedGroups = dateOrder.map(date => {
      const d = dateUtil.parseDate(date)
      const dateLabel = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEKDAYS[d.getDay()]
      const items = dateGroups[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
      items.forEach(item => {
        const parts = [item.startTime, item.courseType]
        if (item._memberName) parts.push(item._memberName)
        if (item.location) parts.push(item.location)
        item.displayText = parts.join(' ')
      })
      return { date, dateLabel, count: items.length, items }
    })

    this.setData({
      importStep: 2,
      importParsedGroups,
      importSkippedCount: skipped.length,
      importErrorCount: errors.length,
      importCheckedCount: results.length,
      importTotalCount: results.length,
      importClearExisting: false
    })
  },

  onImportToggleItem(e) {
    const { gidx, iidx } = e.currentTarget.dataset
    const key = 'importParsedGroups[' + gidx + '].items[' + iidx + '].checked'
    const current = this.data.importParsedGroups[gidx].items[iidx].checked
    this.setData({
      [key]: !current,
      importCheckedCount: this.data.importCheckedCount + (current ? -1 : 1)
    })
  },

  onImportToggleClear() {
    this.setData({ importClearExisting: !this.data.importClearExisting })
  },

  onImportBack() {
    this.setData({ importStep: 1 })
  },

  onImportConfirm() {
    const groups = this.data.importParsedGroups
    const clearExisting = this.data.importClearExisting

    const selected = []
    const affectedDates = new Set()

    groups.forEach(g => {
      g.items.forEach(item => {
        if (item.checked) {
          selected.push(item)
          affectedDates.add(item.date)
        }
      })
    })

    if (selected.length === 0) {
      wx.showToast({ title: '请至少选择一节课程', icon: 'none' })
      return
    }

    if (clearExisting) {
      affectedDates.forEach(date => {
        storage.deleteSessionsByDate(date)
      })
    }

    selected.forEach(item => {
      const session = {}
      const transientKeys = ['checked', 'globalIndex', 'displayText', '_raw', '_lineNum', '_memberName', '_weekday']
      Object.keys(item).forEach(k => {
        if (transientKeys.indexOf(k) === -1) session[k] = item[k]
      })
      storage.saveSession(session)
    })

    this.setData({ showImportModal: false })
    wx.vibrateShort({ type: 'medium' })
    wx.showToast({ title: '成功导入 ' + selected.length + ' 节', icon: 'success' })
    this.loadWeek(this._currentDate || new Date())
  },

  // === 数据清理 ===

  onDayLongPress(e) {
    const date = e.currentTarget.dataset.date
    const d = dateUtil.parseDate(date)
    const label = (d.getMonth() + 1) + '月' + d.getDate() + '日'

    wx.showActionSheet({
      itemList: ['清除' + label + '全部课程'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认清除',
            content: '将删除' + label + '的全部课程，不可恢复',
            success: (res) => {
              if (res.confirm) {
                storage.deleteSessionsByDate(date)
                wx.vibrateShort({ type: 'medium' })
                wx.showToast({ title: '已清除', icon: 'success' })
                this.loadWeek(this._currentDate || new Date())
              }
            }
          })
        }
      }
    })
  },

  onWeekLongPress() {
    const week = this.data.currentWeek
    if (!week) return

    wx.showActionSheet({
      itemList: ['清除本周全部课程'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认清除',
            content: '将删除本周全部课程，不可恢复',
            success: (res) => {
              if (res.confirm) {
                week.days.forEach(d => {
                  storage.deleteSessionsByDate(d.date)
                })
                wx.vibrateShort({ type: 'medium' })
                wx.showToast({ title: '已清除', icon: 'success' })
                this.loadWeek(this._currentDate || new Date())
              }
            }
          })
        }
      }
    })
  },

  onAddSession() {
    wx.navigateTo({ url: '/pages/session/session' })
  }
})
