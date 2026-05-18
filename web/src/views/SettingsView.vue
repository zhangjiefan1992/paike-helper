<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-header__title">我的</h2>
    </div>

    <!-- 预设配置 -->
    <van-cell-group inset title="课程类型">
      <div class="preset-section">
        <div class="tag-list">
          <span v-for="(t, i) in config.courseTypes" :key="t" class="preset-tag">
            {{ t }}
            <span class="preset-tag__delete" @click="removeItem('courseTypes', i)">×</span>
          </span>
        </div>
        <div class="add-row">
          <input v-model="inputs.courseType" class="add-row__input" placeholder="添加课程类型"
            @keyup.enter="addItem('courseTypes', 'courseType')" />
          <span class="add-row__btn" @click="addItem('courseTypes', 'courseType')">添加</span>
        </div>
      </div>
    </van-cell-group>

    <van-cell-group inset title="常用地点">
      <div class="preset-section">
        <div class="tag-list">
          <span v-for="(l, i) in config.locations" :key="l" class="preset-tag">
            {{ l }}
            <span class="preset-tag__delete" @click="removeItem('locations', i)">×</span>
          </span>
          <span v-if="!config.locations?.length" class="preset-empty">暂无，添加常用上课地点</span>
        </div>
        <div class="add-row">
          <input v-model="inputs.location" class="add-row__input" placeholder="添加地点"
            @keyup.enter="addItem('locations', 'location')" />
          <span class="add-row__btn" @click="addItem('locations', 'location')">添加</span>
        </div>
      </div>
    </van-cell-group>

    <van-cell-group inset title="训练重点">
      <div class="preset-section">
        <div class="tag-list">
          <span v-for="(f, i) in config.focusAreaOptions" :key="f" class="preset-tag">
            {{ f }}
            <span class="preset-tag__delete" @click="removeItem('focusAreaOptions', i)">×</span>
          </span>
        </div>
        <div class="add-row">
          <input v-model="inputs.focusArea" class="add-row__input" placeholder="添加训练重点"
            @keyup.enter="addItem('focusAreaOptions', 'focusArea')" />
          <span class="add-row__btn" @click="addItem('focusAreaOptions', 'focusArea')">添加</span>
        </div>
      </div>
    </van-cell-group>

    <van-cell-group inset title="周视图主题">
      <div class="theme-section">
        <div
          v-for="t in themeOptions" :key="t.value"
          class="theme-card"
          :class="{ 'theme-card--active': config.weekTheme === t.value }"
          @click="selectTheme(t.value)"
        >
          <div class="theme-card__preview" :class="'theme-preview--' + t.value"></div>
          <span class="theme-card__name">{{ t.name }}</span>
        </div>
      </div>
    </van-cell-group>

    <van-cell-group inset title="默认设置">
      <van-cell title="默认时长" is-link @click="showDurationPicker = true"
        :value="config.defaultDuration + ' 分钟'" />
      <van-cell title="工作开始时间" is-link @click="openTimePicker('start')"
        :value="config.workingHours?.start || '08:00'" />
      <van-cell title="工作结束时间" is-link @click="openTimePicker('end')"
        :value="config.workingHours?.end || '21:00'" />
    </van-cell-group>

    <!-- 快捷入口 -->
    <van-cell-group inset title="工具">
      <van-cell title="课程统计" is-link @click="$router.push('/stats')" value="查看数据" />
    </van-cell-group>

    <!-- 数据管理 -->
    <van-cell-group inset title="数据管理">
      <van-cell title="导出数据 (JSON)" is-link @click="onExport" />
      <van-cell title="导入数据 (JSON)" is-link>
        <template #right-icon>
          <label class="import-label">
            选择文件
            <input type="file" accept=".json" @change="onImport" class="hidden-input" />
          </label>
        </template>
      </van-cell>
      <van-cell title="导出课表 (文本)" is-link @click="onTextExport" />
      <van-cell title="导入课表 (文本)" is-link @click="showTextImport = true" />
      <van-cell title="清空所有数据" is-link @click="onClearAll" />
    </van-cell-group>

    <van-cell-group inset title="关于">
      <van-cell title="排课助手 H5" value="v1.0.0" />
    </van-cell-group>

    <!-- 文本导入弹窗 -->
    <van-popup v-model:show="showTextImport" position="bottom" round :style="{ height: '80%' }">
      <div class="text-import">
        <div class="text-import__header">
          <span class="text-import__title">{{ textImportStep === 1 ? '粘贴课表文本' : '确认导入' }}</span>
          <span class="text-import__close" @click="showTextImport = false">×</span>
        </div>

        <div v-if="textImportStep === 1" class="text-import__body">
          <textarea v-model="textImportContent" class="text-import__area"
            placeholder="粘贴课程文本，支持格式如：&#10;周一 09:00 普拉提 张三&#10;2025-01-20 10:00 瑜伽 李四 A教室"
            rows="12"></textarea>
          <van-button block round type="primary" @click="onTextImportParse" color="#4A7C59">
            解析课表
          </van-button>
        </div>

        <div v-else class="text-import__body">
          <div class="text-import__summary">
            识别到 {{ textImportParsed.length }} 节课程
            <span v-if="textImportSkipped > 0">，跳过 {{ textImportSkipped }} 行</span>
          </div>
          <div class="text-import__list">
            <div v-for="(item, idx) in textImportParsed" :key="idx" class="text-import__item"
              @click="item.checked = !item.checked">
              <van-checkbox v-model="item.checked" shape="square" />
              <span class="text-import__item-text">{{ item.displayText }}</span>
            </div>
          </div>
          <div class="text-import__actions">
            <van-button plain round @click="textImportStep = 1">返回修改</van-button>
            <van-button round type="primary" @click="onTextImportConfirm" color="#4A7C59">
              导入 {{ textImportCheckedCount }} 节
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <div style="height: 80px"></div>

    <!-- Duration Picker -->
    <van-popup v-model:show="showDurationPicker" position="bottom" round>
      <van-picker :columns="durationColumns" @confirm="onDurationConfirm" @cancel="showDurationPicker = false" />
    </van-popup>

    <!-- Time Picker -->
    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-time-picker :title="timePickerTitle" v-model="timePickerValue"
        @confirm="onTimeConfirm" @cancel="showTimePicker = false" />
    </van-popup>
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
.settings-page { background: var(--bg-page); min-height: 100vh; }

