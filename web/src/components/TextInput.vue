<template>
  <div class="text-input">
    <div class="text-entry" v-if="!expanded" @click="expanded = true">
      <span class="text-entry__icon">⌨</span>
      <span class="text-entry__text">快速录课</span>
      <span class="text-entry__hint">试试："明天3点张三普拉提"</span>
    </div>

    <div class="text-panel" v-if="expanded">
      <div class="text-panel__header">
        <span>快速录课</span>
        <span class="text-panel__close" @click="onClose">×</span>
      </div>
      <div class="text-panel__body">
        <textarea
          ref="inputRef"
          v-model="inputText"
          class="text-panel__textarea"
          placeholder="输入排课内容，如：&#10;明天下午3点给张三上普拉提，旺君馆&#10;周五同一时间李四瑜伽核心训练"
          rows="3"
          @keydown.enter.ctrl="onSubmit"
          @keydown.enter.meta="onSubmit"
        ></textarea>
        <div class="text-panel__actions">
          <span class="text-panel__tip">支持自然语言，AI 自动解析</span>
          <van-button size="small" type="primary" color="#4A7C59"
            :loading="loading" loading-text="解析中..."
            :disabled="!inputText.trim()" @click="onSubmit">
            解析
          </van-button>
        </div>
      </div>
      <div class="text-panel__error" v-if="errorMsg">
        {{ errorMsg }}
        <van-button size="mini" plain @click="errorMsg = ''">关闭</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { showToast } from 'vant'
import { parseTextSession } from '../services/api'

const props = defineProps({
  members: { type: Array, default: () => [] },
  config: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['result'])

const expanded = ref(false)
const inputText = ref('')
const loading = ref(false)
const errorMsg = ref('')
const inputRef = ref(null)

watch(expanded, (val) => {
  if (val) {
    nextTick(() => inputRef.value?.focus())
  }
})

async function onSubmit() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const today = new Date().toISOString().slice(0, 10)
    const context = {
      memberNames: props.members.map(m => m.name),
      courseTypes: props.config.courseTypes || [],
      locations: props.config.locations || [],
      focusAreaOptions: props.config.focusAreaOptions || [],
      today
    }

    const data = await parseTextSession(text, context)
    emit('result', data)

    let count = 0
    ;['date', 'startTime', 'duration', 'courseType', 'classMode', 'location', 'notes'].forEach(k => {
      if (data[k]) count++
    })
    if (data.focusAreas?.length) count++
    if (data.memberName) count++

    showToast({ message: `已识别 ${count} 个字段`, type: 'success' })
    inputText.value = ''
    expanded.value = false
  } catch (err) {
    errorMsg.value = err.message || '解析失败，请重试'
  } finally {
    loading.value = false
  }
}

function onClose() {
  expanded.value = false
  inputText.value = ''
  errorMsg.value = ''
}
</script>

<style scoped>
.text-entry {
  display: flex; align-items: center; gap: 6px;
  margin: 0 16px 12px; padding: 10px; border-radius: 8px;
  border: 1px dashed var(--color-primary, #4A7C59);
  color: var(--color-primary, #4A7C59); cursor: pointer;
  background: var(--bg-card, #fff);
}
.text-entry__icon { font-size: 16px; }
.text-entry__text { font-size: 14px; font-weight: 500; }
.text-entry__hint { font-size: 12px; color: #999; margin-left: auto; }

.text-panel {
  margin: 0 16px 12px; border-radius: 12px;
  background: var(--bg-card, #fff);
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  overflow: hidden;
}
.text-panel__header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; font-size: 14px; font-weight: 500;
  border-bottom: 1px solid var(--bg-input, #f0f0f0);
}
.text-panel__close { font-size: 20px; cursor: pointer; color: #999; }

.text-panel__body { padding: 12px 14px; }

.text-panel__textarea {
  width: 100%; border: 1px solid var(--bg-input, #e8e8e8); border-radius: 8px;
  padding: 10px 12px; font-size: 14px; line-height: 1.6; resize: none;
  color: var(--text-primary, #333); background: var(--bg-input, #f9f9f9);
  outline: none; transition: border-color 0.2s;
}
.text-panel__textarea:focus { border-color: var(--color-primary, #4A7C59); }

.text-panel__actions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px;
}
.text-panel__tip { font-size: 12px; color: #999; }

.text-panel__error {
  padding: 8px 14px 12px; font-size: 13px; color: #e74c3c;
  display: flex; align-items: center; gap: 8px;
}
</style>
