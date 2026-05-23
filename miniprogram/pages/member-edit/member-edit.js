const storage = require('../../utils/storage')
const { generateMemberId } = require('../../utils/idGenerator')

Page({
  data: {
    isEdit: false,
    form: {
      id: '',
      name: '',
      phone: '',
      avatar: '',
      tags: [],
      notes: '',
      createdAt: 0,
      updatedAt: 0
    },
    tagInput: ''
  },

  onLoad(options) {
    if (options.id) {
      const member = storage.getMemberById(options.id)
      if (member) {
        this.setData({ isEdit: true, form: member })
        wx.setNavigationBarTitle({ title: '编辑会员' })
        return
      }
    }
    wx.setNavigationBarTitle({ title: '新增会员' })
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ 'form.phone': e.detail.value })
  },

  onNotesInput(e) {
    this.setData({ 'form.notes': e.detail.value })
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value })
  },

  onTagConfirm() {
    const tag = this.data.tagInput.trim()
    if (!tag) return
    const tags = this.data.form.tags.slice()
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
    this.setData({ 'form.tags': tags, tagInput: '' })
  },

  onTagClose(e) {
    const name = e.currentTarget.dataset.name
    const tags = this.data.form.tags.filter(t => t !== name)
    this.setData({ 'form.tags': tags })
  },

  onSave() {
    if (!this.data.form.name.trim()) {
      wx.showToast({ title: '请输入会员昵称', icon: 'none' })
      return
    }

    const form = Object.assign({}, this.data.form)
    if (!form.id) {
      form.id = generateMemberId()
      form.createdAt = Date.now()
      form.updatedAt = Date.now()
    }

    storage.saveMember(form)
    wx.showToast({ title: '保存成功', icon: 'success' })
    wx.vibrateShort({ type: 'medium' })
    setTimeout(() => { wx.navigateBack() }, 500)
  }
})