.page-header { padding: 20px 20px 8px; }
.page-header__title { font-size: 22px; font-weight: 700; }

.preset-section { padding: 12px 16px; }

.tag-list { display: flex; flex-wrap: wrap; gap: 8px; min-height: 32px; }

.preset-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--radius-pill);
  background: var(--color-primary-light); color: var(--color-primary);
  font-size: 13px; font-weight: 500;
}

.preset-tag__delete {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  font-size: 12px; line-height: 1; cursor: pointer;
  color: var(--color-primary); opacity: 0.6;
  transition: opacity 0.2s;
}
.preset-tag__delete:hover { opacity: 1; }

.preset-empty { font-size: 13px; color: var(--text-muted); line-height: 32px; }

.add-row {
  display: flex; align-items: center; gap: 8px; margin-top: 10px;
}

.add-row__input {
  flex: 1; height: 34px; padding: 0 12px;
  border: 1px solid var(--bg-hairline); border-radius: var(--radius-pill);
  font-size: 13px; background: var(--bg-input); color: var(--text-primary);
  outline: none; transition: border-color 0.2s;
}
.add-row__input:focus { border-color: var(--color-primary); }

.add-row__btn {
  padding: 6px 14px; border-radius: var(--radius-pill);
  background: var(--color-primary); color: #fff;
  font-size: 13px; font-weight: 500; cursor: pointer;
  white-space: nowrap; transition: opacity 0.2s;
}
.add-row__btn:active { opacity: 0.8; }

.import-label {
  color: var(--color-primary); font-size: 14px; cursor: pointer;
}
.hidden-input { display: none; }

.theme-section {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.theme-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: border-color 0.2s, transform 0.15s;
}

.theme-card--active {
  border-color: var(--color-primary);
}

.theme-card:active {
  transform: scale(0.95);
}

.theme-card__preview {
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.theme-preview--soft-color {
  background: #F5F7FA;
  background-image:
    linear-gradient(180deg, transparent 30%, #E8EDFF 30%, #E8EDFF 50%, transparent 50%),
    linear-gradient(180deg, transparent 55%, #FFF0E6 55%, #FFF0E6 75%, transparent 75%),
    linear-gradient(180deg, transparent 80%, #E6F9F0 80%, #E6F9F0 95%, transparent 95%);
}

.theme-preview--candy-gradient {
  background: #F8F6FF;
  background-image:
    linear-gradient(180deg, transparent 30%, transparent 30%);
}

.theme-preview--candy-gradient::before {
  content: "";
  position: absolute;
  top: 25%; left: 10%; right: 10%; height: 22%;
  border-radius: 6px;
  background: linear-gradient(135deg, #667EEA, #764BA2);
}

.theme-preview--candy-gradient::after {
  content: "";
  position: absolute;
  top: 52%; left: 10%; right: 10%; height: 22%;
  border-radius: 6px;
  background: linear-gradient(135deg, #F093FB, #F5576C);
}

.theme-preview--airy-tint {
  background: #FAFBFD;
  background-image:
    linear-gradient(180deg, transparent 30%, #F0F4FF 30%, #F0F4FF 50%, transparent 50%),
    linear-gradient(180deg, transparent 55%, #FFF7ED 55%, #FFF7ED 75%, transparent 75%),
    linear-gradient(180deg, transparent 80%, #ECFDF5 80%, #ECFDF5 95%, transparent 95%);
}

.theme-card__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.theme-card--active .theme-card__name {
  color: var(--color-primary);
}

.text-import { display: flex; flex-direction: column; height: 100%; }
.text-import__header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid var(--bg-hairline);
}
.text-import__title { font-size: 16px; font-weight: 600; }
.text-import__close { font-size: 24px; cursor: pointer; color: var(--text-secondary); }
.text-import__body { flex: 1; padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.text-import__area {
  width: 100%; flex: 1; min-height: 200px;
  padding: 12px; border: 1px solid var(--bg-hairline);
  border-radius: 8px; font-size: 14px; resize: none;
  background: var(--bg-input); color: var(--text-primary);
}
.text-import__summary { font-size: 14px; color: var(--text-secondary); }
.text-import__list { flex: 1; overflow-y: auto; }
.text-import__item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid var(--bg-hairline);
  cursor: pointer;
}
.text-import__item-text { font-size: 14px; }
.text-import__actions { display: flex; gap: 12px; padding-top: 12px; }
.text-import__actions .van-button { flex: 1; }
</style>
