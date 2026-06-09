function getStructuredContent(data) {
  const result = data && (data.result || data)
  return (result && result.structuredContent) || {}
}

Component({
  data: {
    action: '',
    targetStatus: '',
    targetStatusLabel: '',
    updatedSession: null,
    candidates: [],
    hasCandidates: false
  },

  lifetimes: {
    attached() {
      if (!wx.modelContext) return
      this._modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      this._resultType = wx.modelContext.NotificationType.Result
      this._resultHandler = data => {
        const content = getStructuredContent(data)
        const candidates = (content.candidates || []).slice(0, 5)
        this.setData({
          action: content.action || '',
          targetStatus: content.targetStatus || '',
          targetStatusLabel: content.targetStatusLabel || '',
          updatedSession: content.updatedSession || null,
          candidates,
          hasCandidates: candidates.length > 0
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
    onCandidateTap(e) {
      const id = e.currentTarget.dataset.id
      if (!id || !this.data.targetStatus || !this._modelCtx) return
      this._modelCtx.sendFollowUpMessage({
        content: [
          { type: 'text', text: '修改这节课状态' },
          {
            type: 'api/call',
            data: {
              name: 'updateSessionStatus',
              arguments: { sessionId: id, status: this.data.targetStatus }
            }
          }
        ]
      })
    }
  }
})
