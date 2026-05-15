const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')
const textImportExport = require('../../utils/textImportExport')

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
    textImportContent: ''
  },

  onShow() {
    this.setData({ config: storage.getConfig() })
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
  }
})
