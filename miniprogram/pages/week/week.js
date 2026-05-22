const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')
const textImportExport = require('../../utils/textImportExport')

const CATEGORY_MAP = {
  '普拉提': 'pilates',
  '瑜伽': 'yoga',
  '体能训练': 'fitness',
  '拉伸放松': 'fitness',
}

const THEME_CONFIGS = {
  'soft-color': {
    pilates: { bg: '#E8EDFF', border: 'transparent', dot: '#3B52A5', typeColor: '#3B52A5' },
    yoga: { bg: '#FFF0E6', border: 'transparent', dot: '#B85C1F', typeColor: '#B85C1F' },
    fitness: { bg: '#E6F9F0', border: 'transparent', dot: '#1A7A4C', typeColor: '#1A7A4C' },
    group: { bg: '#F3E8FF', border: 'transparent', dot: '#7C3AED', typeColor: '#7C3AED' },
    isGradient: false,
  },
  'candy-gradient': {
    pilates: { bg: 'linear-gradient(135deg, #667EEA, #764BA2)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    yoga: { bg: 'linear-gradient(135deg, #F093FB, #F5576C)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    fitness: { bg: 'linear-gradient(135deg, #4FACFE, #00F2FE)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    group: { bg: 'linear-gradient(135deg, #43E97B, #38F9D7)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    isGradient: true,
  },
  'airy-tint': {
    pilates: { bg: '#F0F4FF', border: '#C7D2FE', dot: '#6366F1', typeColor: '#1E293B' },
    yoga: { bg: '#FFF7ED', border: '#FED7AA', dot: '#F59E0B', typeColor: '#1E293B' },
    fitness: { bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981', typeColor: '#1E293B' },
    group: { bg: '#FAF5FF', border: '#E9D5FF', dot: '#A855F7', typeColor: '#1E293B' },
    isGradient: false,
  },
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function getCategory(courseType) {
  if (!courseType) return 'pilates'
  if (courseType.includes('团课')) return 'group'
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (courseType.includes(key)) return val
  }
  return 'pilates'
}

function buildCardStyle(themeConfig, category) {
  const tc = themeConfig[category] || themeConfig.pilates
  let style = 'background: ' + tc.bg + ';'
  if (tc.border && tc.border !== 'transparent') {
    style += ' border-color: ' + tc.border + ';'
  }
  return style
}

Page({
  data: {
    currentTheme: 'airy-tint',
    weekDays: [],
    dayCards: {},
    stats: { total: 0, completed: 0, memberCount: 0 },
    isEmpty: true,
    todayLabel: '',
    rangeLabel: '',
    scrollTarget: '',
    swipeTransform: '',
    swipeAnimating: false,
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
    this.loadTheme()
    this.loadWeek(this._currentDate || new Date())
  },

  onPullDownRefresh() {
    this.loadTheme()
    this.loadWeek(this._currentDate || new Date())
    wx.stopPullDownRefresh()
  },

  loadTheme() {
    const config = storage.getConfig()
    if (config.weekTheme && THEME_CONFIGS[config.weekTheme]) {
      this.setData({ currentTheme: config.weekTheme })
    }
  },

  loadWeek(date) {
    const week = dateUtil.getWeekRange(date)
    const sessions = storage.getSessionsByDateRange(week.start, week.end)
    const members = storage.getMembers()
    const memberMap = {}
    members.forEach(m => { memberMap[m.id] = m })

    const themeConfig = THEME_CONFIGS[this.data.currentTheme] || THEME_CONFIGS['airy-tint']
    const memberIds = new Set()

    const dayCards = {}
    week.days.forEach(d => { dayCards[d.date] = [] })

    sessions.forEach(s => {
      if (s.status === 'cancelled') return
      const member = memberMap[s.memberId]
      const category = getCategory(s.courseType)
      const tc = themeConfig[category] || themeConfig.pilates

      if (s.memberId) memberIds.add(s.memberId)
      if (s.memberIds) s.memberIds.forEach(id => memberIds.add(id))

      if (dayCards[s.date]) {
        dayCards[s.date].push({
          id: s.id,
          startTime: s.startTime,
          duration: s.duration || 60,
          courseType: s.courseType || '课程',
          displayName: member ? member.name : (s.classMode === 'group' ? (s.memberIds ? s.memberIds.length + '人' : '') : ''),
          location: s.location || '',
          status: s.status || 'scheduled',
          category,
          dotColor: tc.dot,
          done: s.status === 'completed',
          cardStyle: buildCardStyle(themeConfig, category),
        })
      }
    })

    Object.values(dayCards).forEach(arr => {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    })

    let completed = 0
    sessions.forEach(s => { if (s.status === 'completed') completed++ })

    const now = new Date()
    const todayLabel = (now.getMonth() + 1) + '月' + now.getDate() + '日'
    const s = week.days[0], e = week.days[6]
    const rangeLabel = parseInt(s.date.slice(5, 7)) + '月' + s.dayNum + '日 – ' + parseInt(e.date.slice(5, 7)) + '月' + e.dayNum + '日'

    const todayStr = dateUtil.toDateStr(now)
    let scrollTarget = ''
    week.days.forEach(d => {
      if (d.date === todayStr) scrollTarget = 'day-' + d.date
    })

    this._currentDate = date
    this._weekDays = week.days
    this.setData({
      weekDays: week.days,
      dayCards,
      stats: { total: sessions.length, completed, memberCount: memberIds.size },
      isEmpty: sessions.length === 0,
      todayLabel,
      rangeLabel,
      scrollTarget,
    })
  },

  goToday() {
    this._currentDate = new Date()
    this.loadWeek(this._currentDate)
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

  onCardLongPress(e) {
    const id = e.currentTarget.dataset.id
    const session = storage.getSessionById(id)
    if (!session) return
    const items = []
    if (session.status !== 'completed') items.push('标记已完成')
    if (session.status !== 'cancelled') items.push('标记取消')
    if (session.status !== 'scheduled') items.push('恢复待上课')
    items.push('复制到下周同时段')
    items.push('编辑课程')
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const action = items[res.tapIndex]
        if (action === '标记已完成') {
          storage.updateSessionStatus(id, 'completed')
          wx.showToast({ title: '已标记完成', icon: 'success' })
          wx.vibrateShort({ type: 'medium' })
          // 跳到课程页触发课后速记弹窗
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/session/session?id=' + id + '&quickNote=1' })
          }, 400)
        } else if (action === '标记取消') {
          storage.updateSessionStatus(id, 'cancelled')
          wx.showToast({ title: '已取消', icon: 'none' })
          wx.vibrateShort({ type: 'light' })
        } else if (action === '恢复待上课') {
          storage.updateSessionStatus(id, 'scheduled')
          wx.showToast({ title: '已恢复', icon: 'success' })
          wx.vibrateShort({ type: 'light' })
        } else if (action === '复制到下周同时段') {
          this._copyToNextWeek(id)
        } else if (action === '编辑课程') {
          wx.navigateTo({ url: '/pages/session/session?id=' + id })
          return
        }
        this.loadWeek(this._currentDate || new Date())
      }
    })
  },

  _copyToNextWeek(sessionId) {
    const session = storage.getSessionById(sessionId)
    if (!session) return
    const d = new Date(session.date)
    d.setDate(d.getDate() + 7)
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { generateSessionId } = require('../../utils/idGenerator')
    const newSession = Object.assign({}, session, {
      id: generateSessionId(),
      date: newDate,
      status: 'scheduled',
      summaryText: '',
      summarySent: false,
      photos: [],
      beforePhotos: [],
      afterPhotos: [],
      notes: '',
      voiceSegments: [],
      aiDigest: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    storage.saveSession(newSession)
    wx.showToast({ title: '已复制到 ' + newDate, icon: 'success' })
    wx.vibrateShort({ type: 'medium' })
  },

  onAddSession() {
    wx.navigateTo({ url: '/pages/session/session' })
  },

  // === 滑动切换周 ===

  onSwipeStart(e) {
    if (this.data.showImportModal) return
    this._touchStartX = e.touches[0].clientX
    this._touchStartY = e.touches[0].clientY
    this._touchStartTime = Date.now()
    this._swiping = false
  },

  onSwipeMove(e) {
    if (this.data.showImportModal || this._touchStartX === undefined) return
    const dx = e.touches[0].clientX - this._touchStartX
    const dy = e.touches[0].clientY - this._touchStartY
    if (!this._swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      this._swiping = true
    }
    if (this._swiping) {
      const offset = dx * 0.4
      this.setData({ swipeTransform: 'transform: translateX(' + offset + 'px)' })
    }
  },

  onSwipeEnd(e) {
    if (this.data.showImportModal || this._touchStartX === undefined) return
    const dx = e.changedTouches[0].clientX - this._touchStartX
    const dy = e.changedTouches[0].clientY - this._touchStartY
    const dt = Date.now() - this._touchStartTime
    const absDx = Math.abs(dx)
    const isHorizontal = absDx > Math.abs(dy) * 1.5
    const triggered = isHorizontal && (absDx > 60 || (absDx > 30 && dt < 300))

    if (triggered) {
      const dir = dx > 0 ? -1 : 1
      const sysInfo = wx.getWindowInfo()
      const flyTo = dir > 0 ? -sysInfo.windowWidth : sysInfo.windowWidth
      this.setData({
        swipeAnimating: true,
        swipeTransform: 'transform: translateX(' + (flyTo * 0.3) + 'px)'
      })

      setTimeout(() => {
        if (dir > 0) { this.onNextWeek() } else { this.onPrevWeek() }
        this.setData({
          swipeAnimating: false,
          swipeTransform: 'transform: translateX(' + (-flyTo * 0.3) + 'px)'
        })
        setTimeout(() => {
          this.setData({ swipeAnimating: true, swipeTransform: '' })
          setTimeout(() => {
            this.setData({ swipeAnimating: false })
          }, 250)
        }, 20)
      }, 150)
    } else {
      this.setData({ swipeAnimating: true, swipeTransform: '' })
      setTimeout(() => {
        this.setData({ swipeAnimating: false })
      }, 250)
    }

    this._touchStartX = undefined
    this._swiping = false
  },

  // === 数据清理 ===

  onWeekLongPress() {
    const days = this._weekDays
    if (!days) return
    wx.showActionSheet({
      itemList: ['清除本周全部课程'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认清除',
            content: '将删除本周全部课程，不可恢复',
            success: (res) => {
              if (res.confirm) {
                days.forEach(d => { storage.deleteSessionsByDate(d.date) })
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
})
