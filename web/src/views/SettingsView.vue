<template>
  <div class="page">
    <header class="hdr">
      <h1 class="hdr__title">设置</h1>
      <p class="hdr__sub">预设、外观与数据</p>
    </header>

    <hr class="rule" />

    <!-- 预设：课程类型 -->
    <section class="block">
      <div class="block__head">
        <span class="block__label">课程类型</span>
        <span class="block__count" v-if="config.courseTypes?.length">{{ config.courseTypes.length }}</span>
      </div>
      <div class="chips" v-if="config.courseTypes?.length">
        <span v-for="(t, i) in config.courseTypes" :key="t" class="chip">
          {{ t }}
          <button class="chip__x" @click="removeItem('courseTypes', i)" aria-label="删除">
            <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="3" y1="9" x2="9" y2="3"/></svg>
          </button>
        </span>
      </div>
      <p class="empty-line" v-else>未添加</p>
      <div class="add">
        <input
          v-model="inputs.courseType"
          class="add__input"
          placeholder="新增课程类型"
          @keyup.enter="addItem('courseTypes', 'courseType')"
        />
        <button class="add__btn" @click="addItem('courseTypes', 'courseType')">添加</button>
      </div>
    </section>

    <hr class="rule" />

    <!-- 预设：常用地点 -->
    <section class="block">
      <div class="block__head">
        <span class="block__label">常用地点</span>
        <span class="block__count" v-if="config.locations?.length">{{ config.locations.length }}</span>
      </div>
      <div class="chips" v-if="config.locations?.length">
        <span v-for="(l, i) in config.locations" :key="l" class="chip">
          {{ l }}
          <button class="chip__x" @click="removeItem('locations', i)">
            <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="3" y1="9" x2="9" y2="3"/></svg>
          </button>
        </span>
      </div>
      <p class="empty-line" v-else>未添加</p>
      <div class="add">
        <input
          v-model="inputs.location"
          class="add__input"
          placeholder="新增地点"
          @keyup.enter="addItem('locations', 'location')"
        />
        <button class="add__btn" @click="addItem('locations', 'location')">添加</button>
      </div>
    </section>

    <hr class="rule" />

    <!-- 预设：训练重点 -->
    <section class="block">
      <div class="block__head">
        <span class="block__label">训练重点</span>
        <span class="block__count" v-if="config.focusAreaOptions?.length">{{ config.focusAreaOptions.length }}</span>
      </div>
      <div class="chips" v-if="config.focusAreaOptions?.length">
        <span v-for="(f, i) in config.focusAreaOptions" :key="f" class="chip">
          {{ f }}
          <button class="chip__x" @click="removeItem('focusAreaOptions', i)">
            <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="3" y1="9" x2="9" y2="3"/></svg>
          </button>
        </span>
      </div>
      <p class="empty-line" v-else>未添加</p>
      <div class="add">
        <input
          v-model="inputs.focusArea"
          class="add__input"
          placeholder="新增训练重点"
          @keyup.enter="addItem('focusAreaOptions', 'focusArea')"
        />
        <button class="add__btn" @click="addItem('focusAreaOptions', 'focusArea')">添加</button>
      </div>
    </section>

    <hr class="rule" />

    <!-- 周视图主题 -->
    <section class="block">
      <div class="block__head">
        <span class="block__label">周视图主题</span>
      </div>
      <div class="themes">
        <button
          v-for="t in themeOptions"
          :key="t.value"
          class="theme"
          :class="{ 'theme--active': config.weekTheme === t.value }"
          @click="selectTheme(t.value)"
        >
          <span class="theme__preview" :class="'theme-preview--' + t.value"></span>
          <span class="theme__name">{{ t.name }}</span>
        </button>
      </div>
    </section>

    <hr class="rule" />

    <!-- 默认设置 -->
    <section class="block">
      <div class="block__head">
        <span class="block__label">默认</span>
      </div>
      <div class="rows">
        <button class="row" @click="showDurationPicker = true">
          <span class="row__label">课程时长</span>
          <span class="row__val">{{ config.defaultDuration || 60 }} 分钟</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <button class="row" @click="openTimePicker('start')">
          <span class="row__label">工作开始</span>
          <span class="row__val">{{ config.workingHours?.start || '08:00' }}</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <button class="row" @click="openTimePicker('end')">
          <span class="row__label">工作结束</span>
          <span class="row__val">{{ config.workingHours?.end || '21:00' }}</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
    </section>

    <hr class="rule" />

    <!-- 工具 -->
    <section class="block">
      <div class="block__head">
        <span class="block__label">工具</span>
      </div>
      <div class="rows">
        <button class="row" @click="$router.push('/stats')">
          <span class="row__label">课程统计</span>
          <span class="row__val row__val--muted">查看数据</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
    </section>

    <hr class="rule" />

    <!-- 数据管理 -->
    <section class="block">
      <div class="block__head">
        <span class="block__label">数据</span>
      </div>
      <div class="rows">
        <button class="row" @click="onExport">
          <span class="row__label">导出 · JSON</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <label class="row row--label">
          <span class="row__label">导入 · JSON</span>
          <span class="row__val row__val--muted">选择文件</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
          <input type="file" accept=".json" @change="onImport" class="hidden-input" />
        </label>
        <button class="row" @click="onTextExport">
          <span class="row__label">导出 · 文本课表</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <button class="row" @click="showTextImport = true">
          <span class="row__label">导入 · 文本课表</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <button class="row row--danger" @click="onClearAll">
          <span class="row__label">清空所有数据</span>
          <svg class="row__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
    </section>

    <footer class="foot">
      <span class="foot__brand">排课助手</span>
      <span class="foot__ver">v1.0.0 · keleya.org</span>
    </footer>

    <!-- 文本导入弹窗 -->
    <van-popup v-model:show="showTextImport" position="bottom" round :style="{ height: '82%', background: 'var(--paper)' }">
      <div class="dialog">
        <header class="dialog__hdr">
          <h2 class="dialog__title">{{ textImportStep === 1 ? '粘贴课表' : '确认导入' }}</h2>
          <button class="dialog__close" @click="showTextImport = false" aria-label="关闭">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
          </button>
        </header>

        <div v-if="textImportStep === 1" class="dialog__body">
          <textarea
            v-model="textImportContent"
            class="dialog__area"
            placeholder="支持格式如：&#10;周一 09:00 普拉提 张三&#10;2025-01-20 10:00 瑜伽 李四 A教室"
            rows="12"
          ></textarea>
          <button class="dialog__cta" @click="onTextImportParse">解析课表</button>
        </div>

        <div v-else class="dialog__body">
          <div class="dialog__summary">
            识别到 <strong>{{ textImportParsed.length }}</strong> 节课程<span v-if="textImportSkipped > 0">，跳过 {{ textImportSkipped }} 行</span>
          </div>
          <div class="dialog__list">
            <label v-for="(item, idx) in textImportParsed" :key="idx" class="dialog__item">
              <input type="checkbox" v-model="item.checked" />
              <span class="dialog__item-text">{{ item.displayText }}</span>
            </label>
          </div>
          <div class="dialog__actions">
            <button class="dialog__cta dialog__cta--ghost" @click="textImportStep = 1">返回修改</button>
            <button class="dialog__cta" @click="onTextImportConfirm">导入 {{ textImportCheckedCount }} 节</button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- Duration Picker -->
    <van-popup v-model:show="showDurationPicker" position="bottom" round>
      <van-picker :columns="durationColumns" @confirm="onDurationConfirm" @cancel="showDurationPicker = false" />
    </van-popup>

    <!-- Time Picker -->
    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-time-picker :title="timePickerTitle" v-model="timePickerValue"
        @confirm="onTimeConfirm" @cancel="showTimePicker = false" />
    </van-popup>

    <div class="page__tail"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import * as storage from '../services/storage'
