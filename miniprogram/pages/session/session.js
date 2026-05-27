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
      afterPhotos: [],
      voiceSegments: [],
      aiDigest: ''
    },
    showSegments: false,
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
    customFocusArea: '',
    showMemberPicker: false,
    selectedMemberName: '',
    memberIdMap: {},
    focusAreaMap: {},
    quickNote: { show: false, tags: [], text: '' },
    QUICK_NOTE_TAGS: ['进步明显', '配合很好', '状态一般', '需要注意', '动作改善', '体力欠佳']
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
        let updatedAtLabel = ''
        if (session.updatedAt) {
          const d = new Date(session.updatedAt)
          updatedAtLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        }
        this.setData({
          isEdit: true,
          form: session,
          config,
          members,
          statusIndex: statusIndex >= 0 ? statusIndex : 0,
          selectedMemberName: member ? member.name : '',
          memberIdMap,
          focusAreaMap,
          updatedAtLabel
        })
        wx.setNavigationBarTitle({ title: '编辑课程' })
        if (options.quickNote === '1' && session.status === 'completed') {
          setTimeout(() => this._showQuickNote(), 300)
        }
        return
      }
    }

    const today = dateUtil.toDateStr(new Date())
    const date = options.date || today
    const startTime = options.time || this._findNextEmptySlot(date, config) || '09:00'

    const form = Object.assign({}, this.data.form, {
      date,
      startTime,
      duration: config.defaultDuration || 60
    })

    // 套用上次"常用组合"
    const lastCombo = this._loadLastCombo()
    if (lastCombo) {
      if (!form.courseType && lastCombo.courseType) form.courseType = lastCombo.courseType
      if (!form.location && lastCombo.location) form.location = lastCombo.location
      if (lastCombo.classMode) form.classMode = lastCombo.classMode
      if (lastCombo.focusAreas && lastCombo.focusAreas.length && (!form.focusAreas || !form.focusAreas.length)) {
        form.focusAreas = lastCombo.focusAreas.slice()
        const focusAreaMap = {}
        lastCombo.focusAreas.forEach(a => { focusAreaMap[a] = true })
        this.setData({ focusAreaMap })
      }
    }

    if (options.memberId) {
      form.memberId = options.memberId
      const member = members.find(m => m.id === options.memberId)
      if (member) this.setData({ selectedMemberName: member.name })
    }

    if (options.aiSynthesis) {
      form.aiDigest = decodeURIComponent(options.aiSynthesis)
    }

    this.setData({ form, config, members })
    wx.setNavigationBarTitle({ title: '新增课程' })
  },

  _findNextEmptySlot(dateStr, config) {
    const wh = (config && config.workingHours) || { start: '08:00', end: '21:00' }
    const whStartH = parseInt(wh.start.split(':')[0])
    const whEndH = parseInt(wh.end.split(':')[0])
    const sessions = storage.getSessionsByDate(dateStr) || []
    const occupied = {}
    sessions.forEach(s => {
      if (s.status === 'cancelled') return
      const [h, m] = s.startTime.split(':').map(Number)
      const startMin = h * 60 + m
      const endMin = startMin + (s.duration || 60)
      for (let t = startMin; t < endMin; t += 30) occupied[Math.floor(t / 30)] = true
    })

    const isToday = dateStr === dateUtil.toDateStr(new Date())
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()

    for (let h = whStartH; h < whEndH; h++) {
      for (const m of [0, 30]) {
        const slotMin = h * 60 + m
        if (isToday && slotMin <= nowMin) continue
        if (!occupied[Math.floor(slotMin / 30)]) {
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }
      }
    }
    return null
  },

  _loadLastCombo() {
    try {
      return wx.getStorageSync('pk_last_session_combo') || null
    } catch { return null }
  },

  _saveLastCombo() {
    try {
      wx.setStorageSync('pk_last_session_combo', {
        courseType: this.data.form.courseType,
        location: this.data.form.location,
        classMode: this.data.form.classMode,
        focusAreas: this.data.form.focusAreas
      })
    } catch {}
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

  onCustomFocusAreaInput(e) {
    this.setData({ customFocusArea: e.detail.value })
  },

  onAddCustomFocusArea() {
    const val = this.data.customFocusArea.trim()
    if (!val) return
    const config = this.data.config
    if (!config.focusAreaOptions.includes(val)) {
      config.focusAreaOptions.push(val)
      storage.saveConfig(config)
    }
    const areas = this.data.form.focusAreas.slice()
    const focusAreaMap = Object.assign({}, this.data.focusAreaMap)
    if (!areas.includes(val)) {
      areas.push(val)
      focusAreaMap[val] = true
    }
    this.setData({ config, 'form.focusAreas': areas, focusAreaMap, customFocusArea: '' })
  },

  onStatusChange(e) {
    const idx = Number(e.detail.value)
    const newStatus = this.data.statusOptions[idx].value
    const wasCompleted = this.data.form.status === 'completed'
    this.setData({
      statusIndex: idx,
      'form.status': newStatus
    })
    if (newStatus === 'completed' && !wasCompleted) {
      this._showQuickNote()
    }
  },

  noop() {},

  _showQuickNote() {
    this.setData({
      quickNote: { show: true, tags: [], text: '' }
    })
  },

  onQuickNoteTagTap(e) {
    const tag = e.currentTarget.dataset.tag
    const tags = this.data.quickNote.tags.slice()
    const i = tags.indexOf(tag)
    if (i >= 0) tags.splice(i, 1)
    else tags.push(tag)
    this.setData({ 'quickNote.tags': tags })
  },

  onQuickNoteInput(e) {
    this.setData({ 'quickNote.text': e.detail.value })
  },

  onQuickNoteSkip() {
    this.setData({ 'quickNote.show': false })
  },

  onQuickNoteSave() {
    const { tags, text } = this.data.quickNote
    const parts = []
    if (tags.length) parts.push(tags.join('、'))
    if (text.trim()) parts.push(text.trim())
    if (parts.length) {
      const append = parts.join('；')
      const cur = this.data.form.notes
      this.setData({
        'form.notes': cur ? cur + '\n' + append : append
      })
      wx.showToast({ title: '已记录', icon: 'success', duration: 1200 })
      wx.vibrateShort({ type: 'light' })
    }
    this.setData({ 'quickNote.show': false })
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

  onDigestInput(e) {
    this.setData({ 'form.aiDigest': e.detail.value })
  },

  onToggleSegments() {
    this.setData({ showSegments: !this.data.showSegments })
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
        const paths = res.tempFiles.map(f => f.tempFilePath)
        this.compressPhotos(paths).then(compressed => {
          const photos = current.concat(compressed)
          this.setData({ ['form.' + key]: photos })
        })
      }
    })
  },

  compressPhotos(paths) {
    const tasks = paths.map(src =>
      new Promise(resolve => {
        wx.compressImage({
          src,
          quality: 60,
          success: (res) => resolve(res.tempFilePath),
          fail: () => resolve(src)
        })
      })
    )
    return Promise.all(tasks)
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

    const conflict = this.findConflict(form)
    if (conflict) {
      const startMin = this.timeToMin(conflict.startTime)
      const endH = String(Math.floor((startMin + conflict.duration) / 60)).padStart(2, '0')
      const endM = String((startMin + conflict.duration) % 60).padStart(2, '0')
      const hint = `${conflict.startTime}-${endH}:${endM} ${conflict.courseType || '课程'}`
      wx.showModal({
        title: '时段冲突',
        content: `该时段已有课程：\n${hint}\n\n是否仍要保存？`,
        confirmText: '仍然保存',
        confirmColor: '#F28B82',
        success: (res) => {
          if (res.confirm) this.doSave(form)
        }
      })
      return
    }
    this.doSave(form)
  },

  doSave(form) {
    if (!form.id) {
      form.id = generateSessionId()
      form.createdAt = Date.now()
    }
    form.updatedAt = Date.now()

    storage.saveSession(form)
    this._saveLastCombo()
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

  findConflict(form) {
    const daySessions = storage.getSessionsByDate(form.date)
    const startMin = this.timeToMin(form.startTime)
    const endMin = startMin + form.duration
    return daySessions.find(s => {
      if (s.id === form.id) return false
      const sStart = this.timeToMin(s.startTime)
      const sEnd = sStart + s.duration
      return startMin < sEnd && endMin > sStart
    }) || null
  },

  timeToMin(time) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  },

  onVoiceResult(e) {
    const data = e.detail
    const updates = {}

    if (data.date) updates['form.date'] = data.date
    if (data.startTime) updates['form.startTime'] = data.startTime
    if (data.duration) updates['form.duration'] = data.duration
    if (data.courseType) updates['form.courseType'] = data.courseType
    if (data.classMode) updates['form.classMode'] = data.classMode
    if (data.location) updates['form.location'] = data.location
    if (data.focusAreas && data.focusAreas.length) {
      updates['form.focusAreas'] = data.focusAreas
      const focusAreaMap = {}
      data.focusAreas.forEach(a => { focusAreaMap[a] = true })
      updates.focusAreaMap = focusAreaMap
    }
    if (data.notes) updates['form.notes'] = data.notes
    if (data.voiceSegments && data.voiceSegments.length) {
      updates['form.voiceSegments'] = data.voiceSegments
    }
    if (data.aiDigest) updates['form.aiDigest'] = data.aiDigest

    let memberCreated = false
    let memberFinalName = ''
    if (data.memberName) {
      const name = data.memberName.trim()
      const exact = this.data.members.find(m => m.name === name)
      if (exact) {
        updates['form.memberId'] = exact.id
        updates.selectedMemberName = exact.name
        memberFinalName = exact.name
      } else {
        // 无精确匹配 → 弹确认框（采纳/纠正/取消）
        this._pendingVoiceUpdates = updates
        this._askMemberConfirm(name, this.data.members)
        return
      }
    }

    this._applyVoiceUpdates(updates, memberCreated, memberFinalName)
  },

  _applyVoiceUpdates(updates, memberCreated, memberFinalName) {
    this.setData(updates)
    const count = Object.keys(updates).filter(k => k.startsWith('form.')).length
    wx.vibrateShort({ type: 'medium' })
    const suffix = memberCreated ? `，已新建『${memberFinalName}』` : ''
    wx.showToast({ title: '已识别 ' + count + ' 个字段' + suffix, icon: 'success' })
  },

  _askMemberConfirm(name, members) {
    // 找候选会员（字符交集排序）
    const candidates = members
      .map(m => ({ m, score: this._similarityScore(m.name, name) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(x => x.m.name)

    const itemList = ['新建会员「' + name + '」']
    candidates.forEach(n => itemList.push('使用已有：' + n))
    itemList.push('稍后手动选择')

    wx.showActionSheet({
      itemList,
      success: (res) => {
        const updates = this._pendingVoiceUpdates || {}
        this._pendingVoiceUpdates = null
        if (res.tapIndex === 0) {
          // 新建
          const storage = require('../../utils/storage')
          const { generateMemberId } = require('../../utils/idGenerator')
          const newMember = {
            id: generateMemberId(),
            name,
            phone: '',
            avatar: '',
            tags: [],
            notes: '',
            createdAt: Date.now()
          }
          storage.saveMember(newMember)
          const members = storage.getMembers()
          this.setData({ members })
          updates['form.memberId'] = newMember.id
          updates.selectedMemberName = newMember.name
          this._applyVoiceUpdates(updates, true, name)
        } else if (res.tapIndex > 0 && res.tapIndex <= candidates.length) {
          const chosen = members.find(m => m.name === candidates[res.tapIndex - 1])
          if (chosen) {
            updates['form.memberId'] = chosen.id
            updates.selectedMemberName = chosen.name
          }
          this._applyVoiceUpdates(updates, false, '')
        } else {
          // 稍后选
          this._applyVoiceUpdates(updates, false, '')
        }
      },
      fail: () => {
        const updates = this._pendingVoiceUpdates || {}
        this._pendingVoiceUpdates = null
        this._applyVoiceUpdates(updates, false, '')
      }
    })
  },

  _similarityScore(a, b) {
    if (!a || !b) return 0
    if (a.includes(b) || b.includes(a)) return 100
    const setA = new Set(a)
    let common = 0
    for (const c of b) if (setA.has(c)) common++
    return common
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
