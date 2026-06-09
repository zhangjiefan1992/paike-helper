const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')
const textImportExport = require('../../utils/textImportExport')
const themeUtil = require('../../utils/theme')

const MEMBER_COLORS = {
  'soft-color': [
    { bg: '#C85F3F', border: '#8F3A25', text: '#FFFFFF' },
    { bg: '#6F8A63', border: '#4E6844', text: '#FFFFFF' },
    { bg: '#D6A53A', border: '#9E7420', text: '#2B2118' },
    { bg: '#8B5E4A', border: '#5E3F31', text: '#FFFFFF' },
    { bg: '#7E4E5F', border: '#5A3241', text: '#FFFFFF' },
    { bg: '#527A75', border: '#365A56', text: '#FFFFFF' },
    { bg: '#D9B08C', border: '#A87956', text: '#2F2118' },
    { bg: '#A93D4F', border: '#762636', text: '#FFFFFF' }
  ],
  'class-plan': [
    { bg: '#2F9AF5', border: '#1478D4', text: '#FFFFFF' },
    { bg: '#39A65A', border: '#1F7D3B', text: '#FFFFFF' },
    { bg: '#F5C037', border: '#D29413', text: '#1B2544' },
    { bg: '#15B5C6', border: '#07899A', text: '#FFFFFF' },
    { bg: '#8D48DD', border: '#6E2DBB', text: '#FFFFFF' },
    { bg: '#FF8A1F', border: '#D96500', text: '#27180A' },
    { bg: '#F05A7A', border: '#C83B5A', text: '#FFFFFF' },
    { bg: '#6078EA', border: '#3D55C6', text: '#FFFFFF' }
  ]
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function getMemberColor(memberId, theme) {
  const palette = MEMBER_COLORS[theme] || MEMBER_COLORS['soft-color']
  return palette[simpleHash(memberId || '') % 8]
}

function getCourseAbbr(courseType) {
  if (!courseType) return ''
  const isGroup = courseType.includes('团')
  const suffix = isGroup ? '团' : '私'
  const name = courseType.replace(/私教|团课|课程/g, '')
  return (name.length >= 2 ? name.slice(0, 1) : name) + suffix
}

const TIME_PERIODS = [
  { key: 'morning', label: '上午', range: '07:00-12:00', startMin: 7 * 60, endMin: 12 * 60, seedTime: '09:00', weight: 5 },
  { key: 'noon', label: '中午', range: '12:00-14:00', startMin: 12 * 60, endMin: 14 * 60, seedTime: '12:00', weight: 2 },
  { key: 'afternoon', label: '下午', range: '14:00-18:00', startMin: 14 * 60, endMin: 18 * 60, seedTime: '15:00', weight: 4 },
  { key: 'evening', label: '晚上', range: '18:00-22:00', startMin: 18 * 60, endMin: 22 * 60, seedTime: '19:00', weight: 4 }
]

function parseTimeToMin(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return 480
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return 480
  return h * 60 + (m || 0)
}

function formatHourRange(startMin, endMin) {
  const startH = Math.floor(startMin / 60)
  const endH = Math.ceil(endMin / 60)
  return String(startH).padStart(2, '0') + ':00-' + String(endH).padStart(2, '0') + ':00'
}

function getDynamicPeriods(sessions) {
  let morningStart = TIME_PERIODS[0].startMin
  let eveningEnd = TIME_PERIODS[3].endMin

  sessions.forEach(s => {
    if (s.status === 'cancelled') return
    const startMin = parseTimeToMin(s.startTime)
    const endMin = startMin + (s.duration || 60)
    if (startMin < morningStart) {
      morningStart = Math.max(0, Math.floor(startMin / 60) * 60)
    }
    if (endMin > eveningEnd) {
      eveningEnd = Math.min(24 * 60, Math.ceil(endMin / 60) * 60)
    }
  })

  return TIME_PERIODS.map(period => {
    const p = Object.assign({}, period)
    if (p.key === 'morning') {
      p.startMin = morningStart
      p.range = formatHourRange(p.startMin, p.endMin)
      p.weight = Math.max(2, (p.endMin - p.startMin) / 60)
      p.seedTime = p.startMin <= 6 * 60 ? '06:00' : '09:00'
    } else if (p.key === 'evening') {
      p.endMin = eveningEnd
      p.range = formatHourRange(p.startMin, p.endMin)
      p.weight = Math.max(2, (p.endMin - p.startMin) / 60)
    }
    return p
  })
}

function getPeriodIndex(startTime, periods) {
  const min = parseTimeToMin(startTime)
  const list = periods || TIME_PERIODS
  const idx = list.findIndex(p => min >= p.startMin && min < p.endMin)
  if (idx >= 0) return idx
  return min < list[0].startMin ? 0 : list.length - 1
}

function getDensityConfig(density) {
  if (density === 'minimal') {
    return { cardH: 56, gap: 6, emptyRowH: 88, rowPad: 12, minCardH: 50, minGap: 5, minEmptyRowH: 76, minRowPad: 8 }
  }
  if (density === 'detailed') {
    return { cardH: 88, gap: 8, emptyRowH: 118, rowPad: 14, minCardH: 60, minGap: 5, minEmptyRowH: 82, minRowPad: 8 }
  }
  return { cardH: 74, gap: 7, emptyRowH: 104, rowPad: 14, minCardH: 54, minGap: 5, minEmptyRowH: 78, minRowPad: 8 }
}

function getCardDisplayMode(density, cardH) {
  if (density === 'minimal') return 'minimal'
  if (density === 'detailed') {
    if (cardH >= 82) return 'detailed'
    if (cardH >= 66) return 'standard'
    return 'minimal'
  }
  return cardH >= 66 ? 'standard' : 'minimal'
}

function getCardMetaLabel(card, displayMode) {
  if (displayMode === 'minimal') return ''
  const parts = []
  if (card.line2) parts.push(card.line2)
  if (displayMode === 'detailed' && card.location) parts.push(card.location)
  return parts.join(' · ')
}

function applyCardDensity(cpRows, density, densityConfig) {
  const displayMode = getCardDisplayMode(density, densityConfig.cardH)
  cpRows.forEach(row => {
    row.cells.forEach(cell => {
      cell.cards.forEach(card => {
        card.displayMode = displayMode
        card.metaLabel = getCardMetaLabel(card, displayMode)
      })
    })
  })
}

function getBoardBodyHeightRpx() {
  const wInfo = wx.getWindowInfo()
  const rpxRatio = 750 / wInfo.windowWidth
  const safeBottom = wInfo.safeArea ? (wInfo.screenHeight - wInfo.safeArea.bottom) * rpxRatio : 0
  const headerH = 178
  const gridHeadH = 76
  const toolbarH = 150 + safeBottom
  return Math.max(360, Math.round(wInfo.windowHeight * rpxRatio - headerH - gridHeadH - toolbarH))
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num))
}

