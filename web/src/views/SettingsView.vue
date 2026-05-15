<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-header__title">我的</h2>
    </div>

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

    <van-cell-group inset title="预设配置">
      <van-cell title="课程类型">
        <template #value>
          <span class="cell-hint">{{ config.courseTypes?.join('、') }}</span>
        </template>
      </van-cell>
      <van-cell title="默认时长" :value="config.defaultDuration + ' 分钟'" />
    </van-cell-group>

    <van-cell-group inset title="关于">
      <van-cell title="排课助手 H5" value="v1.0.0" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import * as storage from '../services/storage'

const config = ref({})

onMounted(() => { config.value = storage.getConfig() })

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

.cell-hint {
  font-size: 12px; color: var(--text-muted);
  max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.import-label {
  color: var(--color-primary); font-size: 14px; cursor: pointer;
}
.hidden-input { display: none; }
</style>
