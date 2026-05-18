/**
 * 语音录制器 — 使用 wx.getRecorderManager() 原生录音
 * 输出 PCM 16kHz 单声道，上传到服务端做 ASR + 结构化解析
 */

const API_BASE = 'https://your-server.com'

function createRecognizer() {
  const recorder = wx.getRecorderManager()
  let _onResult = null
  let _onError = null
  let _onInterim = null
  let _recording = false
  let _startTime = 0

  recorder.onStop((res) => {
    _recording = false
    if (!res.tempFilePath) {
      if (_onError) _onError(new Error('录音文件为空'))
      return
    }

    const duration = (Date.now() - _startTime) / 1000
    if (duration < 1) {
      if (_onError) _onError(new Error('录音太短，请重试'))
      return
    }

    if (_onInterim) _onInterim('正在上传解析...')
    uploadAndParse(res.tempFilePath)
  })

  recorder.onError((res) => {
    _recording = false
    if (_onError) _onError(new Error(res.errMsg || '录音失败'))
  })

  function uploadAndParse(filePath) {
    const config = wx.getStorageSync('pk_config') || {}
    const members = wx.getStorageSync('pk_members') || []
    const today = formatDate(new Date())

    const context = JSON.stringify({
      memberNames: members.map(m => m.name),
      courseTypes: config.courseTypes || [],
      locations: config.locations || [],
      focusAreaOptions: config.focusAreaOptions || [],
      today
    })

    wx.uploadFile({
      url: `${API_BASE}/api/v1/ai/voice-session`,
      filePath,
      name: 'audio',
      formData: { context },
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0 && data.data) {
            if (_onResult) _onResult(data.data.rawText || '识别完成', data.data)
          } else {
            if (_onError) _onError(new Error(data.message || '解析失败'))
          }
        } catch {
          if (_onError) _onError(new Error('服务端响应格式异常'))
        }
      },
      fail(err) {
        if (_onError) _onError(new Error(err.errMsg || '上传失败，请检查网络'))
      }
    })
  }

  function formatDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  return {
    start() {
      _recording = true
      _startTime = Date.now()
      recorder.start({
        format: 'PCM',
        sampleRate: 16000,
        numberOfChannels: 1,
        frameSize: 50
      })
    },
    stop() {
      if (_recording) recorder.stop()
    },
    onInterim(cb) { _onInterim = cb },
    onResult(cb) { _onResult = cb },
    onError(cb) { _onError = cb },
    destroy() {
      _onInterim = null
      _onResult = null
      _onError = null
    }
  }
}

module.exports = { createRecognizer }