import { exportSessionsToText, parseTextToSessions } from '../utils/textImportExport'

const config = ref({})
const inputs = reactive({ courseType: '', location: '', focusArea: '' })

const themeOptions = [
  { name: '柔彩', value: 'soft-color' },
  { name: '渐变', value: 'candy-gradient' },
  { name: '轻盈', value: 'airy-tint' },
]

const showDurationPicker = ref(false)
const showTimePicker = ref(false)
const timePickerField = ref('start')
const timePickerValue = ref([])
const timePickerTitle = ref('选择时间')

const durationColumns = [
  { text: '30 分钟', value: 30 },
  { text: '45 分钟', value: 45 },
  { text: '60 分钟', value: 60 },
  { text: '90 分钟', value: 90 },
  { text: '120 分钟', value: 120 },
]

onMounted(() => {
  config.value = storage.getConfig()
  if (!config.value.workingHours) {
    config.value.workingHours = { start: '08:00', end: '21:00' }
  }
  if (!config.value.locations) {
    config.value.locations = []
  }
  if (!config.value.weekTheme) {
    config.value.weekTheme = 'airy-tint'
  }
})

function selectTheme(value) {
  config.value.weekTheme = value
  saveConfig()
}

function saveConfig() {
  storage.saveConfig({ ...config.value })
}

