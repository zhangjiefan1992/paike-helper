const storage = require('../../utils/storage')
const dateUtil = require('../../utils/dateUtil')
const ai = require('../../utils/ai')
const { generateSessionId } = require('../../utils/idGenerator')

Page({
  data: {
    isEdit: false,
    form: {
      id: '',
      date: '',
      startTime: '',
      duration: 60,
      classMode: 'private',
      courseType: '',
      location: '',
      memberId: '',
      memberIds: [],
      status: 'scheduled',
      notes: '',
      focusAreas: [],
      photos: [],
      beforePhotos: [],
      afterPhotos: []
    },
    members: [],
    config: {},
    statusOptions: [
      { value: 'scheduled', label: '已约' },
      { value: 'completed', label: '已上' },
      { value: 'cancelled', label: '取消' },
      { value: 'noshow', label: '爽约' }
    ],
    statusIndex: 0,
    customCourseType: '',
    customLocation: '',
    showMemberPicker: false,
    selectedMemberName: '',
    memberIdMap: {},
    focusAreaMap: {}
  },

  onLoad(options) {
    const config = storage.getConfig()
    const members = storage.getMembers()

    if (options.id) {
      const session = storage.getSessionById(options.id)
      if (session) {
        const statusIndex = this.data.statusOptions.findIndex(s => s.value === session.status)
        const member = storage.getMemberById(session.memberId)
        const memberIdMap = {}
        if (session.memberIds) {
          session.memberIds.forEach(id => { memberIdMap[id] = true })
        }
        const focusAreaMap = {}
        if (session.focusAreas) {
          session.focusAreas.forEach(a => { focusAreaMap[a] = true })
        }
        this.setData({
          isEdit: true,
          form: session,
          config,
          members,
          statusIndex: statusIndex >= 0 ? statusIndex : 0,
          selectedMemberName: member ? member.name : '',
          memberIdMap,
          focusAreaMap
        })
        wx.setNavigationBarTitle({ title: '编辑课程' })
        return
      }
    }

    const today = dateUtil.toDateStr(new Date())
    const form = Object.assign({}, this.data.form, {
      date: options.date || today,
      startTime: options.time || '09:00',
      duration: config.defaultDuration || 60
    })

    this.setData({ form, config, members })
    wx.setNavigationBarTitle({ title: '新增课程' })
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ 'form.startTime': e.detail.value })
  },

  onDurationTap(e) {
    this.setData({ 'form.duration': Number(e.currentTarget.dataset.val) })
  },

  onClassModeChange(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      'form.classMode': mode,
      'form.memberId': '',
      'form.memberIds': [],
      selectedMemberName: '',
      memberIdMap: {}
    })
  },

  onCourseTypeTap(e) {
    this.setData({ 'form.courseType': e.detail.text })
  },

  onCustomCourseTypeInput(e) {
    this.setData({ customCourseType: e.detail.value })
  },

  onAddCustomCourseType() {
    const val = this.data.customCourseType.trim()
    if (!val) return
    const config = this.data.config
    if (!config.courseTypes.includes(val)) {
      config.courseTypes.push(val)
      storage.saveConfig(config)
    }
    this.setData({ config, 'form.courseType': val, customCourseType: '' })
  },

  onLocationTap(e) {
    this.setData({ 'form.location': e.detail.text })
  },

  onCustomLocationInput(e) {
    this.setData({ customLocation: e.detail.value })
  },

  onAddCustomLocation() {
    const val = this.data.customLocation.trim()
    if (!val) return
    this.setData({ 'form.location': val, customLocation: '' })
  },

  onFocusAreaTap(e) {
    const area = e.detail.text
    const areas = this.data.form.focusAreas.slice()
    const focusAreaMap = Object.assign({}, this.data.focusAreaMap)
    const idx = areas.indexOf(area)
    if (idx >= 0) {
      areas.splice(idx, 1)
      delete focusAreaMap[area]
    } else {
      areas.push(area)
      focusAreaMap[area] = true
    }
    this.setData({ 'form.focusAreas': areas, focusAreaMap })
  },

  onStatusChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      statusIndex: idx,
      'form.status': this.data.statusOptions[idx].value
    })
  },

  onMemberSelect(e) {
    const idx = Number(e.detail.value)
    const member = this.data.members[idx]
    if (member) {
      this.setData({
        'form.memberId': member.id,
        selectedMemberName: member.name
      })
    }
  },

  onGroupMemberTap(e) {
    const memberId = e.currentTarget.dataset.id
    const memberIds = this.data.form.memberIds.slice()
    const memberIdMap = Object.assign({}, this.data.memberIdMap)
    const idx = memberIds.indexOf(memberId)
    if (idx >= 0) {
      memberIds.splice(idx, 1)
      delete memberIdMap[memberId]
    } else {
      memberIds.push(memberId)
      memberIdMap[memberId] = true
    }
    this.setData({ 'form.memberIds': memberIds, memberIdMap })
  },

  onNotesInput(e) {
    this.setData({ 'form.notes': e.detail.value })
  },

  onChoosePhoto(e) {
    const type = e.currentTarget.dataset.type || 'photos'
    const key = type === 'before' ? 'beforePhotos' : (type === 'after' ? 'afterPhotos' : 'photos')
    const current = this.data.form[key] || []
    const limit = key === 'photos' ? 9 : 5
    const remaining = limit - current.length
    if (remaining <= 0) {
      wx.showToast({ title: `最多${limit}张`, icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const photos = current.concat(res.tempFiles.map(f => f.tempFilePath))
        this.setData({ ['form.' + key]: photos })
      }
    })
  },

  onRemovePhoto(e) {
    const idx = e.currentTarget.dataset.idx
    const type = e.currentTarget.dataset.type || 'photos'
    const key = type === 'before' ? 'beforePhotos' : (type === 'after' ? 'afterPhotos' : 'photos')
    const photos = (this.data.form[key] || []).slice()
    photos.splice(idx, 1)
    this.setData({ ['form.' + key]: photos })
  },

  onSave() {
    const form = this.data.form
    if (!form.date) { wx.showToast({ title: '请选择日期', icon: 'none' }); return }
    if (!form.startTime) { wx.showToast({ title: '请选择时间', icon: 'none' }); return }
    if (!form.courseType) { wx.showToast({ title: '请选择课程类型', icon: 'none' }); return }
    if (form.classMode === 'private' && !form.memberId) {
      wx.showToast({ title: '私教课程请选择会员', icon: 'none' }); return
    }

    this.checkConflict(form)

    if (!form.id) {
      form.id = generateSessionId()
      form.createdAt = Date.now()
      form.updatedAt = Date.now()
    }

    storage.saveSession(form)
    wx.showToast({ title: '保存成功', icon: 'success' })
    wx.vibrateShort({ type: 'medium' })
    setTimeout(() => { wx.navigateBack() }, 500)
  },

  onGoSummary() {
    wx.navigateTo({ url: '/pages/summary/summary?id=' + this.data.form.id })
  },

  onGenerateSummary() {
    const session = this.data.form
    const member = session.memberId ? storage.getMemberById(session.memberId) : null
    wx.showLoading({ title: '生成中...' })
    ai.generateSummary(session, member, session.id).then(text => {
      wx.hideLoading()
      storage.updateSessionSummary(session.id, text)
      this.setData({ 'form.summaryText': text })
      wx.navigateTo({ url: '/pages/summary/summary?id=' + session.id })
    }).catch(err => {
      wx.hideLoading()
      console.error('generateSummary failed:', err)
      wx.showToast({ title: '生成失败', icon: 'none' })
    })
  },

  checkConflict(form) {
    const daySessions = storage.getSessionsByDate(form.date)
    const startMin = this.timeToMin(form.startTime)
    const endMin = startMin + form.duration
    const conflict = daySessions.find(s => {
      if (s.id === form.id) return false
      const sStart = this.timeToMin(s.startTime)
      const sEnd = sStart + s.duration
      return startMin < sEnd && endMin > sStart
    })
    if (conflict) {
      wx.showToast({ title: '该时段已有课程安排', icon: 'none', duration: 2000 })
    }
  },

  timeToMin(time) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定删除此课程？',
        confirmColor: '#C26B5E',
      success: (res) => {
        if (res.confirm) {
          storage.deleteSession(this.data.form.id)
          wx.showToast({ title: '已删除', icon: 'none' })
          wx.vibrateShort({ type: 'light' })
          setTimeout(() => { wx.navigateBack() }, 500)
        }
      }
    })
  }
})
