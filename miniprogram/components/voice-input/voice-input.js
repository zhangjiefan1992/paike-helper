const { createRecognizer, parseText, parseSegments } = require('../../utils/speechRecognizer')

const ASR_MODELS = [
  { value: 'fun-asr', label: 'fun-asr' },
  { value: 'paraformer-v2', label: 'paraformer-v2' },
  { value: 'paraformer-v1', label: 'paraformer-v1' },
  { value: 'paraformer-mtl-v1', label: 'paraformer-mtl' },
  { value: 'paraformer-8k-v1', label: 'paraformer-8k' },
  { value: 'sensevoice-v1', label: 'sensevoice' }
]

const ASR_MODEL_KEY = 'pk_asr_model'
const MODE_KEY = 'pk_voice_mode'

Component({
  properties: {
    members: { type: Array, value: [] },
    config: { type: Object, value: {} }
  },

  data: {
    showPanel: false,
    // mode: single | multi
    mode: 'single',
    // state: idle | recording | asr | parsing | review | error
    state: 'idle',
    recording: false,
    selectedModel: 'fun-asr',
    asrModels: ASR_MODELS,
    rawText: '',
    parsedData: null,
    aiDigest: '',
    segments: [],
    parsedFields: [],
    parsedFieldCount: 0,
    asrElapsedMs: 0,
    llmElapsedMs: 0,
    duration: 0,
    durationLabel: '0:00',
    recordBtnLabel: '按住说话',
    errorMsg: '',
    reparsing: false,
    finalizing: false
  },

  lifetimes: {
    attached() {
      const savedModel = wx.getStorageSync(ASR_MODEL_KEY) || 'fun-asr'
      const savedMode = wx.getStorageSync(MODE_KEY) || 'single'
      this.setData({ selectedModel: savedModel, mode: savedMode })
    },
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
      this.setData({ showPanel: true })
      this._resetState(false)
    },

    onClose() {
      if (this._recognizer && this.data.recording) {
        this._recognizer.stop()
      }
      this.setData({ showPanel: false })
      this._resetState(true)
    },

    _resetState(clearMode) {
      const update = {
        state: 'idle',
        recording: false,
        rawText: '',
        parsedData: null,
        aiDigest: '',
        segments: [],
        parsedFields: [],
        parsedFieldCount: 0,
        asrElapsedMs: 0,
        llmElapsedMs: 0,
        duration: 0,
        durationLabel: '0:00',
        errorMsg: '',
        recordBtnLabel: '按住说话'
      }
      if (clearMode) update.mode = wx.getStorageSync(MODE_KEY) || 'single'
      this.setData(update)
    },

    onSingleMode() {
      if (this.data.state === 'asr' || this.data.state === 'parsing' || this.data.state === 'recording') {
        wx.showToast({ title: '请先完成当前操作', icon: 'none' })
        return
      }
      wx.setStorageSync(MODE_KEY, 'single')
      this.setData({ mode: 'single' })
      this._resetState(false)
    },

    onMultiMode() {
      if (this.data.state === 'asr' || this.data.state === 'parsing' || this.data.state === 'recording') {
        wx.showToast({ title: '请先完成当前操作', icon: 'none' })
        return
      }
      wx.setStorageSync(MODE_KEY, 'multi')
      this.setData({ mode: 'multi', recordBtnLabel: '按住说话' })
      this._resetState(false)
      this.setData({ mode: 'multi' })
    },

    onModelChange(e) {
      const value = e.currentTarget.dataset.value
      this.setData({ selectedModel: value })
      wx.setStorageSync(ASR_MODEL_KEY, value)
    },

    _buildContext() {
      const config = this.properties.config || {}
      const members = this.properties.members || []
      const today = this._today()
      return {
        memberNames: members.map(m => m.name),
        courseTypes: config.courseTypes || [],
        locations: config.locations || [],
        focusAreaOptions: config.focusAreaOptions || [],
        today
      }
    },

    _today() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },

    onRecordStart() {
      if (['asr', 'parsing', 'recording'].includes(this.data.state)) return

      // 单段模式：开始新录音时清掉旧结果
      if (this.data.mode === 'single') {
        this.setData({
          rawText: '',
          parsedData: null,
          parsedFields: [],
          asrElapsedMs: 0,
          llmElapsedMs: 0
        })
      }
      this.setData({ errorMsg: '', state: 'recording', recording: true, duration: 0, durationLabel: '0:00' })

      this._recognizer = createRecognizer()
      this._recognizer.setModel(this.data.selectedModel)

      this._recognizer.onDuration((sec) => {
        this.setData({
          duration: sec,
          durationLabel: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
        })
      })

      this._recognizer.onStop((res) => {
        this._handleAsrResult(res)
      })

      this._recognizer.onError((err) => {
        this.setData({
          recording: false,
          state: 'error',
          errorMsg: err.message || '识别失败'
        })
      })

      this._recognizer.start({ model: this.data.selectedModel })
    },

    onRecordStop() {
      if (!this.data.recording) return
      this.setData({ recording: false, state: 'asr' })
      if (this._recognizer) this._recognizer.stop()
    },

    async _handleAsrResult(res) {
      const { rawText, asrModel, asrElapsedMs } = res

      if (this.data.mode === 'multi') {
        const segments = this.data.segments.concat([{
          rawText,
          asrModel: asrModel || this.data.selectedModel,
          recordedAt: Date.now(),
          elapsedMs: asrElapsedMs || 0
        }])
        this.setData({ segments, state: 'idle' })
        return
      }

      // 单段：继续 LLM 解析
      this.setData({ rawText, asrElapsedMs, state: 'parsing' })
      const llmStart = Date.now()
      try {
        const data = await parseText(rawText, this._buildContext())
        this._setParsedData(data, Date.now() - llmStart)
        this.setData({ state: 'review' })
      } catch (err) {
        this.setData({ state: 'review', llmElapsedMs: Date.now() - llmStart })
        wx.showToast({ title: err.message || '解析失败，可手动编辑', icon: 'none' })
      }
    },

    onEditRawText(e) {
      this.setData({ rawText: e.detail.value })
    },

    onEditSegment(e) {
      const idx = e.currentTarget.dataset.idx
      const segments = this.data.segments.slice()
      segments[idx] = { ...segments[idx], rawText: e.detail.value }
      this.setData({ segments })
    },

    onDeleteSegment(e) {
      const idx = e.currentTarget.dataset.idx
      const segments = this.data.segments.slice()
      segments.splice(idx, 1)
      this.setData({ segments })
    },

    onEditDigest(e) {
      this.setData({ aiDigest: e.detail.value })
    },

    async onFinalizeMulti() {
      const segs = this.data.segments.filter(s => s.rawText && s.rawText.trim())
      if (segs.length === 0) {
        wx.showToast({ title: '请先录制至少一段', icon: 'none' })
        return
      }

      this.setData({ finalizing: true, state: 'parsing', llmElapsedMs: 0 })
      const start = Date.now()
      try {
        const data = await parseSegments(
          segs.map(s => ({ rawText: s.rawText.trim(), asrModel: s.asrModel })),
          this._buildContext()
        )
        const elapsed = data.llmElapsedMs || (Date.now() - start)
        this.setData({
          aiDigest: data.aiDigest || '',
          rawText: data.rawText || segs.map(s => s.rawText).join('\n\n')
        })
        this._setParsedData(data, elapsed)
        this.setData({ state: 'review' })
      } catch (err) {
        this.setData({ state: 'idle' })
        wx.showToast({ title: err.message || 'AI 收敛失败', icon: 'none' })
      } finally {
        this.setData({ finalizing: false })
      }
    },

    async onReparse() {
      const text = this.data.rawText.trim()
      if (!text) {
        wx.showToast({ title: '原文不能为空', icon: 'none' })
        return
      }
      this.setData({ reparsing: true })
      const start = Date.now()
      try {
        const data = await parseText(text, this._buildContext())
        this._setParsedData(data, Date.now() - start)
        wx.showToast({ title: '已重新解析', icon: 'success' })
      } catch (err) {
        wx.showToast({ title: err.message || '解析失败', icon: 'none' })
      } finally {
        this.setData({ reparsing: false })
      }
    },

    onDiscard() {
      this._resetState(false)
    },

    onApply() {
      if (!this.data.parsedData) return
      const data = {
        ...this.data.parsedData,
        voiceSegments: this.data.mode === 'multi'
          ? this.data.segments.map(s => ({ rawText: s.rawText, asrModel: s.asrModel, recordedAt: s.recordedAt }))
          : (this.data.rawText ? [{
              rawText: this.data.rawText,
              asrModel: this.data.selectedModel,
              recordedAt: Date.now()
            }] : []),
        aiDigest: this.data.aiDigest || ''
      }
      this.triggerEvent('result', data)
      this.setData({ showPanel: false })
      this._resetState(true)
    },

    _setParsedData(data, llmElapsedMs) {
      const rows = [
        { label: '日期', value: data.date },
        { label: '时间', value: data.startTime },
        { label: '时长', value: data.duration ? `${data.duration} 分钟` : null },
        { label: '授课模式', value: data.classMode === 'private' ? '私教' : data.classMode === 'group' ? '团课' : null },
        { label: '会员', value: data.memberName },
        { label: '课程类型', value: data.courseType },
        { label: '地点', value: data.location },
        { label: '训练重点', value: (data.focusAreas && data.focusAreas.length) ? data.focusAreas.join('、') : null },
        { label: '备注', value: data.notes }
      ]
      const count = rows.filter(r => r.value).length
      this.setData({
        parsedData: data,
        parsedFields: rows,
        parsedFieldCount: count,
        llmElapsedMs
      })
    }
  }
})
