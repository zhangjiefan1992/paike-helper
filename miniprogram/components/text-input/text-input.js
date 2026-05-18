const dateUtil = require('../../utils/dateUtil')

Component({
  properties: {
    members: { type: Array, value: [] },
    config: { type: Object, value: {} }
  },

  data: {
    expanded: false,
    inputText: '',
    loading: false,
    errorMsg: ''
  },

  methods: {
    onExpand() {
      this.setData({ expanded: true })
    },

    onClose() {
      this.setData({ expanded: false, inputText: '', errorMsg: '' })
    },

    onInput(e) {
      this.setData({ inputText: e.detail.value })
    },

    onClearError() {
      this.setData({ errorMsg: '' })
    },

    onSubmit() {
      const text = this.data.inputText.trim()
      if (!text || this.data.loading) return

      this.setData({ loading: true, errorMsg: '' })

      const memberNames = this.properties.members.map(m => m.name)
      const config = this.properties.config
      const today = dateUtil.toDateStr(new Date())

      wx.cloud.callFunction({
        name: 'parseVoiceSession',
        data: {
          text,
          memberNames,
          courseTypes: config.courseTypes || [],
          locations: config.locations || [],
          focusAreaOptions: config.focusAreaOptions || [],
          today
        },
        success: (res) => {
          if (res.result && res.result.success) {
            this.setData({ expanded: false, inputText: '', loading: false })
            this.triggerEvent('result', res.result.data)
            wx.showToast({ title: '解析成功', icon: 'success' })
          } else {
            this.setData({
              loading: false,
              errorMsg: (res.result && res.result.error) || '解析失败，请重试'
            })
          }
        },
        fail: (err) => {
          this.setData({
            loading: false,
            errorMsg: err.errMsg || '云函数调用失败'
          })
        }
      })
    }
  }
})