function addItem(field, inputKey) {
  const val = inputs[inputKey]?.trim()
  if (!val) return
  if (config.value[field].includes(val)) {
    showToast('已存在')
    return
  }
  config.value[field].push(val)
  inputs[inputKey] = ''
  saveConfig()
}

function removeItem(field, index) {
  config.value[field].splice(index, 1)
  saveConfig()
}

function onDurationConfirm({ selectedOptions }) {
  if (selectedOptions[0]) {
    config.value.defaultDuration = selectedOptions[0].value
    saveConfig()
  }
  showDurationPicker.value = false
}

function openTimePicker(field) {
  timePickerField.value = field
  timePickerTitle.value = field === 'start' ? '工作开始时间' : '工作结束时间'
  const time = config.value.workingHours?.[field] || (field === 'start' ? '08:00' : '21:00')
  timePickerValue.value = time.split(':')
  showTimePicker.value = true
}

function onTimeConfirm({ selectedValues }) {
  const time = selectedValues.join(':')
  config.value.workingHours[timePickerField.value] = time
  saveConfig()
  showTimePicker.value = false
}

function onExport() {
  const data = storage.exportAllData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `paike-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast({ message: '导出成功', type: 'success' })
}

function onImport(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      const result = storage.importData(data)
      showToast({ message: result.message, type: result.success ? 'success' : 'fail' })
      if (result.success) config.value = storage.getConfig()
    } catch {
      showToast('文件格式错误')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

// 文本导入导出
const showTextImport = ref(false)
const textImportStep = ref(1)
const textImportContent = ref('')
const textImportParsed = ref([])
const textImportSkipped = ref(0)

const textImportCheckedCount = computed(() =>
  textImportParsed.value.filter(item => item.checked).length
)

function onTextExport() {
  const sessions = storage.getSessions()
  const members = storage.getMembers()
  const text = exportSessionsToText(sessions, members)
  if (!text) {
    showToast('暂无课程数据')
    return
  }
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `paike-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showToast({ message: '导出成功', type: 'success' })
}

function onTextImportParse() {
  const text = textImportContent.value
  if (!text || !text.trim()) {
    showToast('请输入课程文本')
    return
  }

  const { results, skipped, errors } = parseTextToSessions(text)
  if (results.length === 0) {
    const msg = errors.length > 0 ? '解析失败: ' + errors[0].message : '未识别到有效课程'
    showToast(msg)
    return
  }

  textImportParsed.value = results.map(s => {
    const parts = [s.date, s.startTime, s.courseType]
    if (s._memberName) parts.push(s._memberName)
    if (s.location) parts.push(s.location)
    return { ...s, checked: true, displayText: parts.join(' ') }
  })
  textImportSkipped.value = skipped.length
  textImportStep.value = 2
}

function onTextImportConfirm() {
  const selected = textImportParsed.value.filter(item => item.checked)
  if (selected.length === 0) {
    showToast('请至少选择一节课程')
    return
  }
  const transientKeys = ['checked', 'displayText', '_raw', '_lineNum', '_memberName', '_weekday']
  selected.forEach(item => {
    const session = {}
    Object.keys(item).forEach(k => {
      if (!transientKeys.includes(k)) session[k] = item[k]
    })
    storage.saveSession(session)
  })
  showTextImport.value = false
  textImportStep.value = 1
  textImportContent.value = ''
  textImportParsed.value = []
  showToast({ message: '成功导入 ' + selected.length + ' 节', type: 'success' })
}

function onClearAll() {
  showConfirmDialog({
    title: '确认清空',
    message: '将删除所有会员和课程数据，不可恢复！'
  }).then(() => {
    localStorage.removeItem('pk_members')
    localStorage.removeItem('pk_sessions')
    localStorage.removeItem('pk_config')
    showToast('已清空')
    config.value = storage.getConfig()
  }).catch(() => {})
}
</script>

<style scoped>
.page {
  background: var(--paper);
  color: var(--ink-2);
  min-height: 100vh;
  font-family: var(--sans);
}

/* === Header === */
.hdr {
  padding: 26px 28px 22px;
}
.hdr__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: 38px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0 0 6px;
  font-variation-settings: 'opsz' 100;
}
.hdr__sub {
  font-family: var(--display);
  font-style: italic;
  font-weight: 300;
  font-size: 13px;
  color: var(--ink-3);
}

.rule {
  border: none;
  height: 1px;
  background: var(--rule);
  margin: 0 28px;
}

/* === Block === */
.block { padding: 22px 28px; }

