const DEFAULT_SUMMARY = {
  total: 0,
  completed: 0,
  cancelled: 0,
  noshow: 0,
  totalHoursText: '0分钟',
  privateCnt: 0,
  groupCnt: 0,
  activeMemberCount: 0,
  diffText: '0'
}

function getStructuredContent(data) {
  const result = data && (data.result || data)
  return (result && result.structuredContent) || {}
}

Component({
  data: {
    rangeLabel: '',
    summary: DEFAULT_SUMMARY,
    courseTypes: [],
    hasCourseTypes: false
  },

  lifetimes: {
    attached() {
      if (!wx.modelContext) return
      const modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      this._resultType = wx.modelContext.NotificationType.Result
      this._resultHandler = data => {
        const content = getStructuredContent(data)
        const courseTypes = (content.courseTypes || []).slice(0, 4)
        this.setData({
          rangeLabel: content.rangeLabel || '',
          summary: Object.assign({}, DEFAULT_SUMMARY, content.summary || {}),
          courseTypes,
          hasCourseTypes: courseTypes.length > 0
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
