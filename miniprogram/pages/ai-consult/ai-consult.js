const storage = require('../../utils/storage')

const SCHOOL_META = [
  { key: 'romana', name: '罗马纳', color: '#B8860B' },
  { key: 'stott', name: '斯多特', color: '#4A90D9' },
  { key: 'polestar', name: '北极星', color: '#5B8C5A' },
  { key: 'basi', name: 'BASI', color: '#C75050' },
]

const LOADING_HINTS = [
  '正在召集四大流派导师...',
  '罗马纳学派分析动作编排...',
  '斯多特学派评估动作质量...',
  '北极星学派考虑功能康复...',
  'BASI 流体运动学派思考...',
  '裁判综合各方意见...',
]

Page({
  data: {
    member: null,
    sessionCount: 0,
    question: '',
    loading: false,
    loadingHint: '',
    done: false,
    schoolList: [],
    judgeText: '',
    conversationId: '',
    followupText: '',
    followupLoading: false,
    followups: [],
  },

  onLoad(options) {
    if (!options.memberId) {
      wx.showToast({ title: '缺少会员信息', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.memberId = options.memberId

    const member = storage.getMemberById(this.memberId)
    if (!member) {
      wx.showToast({ title: '会员不存在', icon: 'none' })
      wx.navigateBack()
      return
    }

    const sessions = storage.getSessionsByMemberId(this.memberId)
    const recentSessions = sessions
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5)
      .map(s => ({
        date: s.date,
        courseType: s.courseType,
        focusAreas: s.focusAreas,
        notes: s.notes,
        trainingItems: s.trainingItems,
        intensity: s.intensity,
      }))

    this.recentSessions = recentSessions

    this.setData({
      member,
      sessionCount: sessions.length,
      schoolList: SCHOOL_META.map(s => ({ ...s, text: '', expanded: false })),
    })
  },

  onQuestionInput(e) {
    this.setData({ question: e.detail.value })
  },

  onStartConsult() {
    if (this.data.loading) return
    this._doConsult()
  },

  async _doConsult() {
    this.setData({ loading: true, done: false, judgeText: '', conversationId: '', followups: [] })
    this._startLoadingHints()

    const memberProfile = {
      name: this.data.member.name,
      tags: this.data.member.tags,
      notes: this.data.member.notes,
    }

    try {
      const res = await this._callCloudFunction('aiConsult', {
        memberId: this.memberId,
        memberProfile,
        recentSessions: this.recentSessions,
        coachQuestion: this.data.question || '',
      })

      if (!res.success) {
        throw new Error(res.error || 'AI 服务暂不可用')
      }

      const { schools, judgeText, conversationId } = res.data
      const schoolList = SCHOOL_META.map(s => ({
        ...s,
        text: schools[s.key] || '',
        expanded: false,
      }))

      this.setData({
        done: true,
        schoolList,
        judgeText: judgeText || '',
        conversationId: conversationId || '',
      })
    } catch (err) {
      wx.showToast({ title: err.message || 'AI 服务暂不可用', icon: 'none', duration: 2500 })
    } finally {
      this.setData({ loading: false })
      this._stopLoadingHints()
    }
  },

  onToggleSchool(e) {
    const key = e.currentTarget.dataset.key
    const schoolList = this.data.schoolList.map(s =>
      s.key === key ? { ...s, expanded: !s.expanded } : s
    )
    this.setData({ schoolList })
  },

  onApplyToSession() {
    const url = '/pages/session/session?memberId=' + this.memberId +
      '&aiSynthesis=' + encodeURIComponent(this.data.judgeText || '')
    wx.navigateTo({ url })
  },

  onFollowupInput(e) {
    this.setData({ followupText: e.detail.value })
  },

  async onSendFollowup() {
    const q = (this.data.followupText || '').trim()
    if (!q || !this.data.conversationId || this.data.followupLoading) return

    this.setData({ followupText: '', followupLoading: true })

    try {
      const res = await this._callCloudFunction('aiFollowup', {
        conversationId: this.data.conversationId,
        question: q,
      })

      if (!res.success) throw new Error(res.error || '追问失败')

      const followups = this.data.followups.concat([{
        question: q,
        answer: res.data.answer || res.data.text || '',
      }])
      this.setData({ followups })
    } catch (err) {
      wx.showToast({ title: err.message || '追问失败', icon: 'none' })
    } finally {
      this.setData({ followupLoading: false })
    }
  },

  _callCloudFunction(name, data) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name,
        data,
        success: (res) => resolve(res.result),
        fail: (err) => reject(err),
      })
    })
  },

  _startLoadingHints() {
    let idx = 0
    this.setData({ loadingHint: LOADING_HINTS[0] })
    this._hintTimer = setInterval(() => {
      idx = (idx + 1) % LOADING_HINTS.length
      this.setData({ loadingHint: LOADING_HINTS[idx] })
    }, 3000)
  },

  _stopLoadingHints() {
    if (this._hintTimer) {
      clearInterval(this._hintTimer)
      this._hintTimer = null
    }
  },

  onUnload() {
    this._stopLoadingHints()
  },
})
