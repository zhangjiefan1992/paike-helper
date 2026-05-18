const { createRecognizer } = require('../../utils/speechRecognizer')

Component({
  properties: {
    members: { type: Array, value: [] },
    config: { type: Object, value: {} }
  },

  data: {
    showPanel: false,
    recording: false,
    transcript: '',
    state: 'idle',
    panelTitle: '语音录课',
    errorMsg: ''
  },

  lifetimes: {
    detached() {
      if (this._recognizer) {
        this._recognizer.destroy()
        this._recognizer = null
      }
    }
  },

  methods: {
    noop() {},

    onOpenPanel() {
      wx.authorize({
        scope: 'scope.record',
        success: () => { this._showPanel() },
        fail: () => {
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中允许使用麦克风',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
        }
      })
    },

    _showPanel() {
      this.setData({
        showPanel: true,
        recording: false,
        transcript: '',
        state: 'idle',
        errorMsg: ''
      })
    },

    onClose() {
      if (this._recognizer && this.data.recording) {
        this._recognizer.stop()
      }
      this.setData({ showPanel: false, recording: false })
    },

    onRecordStart() {
      if (this.data.state === 'parsing') return

      this._recognizer = createRecognizer()

      this._recognizer.onInterim((text) => {
        this.setData({ transcript: text })
      })

      this._recognizer.onResult((text, parsedData) => {
        this.setData({ showPanel: false, panelTitle: '语音录课', recording: false })
        this.triggerEvent('result', parsedData)
        wx.showToast({ title: '解析成功', icon: 'success' })
      })

      this._recognizer.onError((err) => {
        this.setData({
          recording: false,
          state: 'error',
          panelTitle: '语音录课',
          errorMsg: err.message || '识别失败'
        })
      })

      this._recognizer.start()
      this.setData({ recording: true, state: 'recording', transcript: '' })
    },

    onRecordStop() {
      if (!this.data.recording) return
      this.setData({ state: 'parsing', panelTitle: '解析中...', recording: false })
      if (this._recognizer) {
        this._recognizer.stop()
      }
    },

    onRetry() {
      this.setData({ state: 'idle', transcript: '', errorMsg: '' })
    }
  }
})