.block__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}
.block__label {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 500;
}
.block__count {
  font-family: var(--display);
  font-weight: 300;
  font-size: 12px;
  color: var(--ink-4);
  font-variation-settings: 'opsz' 14;
}

/* === Chips (preset items) === */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 12px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  color: var(--ink-2);
  letter-spacing: 0.01em;
}
.chip__x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--ink-4);
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.chip__x:active {
  background: var(--rule-soft);
  color: var(--warm);
}

.empty-line {
  font-size: 12px;
  color: var(--ink-4);
  font-style: italic;
  font-family: var(--display);
  margin-bottom: 14px;
}

/* === Add input === */
.add {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rule);
}
.add__input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--ink);
  font-family: inherit;
}
.add__input::placeholder {
  color: var(--ink-4);
  letter-spacing: 0.04em;
}
.add__btn {
  background: transparent;
  border: none;
  color: var(--ink-2);
  font-size: 13px;
  letter-spacing: 0.06em;
  padding: 4px 0 4px 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.add__btn:active { color: var(--primary); }

/* === Themes === */
.themes {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.theme {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s;
}
.theme--active {
  border-color: var(--ink);
}
.theme__preview {
  display: block;
  width: 56px;
  height: 38px;
  border-radius: 6px;
  border: 1px solid var(--rule);
}
.theme-preview--soft-color {
  background: linear-gradient(135deg, #E8EDFF 0%, #FFF0E6 50%, #E6F9F0 100%);
}
.theme-preview--candy-gradient {
  background: linear-gradient(135deg, #667EEA 0%, #F093FB 50%, #4FACFE 100%);
}
.theme-preview--airy-tint {
  background: linear-gradient(135deg, #F0F4FF 0%, #FFF7ED 50%, #ECFDF5 100%);
}
.theme__name {
  font-size: 11.5px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}
.theme--active .theme__name { color: var(--ink); }

/* === Rows === */
.rows {
  display: flex;
  flex-direction: column;
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--rule-soft);
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
  width: 100%;
}
.row:last-child { border-bottom: none; }
.row:active { background: rgba(74, 124, 89, 0.04); }
.row__label {
  flex: 1;
  font-size: 14px;
  color: var(--ink);
  letter-spacing: 0.01em;
}
.row__val {
  font-family: var(--display);
  font-size: 13.5px;
  color: var(--ink-2);
  letter-spacing: 0.01em;
}
.row__val--muted { color: var(--ink-4); font-style: italic; }
.row__chev { color: var(--ink-4); flex-shrink: 0; }
.row--label { position: relative; }
.row--danger .row__label { color: var(--warm); }
.row--danger:active { background: rgba(181, 87, 61, 0.05); }

.hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

/* === Footer === */
.foot {
  padding: 36px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.foot__brand {
  font-family: var(--display);
  font-weight: 400;
  font-size: 14px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}
.foot__ver {
  font-size: 11px;
  color: var(--ink-4);
  letter-spacing: 0.06em;
}

.page__tail { height: 24px; }

/* === Dialog (text import) === */
.dialog {
  padding: 24px 24px calc(env(safe-area-inset-bottom) + 24px);
  background: var(--paper);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}
.dialog__hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.dialog__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: 22px;
  color: var(--ink);
  margin: 0;
  letter-spacing: -0.01em;
}
.dialog__close {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none;
  color: var(--ink-3);
  border-radius: 50%;
  cursor: pointer;
}
.dialog__close:active { background: var(--rule-soft); }

.dialog__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.dialog__area {
  flex: 1;
  width: 100%;
  padding: 14px 16px;
  background: var(--rule-soft);
  border: 1px solid var(--rule);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink);
  font-family: inherit;
  resize: none;
  box-sizing: border-box;
  outline: none;
}
.dialog__area:focus {
  border-color: var(--ink-3);
}

.dialog__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--ink);
  color: var(--paper);
  border: none;
  border-radius: 999px;
  font-size: 13.5px;
  letter-spacing: 0.06em;
  cursor: pointer;
  font-family: inherit;
}
.dialog__cta:active { background: var(--ink-2); }
.dialog__cta--ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--ink-2);
}

.dialog__summary {
  font-size: 13px;
  color: var(--ink-2);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rule);
}
.dialog__summary strong {
  font-family: var(--display);
  font-weight: 500;
  color: var(--ink);
}
.dialog__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.dialog__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule-soft);
  cursor: pointer;
}
.dialog__item input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--ink);
}
.dialog__item-text {
  flex: 1;
  font-size: 13.5px;
  color: var(--ink-2);
  line-height: 1.5;
}
.dialog__actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}
.dialog__actions .dialog__cta { flex: 1; }
</style>