function layoutCardsByTime(row, densityConfig) {
  const period = row.period
  if (!period) return

  const pad = densityConfig.rowPad
  const cardH = densityConfig.cardH
  const gap = densityConfig.gap
  const maxTop = Math.max(pad, row.rowHeightRpx - pad - cardH)
  const availableTop = Math.max(1, maxTop - pad)
  const periodDuration = Math.max(1, period.endMin - period.startMin)

  row.cells.forEach(cell => {
    if (!cell.cards.length) return

    cell.cards.forEach(card => {
      const startMin = clamp(parseTimeToMin(card.startTime), period.startMin, period.endMin)
      const ratio = (startMin - period.startMin) / periodDuration
      card.topRpx = Math.round(pad + ratio * availableTop)
    })

    cell.cards.sort((a, b) => {
      if (a.topRpx === b.topRpx) return a.startTime.localeCompare(b.startTime)
      return a.topRpx - b.topRpx
    })

    for (let i = 1; i < cell.cards.length; i++) {
      const prev = cell.cards[i - 1]
      const current = cell.cards[i]
      current.topRpx = Math.max(current.topRpx, prev.topRpx + cardH + gap)
    }

    const last = cell.cards[cell.cards.length - 1]
    if (last.topRpx > maxTop) {
      const overflow = last.topRpx - maxTop
      cell.cards.forEach(card => {
        card.topRpx = card.topRpx - overflow
      })
    }

    const first = cell.cards[0]
    const lastAfterShift = cell.cards[cell.cards.length - 1]
    if (first.topRpx < pad || lastAfterShift.topRpx > maxTop) {
      cell.cards.forEach((card, idx) => {
        card.topRpx = pad + idx * (cardH + gap)
      })
    }
  })
}

