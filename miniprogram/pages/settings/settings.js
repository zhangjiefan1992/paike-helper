const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')
const textImportExport = require('../../utils/textImportExport')
const cloudBackup = require('../../utils/cloudBackup')
const themeUtil = require('../../utils/theme')

function fmtBackupTime(ts) {
  if (!ts) return '从未备份'
  const d = new Date(ts)
  const now = new Date()
  const diffSec = Math.round((now - d) / 1000)
  if (diffSec < 60) return '刚刚'
  if (diffSec < 3600) return Math.round(diffSec / 60) + ' 分钟前'
  if (diffSec < 86400) return Math.round(diffSec / 3600) + ' 小时前'
  if (diffSec < 86400 * 7) return Math.round(diffSec / 86400) + ' 天前'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    config: {},
    courseTypeInput: '',
    locationInput: '',
    focusAreaInput: '',
    durationOptions: [30, 45, 60, 90, 120],
    showTextModal: false,
    textModalMode: 'export',
    textExportContent: '',
    textImportContent: '',
    themeOptions: [
      { name: '静练', value: 'soft-color', preview: '#211B17' },
      { name: '课表', value: 'class-plan', preview: '#1E2352' }
    ],
    currentTheme: 'soft-color',
    densityOptions: [
      { name: '极简', value: 'minimal', desc: '时间 + 会员' },
      { name: '标准', value: 'standard', desc: '时间 + 会员 + 课程' },
      { name: '详尽', value: 'detailed', desc: '时间 + 会员 + 课程·地点' }
    ],
    currentDensity: 'standard',
    backupTimeLabel: '从未备份',
    backupHasCloud: false,
    backingUp: false,
    restoring: false,
    feedbackText: '',
    feedbackSubmitting: false
  },

  onShow() {
    const config = storage.getConfig()
    const currentTheme = themeUtil.applyAppTheme(config)
    this.setData({
      config,
      currentTheme,
      currentDensity: config.weekDensity || 'standard'
    })
    this._refreshBackupInfo()
  },

  _refreshBackupInfo() {
    const ts = cloudBackup.getLastBackupTime()
    this.setData({
      backupTimeLabel: fmtBackupTime(ts),
      backupHasCloud: !!cloudBackup.getLastBackupFileID()
    })
  },

  async onBackupNow() {
    if (this.data.backingUp) return
    this.setData({ backingUp: true })
    wx.showLoading({ title: '备份中...', mask: true })
    try {
      const result = await cloudBackup.uploadBackup()
      wx.hideLoading()
      if (result.success) {
        wx.showToast({
          title: `已备份 ${result.memberCount} 位会员 / ${result.sessionCount} 节课`,
          icon: 'none',
          duration: 2200
        })
        wx.vibrateShort({ type: 'medium' })
        this._refreshBackupInfo()
      } else {
        wx.showModal({
          title: '备份失败',
          content: result.error || '请稍后重试',
          showCancel: false
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '备份失败',
        content: err.message || '未知错误',
        showCancel: false
      })
    } finally {
      this.setData({ backingUp: false })
    }
  },

  onRestore() {
    if (!this.data.backupHasCloud) {
      wx.showToast({ title: '本设备无备份记录', icon: 'none' })
      return
    }
    if (this.data.restoring) return
    wx.showModal({
      title: '从云端恢复',
      content: '将用云端备份覆盖本地数据，本地未备份的修改会丢失。确认继续？',
      confirmText: '确认恢复',
      confirmColor: '#B5573D',
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ restoring: true })
        wx.showLoading({ title: '恢复中...', mask: true })
        try {
          const result = await cloudBackup.restoreBackup()
          wx.hideLoading()
          if (result.success) {
            wx.showToast({
              title: '恢复成功',
              icon: 'success'
            })
            wx.vibrateShort({ type: 'medium' })
            const config = storage.getConfig()
            const currentTheme = themeUtil.applyAppTheme(config)
            this.setData({
              config,
              currentTheme,
              currentDensity: config.weekDensity || 'standard'
            })
          } else {
            wx.showModal({
              title: '恢复失败',
              content: result.error || '请稍后重试',
              showCancel: false
            })
          }
        } catch (err) {
          wx.hideLoading()
          wx.showModal({
            title: '恢复失败',
            content: err.message || '未知错误',
            showCancel: false
          })
        } finally {
          this.setData({ restoring: false })
        }
      }
    })
  },

  // === 预设管理 ===

  onCourseTypeInput(e) {
    this.setData({ courseTypeInput: e.detail.value })
  },

  onAddCourseType() {
    const val = this.data.courseTypeInput.trim()
    if (!val) return
    const config = this.data.config
    if (config.courseTypes.includes(val)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    config.courseTypes.push(val)
    storage.saveConfig(config)
    this.setData({ config, courseTypeInput: '' })
    wx.vibrateShort({ type: 'light' })
  },

  onDeleteCourseType(e) {
    const { index } = e.currentTarget.dataset
    const config = this.data.config
    config.courseTypes.splice(index, 1)
    storage.saveConfig(config)
    this.setData({ config })
    wx.vibrateShort({ type: 'light' })
  },

  onLocationInput(e) {
    this.setData({ locationInput: e.detail.value })
  },

  onAddLocation() {
    const val = this.data.locationInput.trim()
    if (!val) return
    const config = this.data.config
    if (config.locations.includes(val)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    config.locations.push(val)
    storage.saveConfig(config)
    this.setData({ config, locationInput: '' })
    wx.vibrateShort({ type: 'light' })
  },

  onDeleteLocation(e) {
    const { index } = e.currentTarget.dataset
    const config = this.data.config
    config.locations.splice(index, 1)
    storage.saveConfig(config)
    this.setData({ config })
    wx.vibrateShort({ type: 'light' })
  },

  onFocusAreaInput(e) {
    this.setData({ focusAreaInput: e.detail.value })
  },

  onAddFocusArea() {
    const val = this.data.focusAreaInput.trim()
    if (!val) return
    const config = this.data.config
    if (config.focusAreaOptions.includes(val)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    config.focusAreaOptions.push(val)
    storage.saveConfig(config)
    this.setData({ config, focusAreaInput: '' })
    wx.vibrateShort({ type: 'light' })
  },

  onDeleteFocusArea(e) {
    const { index } = e.currentTarget.dataset
    const config = this.data.config
    config.focusAreaOptions.splice(index, 1)
    storage.saveConfig(config)
    this.setData({ config })
    wx.vibrateShort({ type: 'light' })
  },

  onDurationChange(e) {
    const config = this.data.config
    config.defaultDuration = this.data.durationOptions[e.detail.value]
    storage.saveConfig(config)
    this.setData({ config })
  },

  onStartTimeChange(e) {
    const config = this.data.config
    config.workingHours.start = e.detail.value
    storage.saveConfig(config)
    this.setData({ config })
  },

  onEndTimeChange(e) {
    const config = this.data.config
    config.workingHours.end = e.detail.value
    storage.saveConfig(config)
    this.setData({ config })
  },

  // === 外观 ===

  onThemeSelect(e) {
    const value = e.currentTarget.dataset.value
    const config = this.data.config
    config.weekTheme = value
    storage.saveConfig(config)
    themeUtil.applyAppTheme(config)
    this.setData({ config, currentTheme: value })
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '主题已切换', icon: 'success' })
  },

  onDensitySelect(e) {
    const value = e.currentTarget.dataset.value
    const config = this.data.config
    config.weekDensity = value
    storage.saveConfig(config)
    this.setData({ config, currentDensity: value })
    wx.vibrateShort({ type: 'light' })
  },

  onGoStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  },

  // === 数据管理 ===

  onExport() {
    const data = storage.exportAllData()
    const jsonStr = JSON.stringify(data, null, 2)
    const today = dateUtil.toDateStr(new Date())
    const fileName = `paike-backup-${today}.json`
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    fs.writeFile({
      filePath,
      data: jsonStr,
      encoding: 'utf8',
      success: () => {
        wx.shareFileMessage({
          filePath,
          fileName,
          success: () => {
            wx.showToast({ title: '导出成功', icon: 'success' })
          },
          fail: () => {
            wx.showToast({ title: '已取消分享', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        const file = res.tempFiles[0]
        wx.showModal({
          title: '确认导入',
          content: '导入将覆盖现有数据，是否继续？',
          success: (modalRes) => {
            if (!modalRes.confirm) return
            const fs = wx.getFileSystemManager()
            fs.readFile({
              filePath: file.path,
              encoding: 'utf8',
              success: (readRes) => {
                try {
                  const jsonData = JSON.parse(readRes.data)
                  const result = storage.importData(jsonData)
                  if (result.success) {
                    wx.showToast({ title: '导入成功', icon: 'success' })
                    wx.vibrateShort({ type: 'medium' })
                    this.setData({ config: storage.getConfig() })
                  } else {
                    wx.showToast({ title: result.message, icon: 'none' })
                  }
                } catch (e) {
                  wx.showToast({ title: '数据格式无效，请选择正确的备份文件', icon: 'none' })
                }
              },
              fail: () => {
                wx.showToast({ title: '读取文件失败', icon: 'none' })
              }
            })
          }
        })
      }
    })
  },

  onTextExport() {
    const sessions = storage.getSessions()
    const members = storage.getMembers()
    if (sessions.length === 0) {
      wx.showToast({ title: '暂无课程数据', icon: 'none' })
      return
    }
    const text = textImportExport.exportSessionsToText(sessions, members)
    this.setData({ textExportContent: text, showTextModal: true, textModalMode: 'export' })
  },

  onTextImport() {
    this.setData({ textImportContent: '', showTextModal: true, textModalMode: 'import' })
  },

  onTextModalInput(e) {
    this.setData({ textImportContent: e.detail.value })
  },

  onTextModalClose() {
    this.setData({ showTextModal: false })
  },

  onTextModalCopy() {
    wx.setClipboardData({
      data: this.data.textExportContent,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
        wx.vibrateShort({ type: 'light' })
      }
    })
  },

  onTextModalConfirmImport() {
    const text = this.data.textImportContent
    if (!text || !text.trim()) {
      wx.showToast({ title: '请输入课程文本', icon: 'none' })
      return
    }
    const result = textImportExport.importTextSessions(text)
    this.setData({ showTextModal: false })
    wx.vibrateShort({ type: 'medium' })
    if (result.errors.length > 0) {
      const errLines = result.errors.map(e => '第' + e.line + '行: ' + e.message).join('\n')
      wx.showModal({
        title: result.message,
        content: errLines,
        showCancel: false,
        confirmText: '知道了'
      })
    } else {
      wx.showToast({ title: result.message, icon: 'success' })
    }
  },

  // === 意见反馈 ===

  onFeedbackInput(e) {
    this.setData({ feedbackText: e.detail.value })
  },

  async onSubmitFeedback() {
    const text = (this.data.feedbackText || '').trim()
    if (!text) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }
    if (this.data.feedbackSubmitting) return
    this.setData({ feedbackSubmitting: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'submitFeedback',
        data: { content: text, systemInfo: wx.getDeviceInfo() }
      })
      if (res.result && res.result.success) {
        this.setData({ feedbackText: '' })
        wx.showToast({ title: '感谢反馈 ✓', icon: 'success' })
        wx.vibrateShort({ type: 'light' })
      } else {
        wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ feedbackSubmitting: false })
    }
  },

  onShareAppMessage() {
    return {
      title: '排课助手 · 轻松管理你的私教课程',
      path: '/pages/week/week',
    }
  },
})
