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
    console.log('[ASR] recorder.onStart fired')
    _recording = true
    _startTime = Date.now()
    if (_durationTimer) clearInterval(_durationTimer)
    _durationTimer = setInterval(() => {
      if (_onDuration) _onDuration(Math.floor((Date.now() - _startTime) / 1000))
    }, 500)
    if (_onStart) _onStart()
  })

  recorder.onStop((res) => {
    console.log('[ASR] recorder.onStop fired', { tempFilePath: res.tempFilePath, fileSize: res.fileSize, duration: res.duration })
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
    console.error('[ASR] recorder.onError fired:', res)
    _recording = false
    if (_durationTimer) {
      clearInterval(_durationTimer)
      _durationTimer = null
    }
    if (_onError) _onError(new Error(res.errMsg || '录音失败'))
  })

  function uploadAndRecognize(filePath, durationSec) {
    const startedAt = Date.now()
    console.log('[ASR] uploadAndRecognize start', { filePath, durationSec, model: _model })

    let base64
    try {
      const buffer = fs.readFileSync(filePath)
      console.log('[ASR] raw buffer byteLength:', buffer.byteLength)
      base64 = wx.arrayBufferToBase64(buffer)
      console.log('[ASR] base64 string length:', base64.length)
    } catch (err) {
      console.error('[ASR] readFileSync failed:', err)
      if (_onError) _onError(new Error('读取录音失败：' + (err.message || JSON.stringify(err))))
      return
    }

    if (!base64 || base64.length === 0) {
      if (_onError) _onError(new Error('录音文件为空'))
      return
    }

    console.log('[ASR] calling cloud function recognizeSpeech...')
    wx.cloud.callFunction({
      name: 'recognizeSpeech',
      data: { audio: base64, format: 'mp3', model: _model },
      success: (res) => {
        console.log('[ASR] cloud function returned:', res)
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
        console.error('[ASR] cloud function failed:', err)
        if (_onError) _onError(new Error(err.errMsg || '云函数调用失败：' + JSON.stringify(err)))
      }
    })
  }

  return {
    setModel(m) { if (m) _model = m },
    onStart(cb) { _onStart = cb },
    onStop(cb) { _onStop = cb },
    onDuration(cb) { _onDuration = cb },
    onError(cb) { _onError = cb },
    start(options = {}) {
      if (options.model) _model = options.model
      console.log('[ASR] recorder.start invoked, model=', _model)
      recorder.start({
        format: 'mp3',
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000
      })
    },
    stop() {
      console.log('[ASR] recognizer.stop called, _recording=', _recording)
      // 强制停止，避免某些机型 _recording 标志位与实际状态不一致
      try { recorder.stop() } catch (e) { console.error('[ASR] recorder.stop error:', e) }
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