function updateRowsForDensity(cpRows, densityConfig) {
  cpRows.forEach(row => {
    let maxCards = 0
    row.cells.forEach(cell => {
      cell.cards.sort((a, b) => a.startTime.localeCompare(b.startTime))
      cell.cards.forEach(card => { card.cardH = densityConfig.cardH })
      maxCards = Math.max(maxCards, cell.cards.length)
    })
    if (maxCards === 0) {
      row.minHeightRpx = densityConfig.emptyRowH
    } else {
      row.minHeightRpx = Math.max(
        densityConfig.emptyRowH,
        densityConfig.rowPad * 2 + maxCards * densityConfig.cardH + (maxCards - 1) * densityConfig.gap
      )
    }
  })
  return cpRows.reduce((sum, row) => sum + row.minHeightRpx, 0)
}

Page({
  data: {
    currentView: 'week',
    currentTheme: 'airy-tint',
    weekDensity: 'standard',
    weekDays: [],
    dayCards: {},
    cpRows: [],
    stats: { total: 0, completed: 0, memberCount: 0 },
    isEmpty: true,
    todayLabel: '',
    rangeLabel: '',
    monthDays: [],
    monthStats: { total: 0, completed: 0, memberCount: 0 },
    monthLabel: '',
    monthIsEmpty: true,
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
    this.loadConfig()
    this._reload()
  },

  onPullDownRefresh() {
    this.loadConfig()
    this._reload()
    wx.stopPullDownRefresh()
  },

  _reload() {
    const d = this._currentDate || new Date()
    if (this.data.currentView === 'month') {
      this.loadMonth(d)
    } else {
      this.loadWeek(d)
    }
  },

  loadConfig() {
    const config = storage.getConfig()
    const savedTheme = themeUtil.applyAppTheme(config)
    const theme = savedTheme && MEMBER_COLORS[savedTheme] ? savedTheme : 'soft-color'
    const density = config.weekDensity || 'standard'
    this.setData({ currentTheme: theme, weekDensity: density })
  },

  loadWeek(date) {
    const week = dateUtil.getWeekRange(date)
    const sessions = storage.getSessionsByDateRange(week.start, week.end)
    const members = storage.getMembers()
    const memberMap = {}
    members.forEach(m => { memberMap[m.id] = m })

    const theme = this.data.currentTheme
    const density = this.data.weekDensity
    let densityConfig = getDensityConfig(density)
    const memberIds = new Set()
    const periods = getDynamicPeriods(sessions)

    const dayCards = {}
    week.days.forEach(d => { dayCards[d.date] = [] })

    const cpRows = periods.map(period => ({
      key: period.key,
      label: period.label,
      range: period.range,
      seedTime: period.seedTime,
      weight: period.weight,
      period,
      rowHeightRpx: densityConfig.emptyRowH,
      minHeightRpx: densityConfig.emptyRowH,
      hasCourse: false,
      cells: week.days.map(d => ({
        date: d.date,
        periodKey: period.key,
        seedTime: period.seedTime,
        isToday: d.isToday,
        cards: []
      }))
    }))

    sessions.forEach(s => {
      if (s.status === 'cancelled') return
      const member = memberMap[s.memberId]
      const colorSeed = s.memberId || (s.memberIds || []).join('-') || s.courseType || s.id
      const color = getMemberColor(colorSeed, theme)

      if (s.memberId) memberIds.add(s.memberId)
      if (s.memberIds) s.memberIds.forEach(id => memberIds.add(id))

      const memberName = member ? member.name : (s.classMode === 'group' ? ((s.memberIds || []).length || '') + '人团课' : '未选会员')
      const line2 = getCourseAbbr(s.courseType)

      const cardStyle = '--card-accent:' + color.border + ';background-color:' + color.bg + ';'

      if (dayCards[s.date]) {
        const card = {
          id: s.id,
          startTime: s.startTime,
          duration: s.duration,
          memberName,
          line2,
          courseLabel: s.courseType || '课程',
          metaLabel: '',
          location: s.location || '',
          done: s.status === 'completed',
          cardStyle,
          textColor: color.text,
          displayMode: density,
          cardH: densityConfig.cardH
        }
        dayCards[s.date].push(card)

        const periodIndex = getPeriodIndex(s.startTime, periods)
        const dayIndex = week.days.findIndex(d => d.date === s.date)
        if (dayIndex >= 0) {
          cpRows[periodIndex].hasCourse = true
          cpRows[periodIndex].cells[dayIndex].cards.push(card)
        }
      }
    })

    Object.values(dayCards).forEach(arr => {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
    const boardBodyH = getBoardBodyHeightRpx()
    let minTotalH = updateRowsForDensity(cpRows, densityConfig)
    if (minTotalH > boardBodyH) {
      const scale = clamp(boardBodyH / minTotalH, 0.58, 0.95)
      densityConfig = {
        cardH: Math.max(densityConfig.minCardH, Math.floor(densityConfig.cardH * scale)),
        gap: Math.max(densityConfig.minGap, Math.floor(densityConfig.gap * scale)),
        emptyRowH: Math.max(densityConfig.minEmptyRowH, Math.floor(densityConfig.emptyRowH * scale)),
        rowPad: Math.max(densityConfig.minRowPad, Math.floor(densityConfig.rowPad * scale)),
        minCardH: densityConfig.minCardH,
        minGap: densityConfig.minGap,
        minEmptyRowH: densityConfig.minEmptyRowH,
        minRowPad: densityConfig.minRowPad
      }
      minTotalH = updateRowsForDensity(cpRows, densityConfig)
    }

    if (minTotalH > boardBodyH) {
      const scale = boardBodyH / minTotalH
      let usedH = 0
      cpRows.forEach((row, idx) => {
        const h = idx === cpRows.length - 1
          ? boardBodyH - usedH
          : Math.max(58, Math.floor(row.minHeightRpx * scale))
        usedH += h
        row.rowHeightRpx = h
      })
    } else if (minTotalH === boardBodyH) {
      cpRows.forEach(row => { row.rowHeightRpx = row.minHeightRpx })
    } else {
      const extraH = boardBodyH - minTotalH
      const weightTotal = cpRows.reduce((sum, row) => sum + row.weight, 0)
      let usedExtra = 0
      cpRows.forEach((row, idx) => {
        const extra = idx === cpRows.length - 1
          ? extraH - usedExtra
          : Math.round(extraH * row.weight / weightTotal)
        usedExtra += extra
        row.rowHeightRpx = row.minHeightRpx + extra
      })
    }
    applyCardDensity(cpRows, density, densityConfig)
    cpRows.forEach(row => layoutCardsByTime(row, densityConfig))

    let completed = 0
    sessions.forEach(s => { if (s.status === 'completed') completed++ })

    const now = new Date()
    const todayLabel = (now.getMonth() + 1) + '月' + now.getDate() + '日'
    const s = week.days[0], e = week.days[6]
    const rangeLabel = parseInt(s.date.slice(5, 7)) + '月' + s.dayNum + '日 – ' + parseInt(e.date.slice(5, 7)) + '月' + e.dayNum + '日'

    this._currentDate = date
    this._weekDays = week.days
    this.setData({
      weekDays: week.days,
      dayCards,
      cpRows,
      stats: { total: sessions.length, completed, memberCount: memberIds.size },
      isEmpty: sessions.length === 0,
      todayLabel,
      rangeLabel,
    })
  },

  goToday() {
    this._currentDate = new Date()
    this._reload()
  },

  onToggleEarly() {
    this._reload()
  },

  onSwitchView(e) {
    const view = e.currentTarget.dataset.view
    if (view === this.data.currentView) return
    this.setData({ currentView: view })
    wx.vibrateShort({ type: 'light' })
    this._reload()
  },

  // === 月视图 ===

  loadMonth(date) {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = d.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    const startDow = (firstDay.getDay() + 6) % 7
    const todayStr = dateUtil.toDateStr(new Date())

    const range = dateUtil.getMonthRange(date)
    const sessions = storage.getSessionsByDateRange(range.start, range.end)
    const theme = this.data.currentTheme

    const dayCounts = {}
    const dayColors = {}
    const memberIds = new Set()
    let completed = 0
    sessions.forEach(s => {
      if (s.status === 'cancelled') return
      const dayNum = parseInt(s.date.slice(8, 10), 10)
      dayCounts[dayNum] = (dayCounts[dayNum] || 0) + 1
      if (!dayColors[dayNum]) dayColors[dayNum] = []
      if (dayColors[dayNum].length < 3) {
        const c = getMemberColor(s.memberId, theme)
        dayColors[dayNum].push(c.bg)
      }
      if (s.memberId) memberIds.add(s.memberId)
      if (s.memberIds) s.memberIds.forEach(id => memberIds.add(id))
      if (s.status === 'completed') completed++
    })

    const monthDays = []

    const prevMonth = new Date(year, month, 0)
    const prevDays = prevMonth.getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const day = prevDays - i
      const pd = new Date(year, month - 1, day)
      monthDays.push({ day, date: dateUtil.toDateStr(pd), isToday: false, isOutside: true, dots: [], count: 0 })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = dateUtil.toDateStr(new Date(year, month, day))
      const count = dayCounts[day] || 0
      const dots = (dayColors[day] || []).map(bg => ({ bg }))
      monthDays.push({ day, date: dateStr, isToday: dateStr === todayStr, isOutside: false, dots, count })
    }

    const totalCells = startDow + daysInMonth
    const remaining = (7 - (totalCells % 7)) % 7
    for (let day = 1; day <= remaining; day++) {
      const nd = new Date(year, month + 1, day)
      monthDays.push({ day, date: dateUtil.toDateStr(nd), isToday: false, isOutside: true, dots: [], count: 0 })
    }

    const monthLabel = year + '年' + (month + 1) + '月'
    const now = new Date()
    const todayLabel = (now.getMonth() + 1) + '月' + now.getDate() + '日'

    this._currentDate = date
    this.setData({
      monthDays,
      monthLabel,
      monthIsEmpty: sessions.length === 0,
      monthStats: { total: sessions.length, completed, memberCount: memberIds.size },
      rangeLabel: monthLabel,
      todayLabel,
    })
  },

  onPrevMonth() {
    const d = new Date(this._currentDate)
    d.setMonth(d.getMonth() - 1, 1)
    this.loadMonth(d)
  },

  onNextMonth() {
    const d = new Date(this._currentDate)
    d.setMonth(d.getMonth() + 1, 1)
    this.loadMonth(d)
  },

  onMonthCellTap(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    wx.navigateTo({ url: '/pages/day/day?date=' + date })
  },

  onPrev() {
    if (this.data.currentView === 'month') this.onPrevMonth()
    else this.onPrevWeek()
  },

  onNext() {
    if (this.data.currentView === 'month') this.onNextMonth()
    else this.onNextWeek()
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
    const time = e.currentTarget.dataset.time
    const query = time ? ('?date=' + date + '&time=' + time) : ('?date=' + date)
    wx.navigateTo({ url: '/pages/session/session' + query })
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
        this._reload()
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
        if (dir > 0) { this.onNext() } else { this.onPrev() }
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
                this._reload()
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
    this._reload()
  },

  onShareAppMessage() {
    return {
      title: '排课助手 · 轻松管理你的私教课程',
      path: '/pages/week/week',
    }
  },

  onShareTimeline() {
    return {
      title: '排课助手 · 轻松管理你的私教课程',
    }
  },
})
