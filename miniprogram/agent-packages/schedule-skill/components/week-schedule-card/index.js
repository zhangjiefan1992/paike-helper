function getStructuredContent(data) {
  const result = data && (data.result || data)
  return (result && result.structuredContent) || {}
}

function shapeDays(days) {
  return (days || [])
    .filter(day => day.count > 0)
    .slice(0, 7)
    .map(day => {
      const sessions = (day.sessions || []).slice(0, 3)
      const moreCount = Math.max(0, (day.count || 0) - sessions.length)
      return Object.assign({}, day, {
        sessions,
        moreCount,
        hasMore: moreCount > 0
      })
    })
}

Component({
  data: {
    rangeLabel: '',
    total: 0,
    days: [],
    hasDays: false
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
        this.setData({
          rangeLabel: content.rangeLabel || '',
          total: content.total || 0,
          days,
          hasDays: days.length > 0
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
