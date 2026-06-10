function getStructuredContent(data) {
  const result = data && (data.result || data)
  return (result && result.structuredContent) || {}
}

function shapeDays(days) {
  const list = (days || []).slice(0, 7)
  const maxCount = Math.max(1, list.reduce((max, day) => Math.max(max, day.count || 0), 0))
  return list.map(day => {
    const count = day.count || 0
    return Object.assign({}, day, {
      count,
      isBusy: count > 0,
      barStyle: 'height:' + Math.max(8, Math.round(count / maxCount * 48)) + 'rpx'
    })
  })
}

function shapeHighlights(days) {
  const sessions = []
  ;(days || []).forEach(day => {
    ;(day.sessions || []).forEach(session => {
      sessions.push(Object.assign({}, session, {
        weekday: day.weekday,
        dayNum: day.dayNum
      }))
    })
  })
  return sessions
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
    .slice(0, 4)
}

Component({
  data: {
    rangeLabel: '',
    total: 0,
    days: [],
    highlights: [],
    busyDayCount: 0,
    hiddenCount: 0,
    hasDays: false,
    hasHighlights: false
  },

  lifetimes: {
    attached() {
      if (!wx.modelContext) return
      const modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      this._resultType = wx.modelContext.NotificationType.Result
      this._resultHandler = data => {
        const content = getStructuredContent(data)
        const days = shapeDays(content.days)
        const highlights = shapeHighlights(content.days)
        const total = content.total || 0
        this.setData({
          rangeLabel: content.rangeLabel || '',
          total,
          days,
          highlights,
          busyDayCount: days.filter(day => day.isBusy).length,
          hiddenCount: Math.max(0, total - highlights.length),
          hasDays: days.some(day => day.isBusy),
          hasHighlights: highlights.length > 0
        })
        if (this._viewCtx && this._viewCtx.setRelatedPage) {
          this._viewCtx.setRelatedPage({ query: '' })
        }
      }
      modelCtx.on(this._resultType, this._resultHandler)
      this._modelCtx = modelCtx
    },

    detached() {
      if (this._modelCtx && this._modelCtx.off && this._resultHandler) {
        this._modelCtx.off(this._resultType, this._resultHandler)
      }
    }
  }
})
