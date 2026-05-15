const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')

Page({
  data: {
    member: null,
    stats: {
      total: 0,
      thisMonth: 0,
      lastDate: '',
      topCourseType: ''
    },
    monthGroups: [],
    expandedRecords: {}
  },

  onLoad(options) {
    if (!options.id) {
      wx.navigateBack()
      return
    }
    this.memberId = options.id
  },

  onShow() {
    const member = storage.getMemberById(this.memberId)
    if (!member) {
      wx.navigateBack()
      return
    }
    this.setData({ member })
    this.loadSessions()
  },

  loadSessions() {
    const sessions = storage.getSessionsByMemberId(this.memberId)
    const stats = this.calcStats(sessions)
    const monthGroups = this.groupByMonth(sessions)
    this.setData({ stats, monthGroups })
  },

  calcStats(sessions) {
    const now = new Date()
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisMonth = sessions.filter(s => s.date.startsWith(thisMonthPrefix)).length

    const typeCount = {}
    sessions.forEach(s => {
      if (s.courseType) {
        typeCount[s.courseType] = (typeCount[s.courseType] || 0) + 1
      }
    })
    let topCourseType = ''
    let maxCount = 0
    for (const [type, count] of Object.entries(typeCount)) {
      if (count > maxCount) {
        maxCount = count
        topCourseType = type
      }
    }

    return {
      total: sessions.length,
      thisMonth,
      lastDate: sessions.length > 0 ? sessions[0].date : '',
      topCourseType: topCourseType || '-'
    }
  },

  groupByMonth(sessions) {
    const groups = {}
    sessions.forEach(s => {
      const monthKey = s.date.substring(0, 7)
      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: dateUtil.getMonthLabel(s.date),
          monthKey,
          collapsed: false,
          records: []
        }
      }
      groups[monthKey].records.push({
        id: s.id,
        date: dateUtil.formatDate(s.date, 'M月D日'),
        weekday: dateUtil.getWeekday(s.date),
        courseType: s.courseType || '',
        location: s.location || '',
        status: s.status || 'scheduled',
        statusText: this.getStatusText(s.status),
        focusAreas: s.focusAreas || [],
        notes: s.notes || '',
        photos: s.photos || [],
        duration: s.duration || 60,
        startTime: s.startTime || ''
      })
    })

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => groups[key])
  },

  getStatusText(status) {
    const map = {
      scheduled: '已排课',
      completed: '已完成',
      cancelled: '已取消',
      noshow: '未到'
    }
    return map[status] || '已排课'
  },

  onEdit() {
    wx.navigateTo({
      url: `/pages/member-edit/member-edit?id=${this.memberId}`
    })
  },

  onToggleMonth(e) {
    const { index } = e.currentTarget.dataset
    const key = `monthGroups[${index}].collapsed`
    this.setData({ [key]: !this.data.monthGroups[index].collapsed })
  },

  onToggleRecord(e) {
    const { id } = e.currentTarget.dataset
    const key = `expandedRecords.${id}`
    this.setData({ [key]: !this.data.expandedRecords[id] })
  },

  onPreviewPhoto(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({ urls, current })
  }
})
