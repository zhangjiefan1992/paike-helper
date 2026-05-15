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

    <van-cell-group inset title="默认设置">
      <van-cell title="默认时长" is-link @click="showDurationPicker = true"
        :value="config.defaultDuration + ' 分钟'" />
      <van-cell title="工作开始时间" is-link @click="openTimePicker('start')"
        :value="config.workingHours?.start || '08:00'" />
      <van-cell title="工作结束时间" is-link @click="openTimePicker('end')"
        :value="config.workingHours?.end || '21:00'" />
    </van-cell-group>

    <!-- 数据管理 -->
    <van-cell-group inset title="数据管理">
      <van-cell title="导出数据" is-link @click="onExport" />
      <van-cell title="导入数据" is-link>
        <template #right-icon>
          <label class="import-label">
            选择文件
            <input type="file" accept=".json" @change="onImport" class="hidden-input" />
          </label>
        </template>
      </van-cell>
      <van-cell title="清空所有数据" is-link @click="onClearAll" />
    </van-cell-group>

    <van-cell-group inset title="关于">
      <van-cell title="排课助手 H5" value="v1.0.0" />
    </van-cell-group>

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
import { ref, reactive, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import * as storage from '../services/storage'

const config = ref({})
const inputs = reactive({ courseType: '', location: '', focusArea: '' })

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
})

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
</style>
