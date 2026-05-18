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
      :close-on-click-overlay="state !== 'recording' && state !== 'uploading'"
      :style="{ minHeight: '420px', maxHeight: '90vh' }"
    >
      <div class="voice-panel">
        <div class="voice-panel__header">
          <span>语音录入</span>
          <span class="voice-panel__close" @click="onClose">×</span>
        </div>

        <!-- ASR 模型选择器 -->
        <div class="model-selector">
          <span class="model-selector__label">识别模型</span>
          <div class="model-selector__chips">
            <div
              v-for="m in ASR_MODELS"
              :key="m.value"
              class="model-chip"
              :class="{ 'model-chip--active': selectedModel === m.value }"
              @click="onModelChange(m.value)"
            >
              {{ m.label }}
            </div>
          </div>
          <span class="model-selector__hint" v-if="lastUsedModel && rawText">
            本次：{{ ASR_MODELS.find(m => m.value === lastUsedModel)?.label || lastUsedModel }}
          </span>
        </div>

        <!-- 识别原文（始终可见，识别完成后可编辑+重新解析） -->
        <div class="section" v-if="rawText || state === 'uploading'">
          <div class="section__title">
            <span>📝 识别原文</span>
            <span class="section__hint" v-if="rawText && state === 'review'">可编辑后重新解析</span>
          </div>
          <textarea
            v-if="state === 'review'"
            class="raw-text-edit"
            v-model="editableText"
            rows="3"
            placeholder="识别结果会显示在这里"
          />
          <div class="raw-text-display" v-else-if="state === 'uploading'">
            <van-loading size="14px" /> 识别中...
          </div>
          <div class="raw-text-display" v-else>{{ rawText }}</div>
        </div>

        <!-- 解析结果 -->
        <div class="section" v-if="parsedData && state === 'review'">
          <div class="section__title">
            <span>🤖 AI 解析结果</span>
            <span class="section__hint">{{ parsedFieldCount }} 个字段</span>
          </div>
          <div class="parsed-fields">
            <div class="parsed-row" v-for="row in parsedRows" :key="row.label">
              <span class="parsed-row__label">{{ row.label }}</span>
              <span class="parsed-row__value" :class="{ 'parsed-row__value--empty': !row.value }">
                {{ row.value || '—' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 录音区（无结果时显示） -->
        <div class="record-section" v-if="state === 'idle' || state === 'recording' || state === 'error'">
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
              {{ state === 'recording' ? `松开结束 ${durationLabel}` : '按住说话' }}
            </span>
          </div>
          <div class="record-tip" v-if="state === 'idle'">
            示例："明天下午三点给张三上普拉提，旺君馆"
          </div>
          <div class="record-tip record-tip--error" v-if="state === 'error'">
            ⚠ {{ errorMsg }}
          </div>
        </div>

        <!-- 审核操作 -->
        <div class="review-actions" v-if="state === 'review'">
          <van-button size="small" plain @click="onReparse" :loading="reparsing">
            🔄 重新解析
          </van-button>
          <van-button size="small" plain @click="onDiscard">
            重新录音
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
import { showToast } from 'vant'
import { createAudioRecorder } from '../utils/audioRecorder'
import { parseVoiceSession, parseTextSession } from '../services/api'

const props = defineProps({
  members: { type: Array, default: () => [] },
  config: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['result'])

const ASR_MODELS = [
  { value: 'paraformer-v2', label: 'paraformer-v2' },
  { value: 'paraformer-v1', label: 'paraformer-v1' },
  { value: 'paraformer-mtl-v1', label: 'paraformer-mtl' },
  { value: 'paraformer-8k-v1', label: 'paraformer-8k' },
  { value: 'sensevoice-v1', label: 'sensevoice' },
  { value: 'fun-asr', label: 'fun-asr' }
]
const ASR_MODEL_KEY = 'pk_asr_model'

const showPanel = ref(false)
const state = ref('idle') // idle | recording | uploading | review | error
const rawText = ref('')
const editableText = ref('')
const parsedData = ref(null)
const errorMsg = ref('')
const duration = ref(0)
const reparsing = ref(false)
const selectedModel = ref(localStorage.getItem(ASR_MODEL_KEY) || 'paraformer-v2')
const lastUsedModel = ref('')

let recorder = null

function onModelChange(value) {
  selectedModel.value = value
  localStorage.setItem(ASR_MODEL_KEY, value)
}

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
  errorMsg.value = ''
  duration.value = 0
}

async function onRecordStart() {
  if (state.value === 'recording' || state.value === 'uploading') return

  resetState()
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
    state.value = 'idle'
    showToast('录音太短，请重试')
    return
  }

  state.value = 'uploading'

  try {
    const data = await parseVoiceSession(blob, buildContext(), selectedModel.value)
    rawText.value = data.rawText || ''
    editableText.value = rawText.value
    parsedData.value = data
    lastUsedModel.value = data.asrModel || selectedModel.value
    state.value = 'review'
  } catch (err) {
    state.value = 'error'
    errorMsg.value = err.message || '识别失败，请重试'
  }
}

async function onReparse() {
  const text = editableText.value.trim()
  if (!text) {
    showToast('原文不能为空')
    return
  }

  reparsing.value = true
  try {
    const data = await parseTextSession(text, buildContext())
    rawText.value = text
    parsedData.value = data
    showToast('已重新解析')
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
  emit('result', parsedData.value)
  showToast({ message: `已应用 ${parsedFieldCount.value} 个字段`, type: 'success' })
  setTimeout(() => {
    showPanel.value = false
    resetState()
  }, 400)
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
  font-size: 16px; font-weight: 500; margin-bottom: 16px;
}
.voice-panel__close { font-size: 22px; cursor: pointer; color: #999; }

.model-selector {
  margin-bottom: 12px; padding: 10px 12px;
  background: var(--bg-input, #f5f5f5); border-radius: 8px;
}
.model-selector__label {
  font-size: 12px; color: #666; display: block; margin-bottom: 6px;
}
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
.model-selector__hint {
  display: block; margin-top: 6px;
  font-size: 11px; color: #999;
}

.section { margin-bottom: 16px; }
.section__title {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; color: #666; margin-bottom: 6px;
}
.section__hint { font-size: 11px; color: #999; }

.raw-text-edit {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  background: var(--bg-input, #f5f5f5);
  border: 1px solid #e0e0e0; font-size: 14px; line-height: 1.6;
  color: var(--text-primary, #333); resize: vertical;
  font-family: inherit; box-sizing: border-box;
}
.raw-text-edit:focus {
  outline: none; border-color: var(--color-primary, #4A7C59);
}

.raw-text-display {
  padding: 10px 12px; border-radius: 8px;
  background: var(--bg-input, #f5f5f5);
  font-size: 14px; line-height: 1.6;
  color: var(--text-primary, #333);
  min-height: 40px;
}

.parsed-fields {
  background: var(--bg-input, #f5f5f5); border-radius: 8px;
  padding: 8px 12px;
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

.review-actions {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 8px; border-top: 1px solid #ececec;
}
.review-actions :deep(.van-button) { font-size: 13px; }
</style>
