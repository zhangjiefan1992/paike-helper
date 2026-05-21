<template>
  <div class="voice-input">
    <div class="voice-entry" @click="showPanel = true">
      <span class="voice-entry__icon">🎙</span>
      <span class="voice-entry__text">语音录课</span>
    </div>

    <van-popup
      v-model:show="showPanel"
      position="bottom"
      round
      :close-on-click-overlay="state !== 'recording' && state !== 'asr' && state !== 'parsing'"
      :style="{ minHeight: '460px', maxHeight: '92vh' }"
    >
      <div class="voice-panel">
        <div class="voice-panel__header">
          <span>语音录入</span>
          <span class="voice-panel__close" @click="onClose">×</span>
        </div>

        <!-- 模式 + 模型选择 -->
        <div class="top-bar">
          <div class="mode-toggle">
            <div
              class="mode-btn"
              :class="{ 'mode-btn--active': mode === 'single' }"
              @click="onModeChange('single')"
            >单次</div>
            <div
              class="mode-btn"
              :class="{ 'mode-btn--active': mode === 'multi' }"
              @click="onModeChange('multi')"
            >多段</div>
          </div>
          <div class="model-selector__chips">
            <div
              v-for="m in ASR_MODELS"
              :key="m.value"
              class="model-chip"
              :class="{ 'model-chip--active': selectedModel === m.value }"
              @click="onModelChange(m.value)"
            >{{ m.label }}</div>
          </div>
        </div>

        <!-- 多段：片段列表 -->
        <div class="section" v-if="mode === 'multi' && (segments.length > 0 || state === 'asr')">
          <div class="section__title">
            <span>🎬 已录片段 ({{ segments.length }})</span>
            <span class="section__hint" v-if="state === 'asr'">
              <van-loading size="12px" /> 识别第 {{ segments.length + 1 }} 段...
            </span>
          </div>
          <div class="segments-list">
            <div class="segment-item" v-for="(seg, idx) in segments" :key="idx">
              <div class="segment-item__head">
                <span class="segment-item__index">片段 {{ idx + 1 }}</span>
                <span class="segment-item__meta">{{ seg.asrModel }} · {{ (seg.elapsedMs / 1000).toFixed(1) }}s</span>
                <span class="segment-item__del" @click="onDeleteSegment(idx)">删除</span>
              </div>
              <textarea
                class="segment-item__text"
                v-model="seg.rawText"
                rows="2"
                placeholder="可编辑识别原文"
              />
            </div>
            <div class="segment-item segment-item--loading" v-if="state === 'asr'">
              <span>正在识别...</span>
            </div>
          </div>
        </div>

        <!-- 单段：识别原文 -->
        <div class="section" v-if="mode === 'single' && (rawText || state === 'asr' || state === 'parsing')">
          <div class="section__title">
            <span>📝 识别原文</span>
            <span class="section__hint" v-if="state === 'asr'">
              <van-loading size="12px" /> 语音识别中...
            </span>
            <span class="section__hint section__hint--ok" v-else-if="rawText && asrElapsedMs">
              ✓ {{ (asrElapsedMs / 1000).toFixed(1) }}s
            </span>
            <span class="section__hint" v-else-if="rawText && state === 'review'">可编辑后重新解析</span>
          </div>
          <textarea
            v-if="state === 'review'"
            class="raw-text-edit"
            v-model="editableText"
            rows="3"
          />
          <div class="raw-text-display raw-text-display--loading" v-else-if="state === 'asr'">
            正在调用 ASR ({{ selectedModel }})...
          </div>
          <div class="raw-text-display" v-else>{{ rawText }}</div>
        </div>

        <!-- AI 课程档案（多段模式） -->
        <div class="section" v-if="mode === 'multi' && (aiDigest || state === 'parsing')">
          <div class="section__title">
            <span>📋 课程档案</span>
            <span class="section__hint" v-if="state === 'parsing'">
              <van-loading size="12px" /> 收敛档案中...
            </span>
            <span class="section__hint section__hint--ok" v-else-if="aiDigest && llmElapsedMs">
              ✓ {{ (llmElapsedMs / 1000).toFixed(1) }}s
            </span>
          </div>
          <textarea
            v-if="state === 'review' && aiDigest"
            class="digest-edit"
            v-model="aiDigest"
            rows="6"
          />
          <div class="digest-display digest-display--loading" v-else-if="state === 'parsing'">
            分析片段中，归纳本次课程档案...
          </div>
        </div>

        <!-- 解析结果 -->
        <div class="section" v-if="state === 'parsing' || (parsedData && state === 'review')">
          <div class="section__title">
            <span>🤖 自动填表预览</span>
            <span class="section__hint section__hint--ok" v-if="parsedData && llmElapsedMs && mode === 'single'">
              {{ parsedFieldCount }} 个字段 · {{ (llmElapsedMs / 1000).toFixed(1) }}s
            </span>
            <span class="section__hint section__hint--ok" v-else-if="parsedData">
              {{ parsedFieldCount }} 个字段
            </span>
          </div>
          <div class="parsed-fields parsed-fields--loading" v-if="state === 'parsing' && mode === 'single'">
            <span>分析语义结构中...</span>
          </div>
          <div class="parsed-fields" v-else-if="parsedData">
            <div class="parsed-row" v-for="row in parsedRows" :key="row.label">
              <span class="parsed-row__label">{{ row.label }}</span>
              <span class="parsed-row__value" :class="{ 'parsed-row__value--empty': !row.value }">
                {{ row.value || '—' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 录音区 -->
        <div class="record-section" v-if="canShowRecordBtn">
          <div
            class="record-btn"
            :class="{ 'record-btn--active': state === 'recording' }"
            @touchstart.prevent="onRecordStart"
            @touchend.prevent="onRecordStop"
            @mousedown.prevent="onRecordStart"
            @mouseup.prevent="onRecordStop"
          >
            <div class="record-btn__inner">
              <div class="record-btn__ripple" v-if="state === 'recording'"></div>
              <span class="record-btn__icon">🎤</span>
            </div>
            <span class="record-btn__label">
              {{ recordBtnLabel }}
            </span>
          </div>
          <div class="record-tip" v-if="state === 'idle' && mode === 'single'">
            示例："明天下午三点给张三上普拉提，旺君馆"
          </div>
          <div class="record-tip" v-else-if="state === 'idle' && mode === 'multi' && segments.length === 0">
            可以分多次按住说话，最后统一生成课程档案
          </div>
          <div class="record-tip record-tip--error" v-if="state === 'error'">
            ⚠ {{ errorMsg }}
          </div>
        </div>

        <!-- 多段：完成本次记录按钮 -->
        <div class="finalize-section" v-if="mode === 'multi' && segments.length > 0 && state !== 'asr' && state !== 'parsing' && state !== 'review'">
          <van-button type="primary" block @click="onFinalizeMulti" :loading="finalizing">
            ✨ 完成本次记录（共 {{ segments.length }} 段）
          </van-button>
        </div>

        <!-- 审核操作 -->
        <div class="review-actions" v-if="state === 'review'">
          <van-button size="small" plain @click="onReparse" :loading="reparsing" v-if="mode === 'single'">
            🔄 重新解析
          </van-button>
          <van-button size="small" plain @click="onDiscard">
            重新录入
          </van-button>
          <van-button size="small" type="primary" @click="onApply">
            ✓ 应用到表单
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'
import { createAudioRecorder } from '../utils/audioRecorder'
import { recognizeSpeech, parseTextSession, parseSegments } from '../services/api'

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

const props = defineProps({
  members: { type: Array, default: () => [] },
  config: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['result'])

const showPanel = ref(false)
// state: idle | recording | asr | parsing | review | error
const state = ref('idle')
const mode = ref(localStorage.getItem(MODE_KEY) || 'single')
const rawText = ref('')
const editableText = ref('')
const parsedData = ref(null)
const aiDigest = ref('')
const segments = ref([])
const errorMsg = ref('')
const duration = ref(0)
const reparsing = ref(false)
const finalizing = ref(false)
const selectedModel = ref(localStorage.getItem(ASR_MODEL_KEY) || 'fun-asr')
const lastUsedModel = ref('')
const asrElapsedMs = ref(0)
const llmElapsedMs = ref(0)

let recorder = null

const durationLabel = computed(() => {
  const s = duration.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

const parsedRows = computed(() => {
  if (!parsedData.value) return []
  const d = parsedData.value
  return [
    { label: '日期', value: d.date },
    { label: '时间', value: d.startTime },
    { label: '时长', value: d.duration ? `${d.duration} 分钟` : null },
    { label: '授课模式', value: d.classMode === 'private' ? '私教' : d.classMode === 'group' ? '团课' : null },
    { label: '会员', value: d.memberName },
    { label: '课程类型', value: d.courseType },
    { label: '地点', value: d.location },
    { label: '训练重点', value: d.focusAreas?.length ? d.focusAreas.join('、') : null },
    { label: '备注', value: d.notes }
  ]
})

const parsedFieldCount = computed(() => parsedRows.value.filter(r => r.value).length)

const canShowRecordBtn = computed(() => {
  if (state.value === 'recording') return true
  if (state.value === 'idle' || state.value === 'error') return true
  // 多段模式下，已有片段时仍可继续录新片段
  if (mode.value === 'multi' && state.value !== 'asr' && state.value !== 'parsing' && state.value !== 'review') return true
  return false
})

const recordBtnLabel = computed(() => {
  if (state.value === 'recording') return `松开结束 ${durationLabel.value}`
  if (mode.value === 'multi' && segments.value.length > 0) return '按住续录'
  return '按住说话'
})

function onModeChange(m) {
  if (m === mode.value) return
  if (state.value === 'recording' || state.value === 'asr' || state.value === 'parsing') {
    showToast('请先完成或取消当前操作')
    return
  }
  mode.value = m
  localStorage.setItem(MODE_KEY, m)
  resetState()
}

function onModelChange(value) {
  selectedModel.value = value
  localStorage.setItem(ASR_MODEL_KEY, value)
}

function buildContext() {
  return {
    memberNames: props.members.map(m => m.name),
    courseTypes: props.config.courseTypes || [],
    locations: props.config.locations || [],
    focusAreaOptions: props.config.focusAreaOptions || [],
    today: new Date().toISOString().slice(0, 10)
  }
}

function resetState() {
  state.value = 'idle'
  rawText.value = ''
  editableText.value = ''
  parsedData.value = null
  aiDigest.value = ''
  segments.value = []
  errorMsg.value = ''
  duration.value = 0
  asrElapsedMs.value = 0
  llmElapsedMs.value = 0
}

async function onRecordStart() {
  if (state.value === 'recording' || state.value === 'asr' || state.value === 'parsing') return

  // 单段模式：每次开始录音前清掉旧结果
  if (mode.value === 'single') {
    rawText.value = ''
    parsedData.value = null
    aiDigest.value = ''
    editableText.value = ''
    asrElapsedMs.value = 0
    llmElapsedMs.value = 0
  }
  errorMsg.value = ''
  duration.value = 0
  state.value = 'recording'

  try {
    recorder = createAudioRecorder()
    recorder.setOnDurationChange((d) => { duration.value = d })
    await recorder.start()
  } catch (err) {
    state.value = 'error'
    if (err.name === 'NotAllowedError') {
      errorMsg.value = '麦克风权限被拒绝，请在浏览器设置中允许'
    } else {
      errorMsg.value = '录音启动失败: ' + (err.message || '未知错误')
    }
  }
}

async function onRecordStop() {
  if (state.value !== 'recording') return

  const blob = await recorder.stop()
  recorder.destroy()
  recorder = null

  if (!blob || duration.value < 1) {
    state.value = mode.value === 'multi' && segments.value.length > 0 ? 'idle' : 'idle'
    showToast('录音太短，请重试')
    return
  }

  // Phase 1: ASR
  state.value = 'asr'
  const asrStart = Date.now()
  let asrResult
  try {
    asrResult = await recognizeSpeech(blob, selectedModel.value)
  } catch (err) {
    state.value = 'error'
    errorMsg.value = err.message || '语音识别失败，请重试'
    return
  }

  const elapsed = asrResult.asrElapsedMs || (Date.now() - asrStart)

  if (mode.value === 'multi') {
    // 多段：累积到 segments，不立刻 LLM
    segments.value.push({
      rawText: asrResult.rawText || '',
      asrModel: asrResult.asrModel || selectedModel.value,
      recordedAt: Date.now(),
      elapsedMs: elapsed
    })
    state.value = 'idle'
    return
  }

  // 单段：继续走 LLM 解析
  asrElapsedMs.value = elapsed
  rawText.value = asrResult.rawText || ''
  editableText.value = rawText.value
  lastUsedModel.value = asrResult.asrModel || selectedModel.value

  state.value = 'parsing'
  const llmStart = Date.now()
  try {
    const data = await parseTextSession(rawText.value, buildContext())
    llmElapsedMs.value = data.llmElapsedMs || (Date.now() - llmStart)
    parsedData.value = data
    state.value = 'review'
  } catch (err) {
    parsedData.value = null
    llmElapsedMs.value = Date.now() - llmStart
    state.value = 'review'
    showToast(err.message || 'AI 解析失败，可手动编辑后重新解析')
  }
}

function onDeleteSegment(idx) {
  segments.value.splice(idx, 1)
}

async function onFinalizeMulti() {
  if (segments.value.length === 0) {
    showToast('请先录制至少一段语音')
    return
  }
  const validSegments = segments.value.filter(s => s.rawText && s.rawText.trim())
  if (validSegments.length === 0) {
    showToast('所有片段都是空的，请重录')
    return
  }

  finalizing.value = true
  state.value = 'parsing'
  const llmStart = Date.now()
  try {
    const data = await parseSegments(
      validSegments.map(s => ({ rawText: s.rawText.trim(), asrModel: s.asrModel })),
      buildContext()
    )
    llmElapsedMs.value = data.llmElapsedMs || (Date.now() - llmStart)
    aiDigest.value = data.aiDigest || ''
    parsedData.value = data
    rawText.value = data.rawText || validSegments.map(s => s.rawText).join('\n\n')
    state.value = 'review'
  } catch (err) {
    state.value = 'idle'
    showToast(err.message || 'AI 收敛失败，请重试')
  } finally {
    finalizing.value = false
  }
}

async function onReparse() {
  const text = editableText.value.trim()
  if (!text) {
    showToast('原文不能为空')
    return
  }

  reparsing.value = true
  const start = Date.now()
  try {
    const data = await parseTextSession(text, buildContext())
    rawText.value = text
    parsedData.value = data
    llmElapsedMs.value = data.llmElapsedMs || (Date.now() - start)
    showSuccessToast({ message: '已重新解析', forbidClick: true })
  } catch (err) {
    showToast(err.message || '解析失败')
  } finally {
    reparsing.value = false
  }
}

function onDiscard() {
  resetState()
}

function onApply() {
  if (!parsedData.value) return
  const data = {
    ...parsedData.value,
    voiceSegments: mode.value === 'multi'
      ? segments.value.map(s => ({ rawText: s.rawText, asrModel: s.asrModel, recordedAt: s.recordedAt }))
      : (rawText.value ? [{ rawText: rawText.value, asrModel: lastUsedModel.value || selectedModel.value, recordedAt: Date.now() }] : []),
    aiDigest: aiDigest.value || ''
  }
  showPanel.value = false
  setTimeout(() => {
    emit('result', data)
    resetState()
  }, 250)
}

function onClose() {
  if (recorder) {
    recorder.destroy()
    recorder = null
  }
  resetState()
  showPanel.value = false
}
</script>

<style scoped>
.voice-entry {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin: 12px 16px; padding: 10px; border-radius: 8px;
  border: 1px dashed var(--color-primary, #4A7C59);
  color: var(--color-primary, #4A7C59); cursor: pointer;
  background: var(--bg-card, #fff);
}
.voice-entry__icon { font-size: 18px; }
.voice-entry__text { font-size: 14px; font-weight: 500; }

.voice-panel { padding: 16px 16px 24px; }
.voice-panel__header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 16px; font-weight: 500; margin-bottom: 12px;
}
.voice-panel__close { font-size: 22px; cursor: pointer; color: #999; }

.top-bar {
  display: flex; flex-direction: column; gap: 8px;
  background: var(--bg-input, #f5f5f5); border-radius: 8px;
  padding: 10px 12px; margin-bottom: 12px;
}
.mode-toggle {
  display: flex; gap: 4px; background: #fff;
  padding: 3px; border-radius: 6px; align-self: flex-start;
}
.mode-btn {
  padding: 4px 14px; font-size: 12px; cursor: pointer;
  color: #666; border-radius: 4px; user-select: none;
}
.mode-btn--active {
  background: var(--color-primary, #4A7C59); color: #fff;
}

.section { margin-bottom: 14px; }
.section__title {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; color: #666; margin-bottom: 6px;
}
.section__hint {
  font-size: 11px; color: #999;
  display: inline-flex; align-items: center; gap: 4px;
}
.section__hint--ok { color: var(--color-primary, #4A7C59); }

.segments-list {
  display: flex; flex-direction: column; gap: 8px;
}
.segment-item {
  background: var(--bg-input, #f5f5f5); border-radius: 8px;
  padding: 8px 10px;
}
.segment-item--loading {
  text-align: center; padding: 12px; color: #999; font-style: italic; font-size: 13px;
}
.segment-item__head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: #999; margin-bottom: 4px;
}
.segment-item__index { color: var(--color-primary, #4A7C59); font-weight: 500; }
.segment-item__meta { flex: 1; padding: 0 8px; }
.segment-item__del {
  color: #e74c3c; cursor: pointer;
  padding: 2px 6px; border-radius: 4px;
}
.segment-item__text {
  width: 100%; padding: 6px 8px; border-radius: 6px;
  background: #fff; border: 1px solid #e0e0e0;
  font-size: 13px; line-height: 1.5;
  resize: vertical; font-family: inherit; box-sizing: border-box;
  color: var(--text-primary, #333);
}

.raw-text-edit {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  background: var(--bg-input, #f5f5f5);
  border: 1px solid #e0e0e0; font-size: 14px; line-height: 1.6;
  color: var(--text-primary, #333); resize: vertical;
  font-family: inherit; box-sizing: border-box;
}
.raw-text-edit:focus, .digest-edit:focus, .segment-item__text:focus {
  outline: none; border-color: var(--color-primary, #4A7C59);
}

.raw-text-display, .digest-display {
  padding: 10px 12px; border-radius: 8px;
  background: var(--bg-input, #f5f5f5);
  font-size: 14px; line-height: 1.6;
  color: var(--text-primary, #333);
  min-height: 40px;
}
.raw-text-display--loading, .digest-display--loading { color: #999; font-style: italic; }

.digest-edit {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  background: var(--bg-input, #f5f5f5);
  border: 1px solid #e0e0e0; font-size: 14px; line-height: 1.7;
  color: var(--text-primary, #333); resize: vertical;
  font-family: inherit; box-sizing: border-box;
}

.parsed-fields {
  background: var(--bg-input, #f5f5f5); border-radius: 8px;
  padding: 8px 12px;
}
.parsed-fields--loading {
  padding: 12px; text-align: center;
  color: #999; font-style: italic; font-size: 13px;
}
.parsed-row {
  display: flex; padding: 4px 0; font-size: 13px;
  border-bottom: 1px solid #ececec;
}
.parsed-row:last-child { border-bottom: none; }
.parsed-row__label { color: #666; min-width: 72px; }
.parsed-row__value {
  flex: 1; color: var(--text-primary, #333); word-break: break-all;
}
.parsed-row__value--empty { color: #ccc; }

.record-section {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 12px 0;
}

.record-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.record-btn__inner {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--color-primary, #4A7C59); display: flex;
  align-items: center; justify-content: center; position: relative;
  transition: transform 0.2s; cursor: pointer;
  user-select: none; -webkit-user-select: none;
}
.record-btn--active .record-btn__inner { transform: scale(1.1); background: #F28B82; }
.record-btn__icon { font-size: 24px; position: relative; z-index: 1; }
.record-btn__label { font-size: 12px; color: #666; }

.record-btn__ripple {
  position: absolute; inset: -8px; border-radius: 50%;
  border: 2px solid #F28B82; animation: ripple 1.2s infinite;
}

@keyframes ripple {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}

.record-tip {
  font-size: 12px; color: #999;
  text-align: center; padding: 0 16px;
}
.record-tip--error { color: #e74c3c; }

.finalize-section {
  padding: 8px 0 4px;
}

.review-actions {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 8px; border-top: 1px solid #ececec; margin-top: 8px;
}
.review-actions :deep(.van-button) { font-size: 13px; }

.model-selector__chips {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.model-chip {
  padding: 4px 10px; border-radius: 12px;
  background: #fff; border: 1px solid #ddd;
  font-size: 11px; color: #666; cursor: pointer;
  user-select: none; -webkit-user-select: none;
}
.model-chip--active {
  background: var(--color-primary, #4A7C59);
  border-color: var(--color-primary, #4A7C59);
  color: #fff;
}
</style>
