/**
 * 语音录制器
 * 流程：wx 录音（PCM 16kHz） → 读为 base64 → 云函数代理到 Cloudflare ASR
 *
 * API:
 *   - recordOnce({ model }) → Promise<{ rawText, asrModel, asrElapsedMs, durationSec }>
 *     启动录音，调用方稍后调用 stopRecording() 结束并触发上传识别
 *   - stopRecording()
 *   - parseSegments(segments, context) → Promise<parsedData>
 *     多段原文一次性解析为结构化字段 + aiDigest
 *   - parseText(text, context) → Promise<parsedData>
 *     单段文本解析
 */

const fs = wx.getFileSystemManager()

function createRecognizer() {
  const recorder = wx.getRecorderManager()
  let _onStart = null
  let _onStop = null
  let _onError = null
  let _onDuration = null
  let _recording = false
  let _startTime = 0
  let _durationTimer = null
  let _model = 'fun-asr'

  recorder.onStart(() => {
    _recording = true
    _startTime = Date.now()
    if (_durationTimer) clearInterval(_durationTimer)
    _durationTimer = setInterval(() => {
      if (_onDuration) _onDuration(Math.floor((Date.now() - _startTime) / 1000))
    }, 500)
    if (_onStart) _onStart()
  })

  recorder.onStop((res) => {
    _recording = false
    if (_durationTimer) {
      clearInterval(_durationTimer)
      _durationTimer = null
    }

    if (!res.tempFilePath) {
      if (_onError) _onError(new Error('录音文件为空'))
      return
    }

    const durationSec = (Date.now() - _startTime) / 1000
    if (durationSec < 1) {
      if (_onError) _onError(new Error('录音太短，请重试'))
      return
    }

    uploadAndRecognize(res.tempFilePath, durationSec)
  })

  recorder.onError((res) => {
    _recording = false
    if (_durationTimer) {
      clearInterval(_durationTimer)
      _durationTimer = null
    }
    if (_onError) _onError(new Error(res.errMsg || '录音失败'))
  })

  function uploadAndRecognize(filePath, durationSec) {
    const startedAt = Date.now()
    try {
      const buffer = fs.readFileSync(filePath)
      const base64 = wx.arrayBufferToBase64(buffer)

      wx.cloud.callFunction({
        name: 'recognizeSpeech',
        data: { audio: base64, format: 'pcm', model: _model },
        success: (res) => {
          const r = res.result
          if (r && r.success) {
            if (_onStop) {
              _onStop({
                rawText: r.data.rawText || '',
                asrModel: r.data.asrModel || _model,
                asrElapsedMs: r.data.asrElapsedMs || (Date.now() - startedAt),
                durationSec
              })
            }
          } else {
            if (_onError) _onError(new Error((r && r.error) || '识别失败'))
          }
        },
        fail: (err) => {
          if (_onError) _onError(new Error(err.errMsg || '云函数调用失败'))
        }
      })
    } catch (err) {
      if (_onError) _onError(new Error('读取录音失败：' + (err.message || err)))
    }
  }

  return {
    setModel(m) { if (m) _model = m },
    onStart(cb) { _onStart = cb },
    onStop(cb) { _onStop = cb },
    onDuration(cb) { _onDuration = cb },
    onError(cb) { _onError = cb },
    start(options = {}) {
      if (options.model) _model = options.model
      recorder.start({
        format: 'PCM',
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        frameSize: 50
      })
    },
    stop() {
      if (_recording) recorder.stop()
    },
    isRecording() { return _recording },
    destroy() {
      if (_durationTimer) {
        clearInterval(_durationTimer)
        _durationTimer = null
      }
      _onStart = null
      _onStop = null
      _onError = null
      _onDuration = null
    }
  }
}

/**
 * 多段原文 → AI 收敛 + 结构化字段
 */
function parseSegments(segments, context = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'parseSegments',
      data: {
        segments,
        memberNames: context.memberNames || [],
        courseTypes: context.courseTypes || [],
        locations: context.locations || [],
        focusAreaOptions: context.focusAreaOptions || [],
        today: context.today
      },
      success: (res) => {
        const r = res.result
        if (r && r.success) {
          resolve(r.data)
        } else {
          reject(new Error((r && r.error) || '解析失败'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '云函数调用失败'))
    })
  })
}

/**
 * 单段文本 → 结构化字段
 */
function parseText(text, context = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'parseVoiceSession',
      data: {
        text,
        memberNames: context.memberNames || [],
        courseTypes: context.courseTypes || [],
        locations: context.locations || [],
        focusAreaOptions: context.focusAreaOptions || [],
        today: context.today
      },
      success: (res) => {
        const r = res.result
        if (r && r.success) {
          resolve(r.data)
        } else {
          reject(new Error((r && r.error) || '解析失败'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '云函数调用失败'))
    })
  })
}

module.exports = { createRecognizer, parseSegments, parseText }
