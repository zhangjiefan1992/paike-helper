function getStructuredContent(data) {
  const result = data && (data.result || data)
  return (result && result.structuredContent) || {}
}

Component({
  data: {
    previewToken: '',
    importableCount: 0,
    skippedCount: 0,
    errorCount: 0,
    clearExisting: false,
    sessions: [],
    omittedCount: 0,
    hasIssues: false
  },

  lifetimes: {
    attached() {
      if (!wx.modelContext) return
      this._modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      this._resultType = wx.modelContext.NotificationType.Result
      this._resultHandler = data => {
        const content = getStructuredContent(data)
        const sessions = content.sessions || []
        const visibleSessions = sessions.slice(0, 6)
        this.setData({
          previewToken: content.previewToken || '',
          importableCount: content.importableCount || 0,
          skippedCount: content.skippedCount || 0,
          errorCount: content.errorCount || 0,
          clearExisting: !!content.clearExisting,
          sessions: visibleSessions,
          omittedCount: Math.max(0, sessions.length - visibleSessions.length),
          hasIssues: !!(content.skippedCount || content.errorCount)
        })
        if (this._viewCtx && this._viewCtx.setRelatedPage) {
          this._viewCtx.setRelatedPage({ query: '' })
        }
      }
      this._modelCtx.on(this._resultType, this._resultHandler)
    },

    detached() {
      if (this._modelCtx && this._modelCtx.off && this._resultHandler) {
        this._modelCtx.off(this._resultType, this._resultHandler)
      }
    }
  },

  methods: {
    onConfirm() {
      if (!this.data.previewToken || !this._modelCtx) return
      this._modelCtx.sendFollowUpMessage({
        content: [
          { type: 'text', text: '我确认导入这批课表' },
          {
            type: 'api/call',
            data: {
              name: 'commitImportSchedule',
              arguments: { previewToken: this.data.previewToken }
            }
          }
        ]
      })
    },

    onCancel() {
      if (!this._modelCtx) return
      this._modelCtx.sendFollowUpMessage({
        content: [{ type: 'text', text: '取消导入这批课表' }]
      })
    }
  }
})
