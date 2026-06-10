function getStructuredContent(data) {
  const result = data && (data.result || data)
  return (result && result.structuredContent) || {}
}

const CARD_COLORS = [
  { bg: '#2F9AF5', border: '#1478D4', text: '#FFFFFF' },
  { bg: '#39A65A', border: '#1F7D3B', text: '#FFFFFF' },
  { bg: '#F5C037', border: '#D29413', text: '#1B2544' },
  { bg: '#15B5C6', border: '#07899A', text: '#FFFFFF' },
  { bg: '#8D48DD', border: '#6E2DBB', text: '#FFFFFF' },
  { bg: '#FF8A1F', border: '#D96500', text: '#27180A' },
  { bg: '#F05A7A', border: '#C83B5A', text: '#FFFFFF' },
  { bg: '#6078EA', border: '#3D55C6', text: '#FFFFFF' }
]

const MAX_CARDS_PER_DAY = 7

function simpleHash(str) {
  let h = 0
  const value = String(str || '')
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) - h + value.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function getCardStyle(session) {
  const seed = session.memberId || session.memberName || session.id
  const color = CARD_COLORS[simpleHash(seed) % CARD_COLORS.length]
  return 'background-color:' + color.bg + ';color:' + color.text + ';--card-accent:' + color.border
}

function shapeDays(days) {
  const list = (days || []).slice(0, 7)
  return list.map(day => {
    const count = day.count || 0
    const cards = (day.sessions || []).slice(0, MAX_CARDS_PER_DAY).map(session => Object.assign({}, session, {
      cardStyle: getCardStyle(session),
      isDone: session.status === 'completed'
    }))
    return Object.assign({}, day, {
      count,
      weekdayLabel: String(day.weekday || '').replace('周', ''),
      isBusy: count > 0,
      hasCards: cards.length > 0,
      cards,
      moreCount: Math.max(0, count - cards.length)
    })
  })
}

Component({
  data: {
    rangeLabel: '',
    total: 0,
    days: [],
    busyDayCount: 0,
    hiddenCount: 0,
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
        const total = content.total || 0
        const shownCount = days.reduce((sum, day) => sum + day.cards.length, 0)
        this.setData({
          rangeLabel: content.rangeLabel || '',
          total,
          days,
          busyDayCount: days.filter(day => day.isBusy).length,
          hiddenCount: Math.max(0, total - shownCount),
          hasDays: days.some(day => day.isBusy)
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
