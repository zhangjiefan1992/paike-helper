const storage = require('../../utils/storage')
const ai = require('../../utils/ai')
const cloudPhotos = require('../../utils/cloudPhotos')

Page({
  data: {
    sessionId: '',
    session: null,
    member: null,
    summaryText: '',
    isEditing: false,
    beforePhotos: [],
    afterPhotos: [],
    loading: false,
    sent: false
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '课程不存在', icon: 'none' })
      wx.navigateBack()
      return
    }

    const session = storage.getSessionById(id)
    if (!session) {
      wx.showToast({ title: '课程不存在', icon: 'none' })
      wx.navigateBack()
      return
    }

    const member = session.memberId ? storage.getMemberById(session.memberId) : null

    this.setData({
      sessionId: id,
      session,
      member,
      summaryText: session.summaryText || '',
      beforePhotos: session.beforePhotos || [],
      afterPhotos: session.afterPhotos || [],
      sent: session.summarySent || false
    })

    if (!session.summaryText) {
      this.generateSummary()
    }
  },

  async generateSummary() {
    this.setData({ loading: true })
    try {
      const text = await ai.generateSummary(
        this.data.session,
        this.data.member,
        this.data.sessionId
      )
      this.setData({ summaryText: text, loading: false })
      storage.updateSessionSummary(this.data.sessionId, text)
    } catch (err) {
      console.error('generateSummary failed:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    }
  },

  onEditTap() {
    this.setData({ isEditing: !this.data.isEditing })
  },

  onSummaryInput(e) {
    this.setData({ summaryText: e.detail.value })
  },

  onSaveEdit() {
    this.setData({ isEditing: false })
    storage.updateSessionSummary(this.data.sessionId, this.data.summaryText)
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onChoosePhoto(e) {
    const type = e.currentTarget.dataset.type
    const count = 5 - this.data[type + 'Photos'].length
    if (count <= 0) {
      wx.showToast({ title: '最多5张', icon: 'none' })
      return
    }
    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const key = type + 'Photos'
        const photos = this.data[key].concat(res.tempFilePaths)
        this.setData({ [key]: photos })
        storage.updateSessionPhotos(this.data.sessionId, type, photos)

        cloudPhotos.uploadPhotos(res.tempFilePaths, this.data.sessionId, type).then(fileIDs => {
          const cloudKey = type + 'PhotoIDs'
          const existing = this.data[cloudKey] || []
          this.setData({ [cloudKey]: existing.concat(fileIDs) })
        }).catch(err => {
          console.error('upload photos failed:', err)
        })
      }
    })
  },

  onRemovePhoto(e) {
    const type = e.currentTarget.dataset.type
    const index = e.currentTarget.dataset.index
    const key = type + 'Photos'
    const photos = this.data[key].filter((_, i) => i !== index)
    this.setData({ [key]: photos })
    storage.updateSessionPhotos(this.data.sessionId, type, photos)
  },

  onShare() {
    this.setData({ sent: true })
    storage.markSummarySent(this.data.sessionId)
    wx.vibrateShort({ type: 'light' })
    setTimeout(() => {
      wx.navigateBack()
    }, 600)
  },

  onShareAppMessage() {
    return {
      title: `${this.data.member ? this.data.member.name + '的' : ''}${this.data.session.courseType || ''}课后总结`,
      path: `/pages/summary/summary?id=${this.data.sessionId}`
    }
  }
})
