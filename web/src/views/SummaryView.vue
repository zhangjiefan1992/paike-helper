<template>
  <div class="summary-page">
    <van-nav-bar title="课后总结" left-arrow @click-left="$router.back()" />

    <template v-if="session">
      <!-- 课程信息 -->
      <van-cell-group inset title="课程信息">
        <van-cell v-if="memberName" title="学员" :value="memberName" />
        <van-cell title="课程" :value="(session.courseType || '课程') + ' · ' + (session.duration || 60) + '分钟'" />
        <van-cell title="日期" :value="session.date + ' ' + session.startTime" />
        <van-cell v-if="session.location" title="地点" :value="session.location" />
      </van-cell-group>

      <!-- 课前/课后照片 -->
      <van-cell-group inset title="课前照片" v-if="beforePhotos.length || !sent">
        <div class="photos-section">
          <div class="photos-grid">
            <div v-for="(p, i) in beforePhotos" :key="'b'+i" class="photo-item">
              <img :src="p" class="photo-img" @click="previewPhoto(beforePhotos, i)" />
              <span v-if="!sent" class="photo-remove" @click="removePhoto('before', i)">×</span>
            </div>
            <label v-if="!sent && beforePhotos.length < 5" class="photo-add">
              <span class="photo-add__icon">+</span>
              <input type="file" accept="image/*" class="hidden-input" @change="onAddPhoto($event, 'before')" />
            </label>
          </div>
        </div>
      </van-cell-group>

      <van-cell-group inset title="课后照片" v-if="afterPhotos.length || !sent">
        <div class="photos-section">
          <div class="photos-grid">
            <div v-for="(p, i) in afterPhotos" :key="'a'+i" class="photo-item">
              <img :src="p" class="photo-img" @click="previewPhoto(afterPhotos, i)" />
              <span v-if="!sent" class="photo-remove" @click="removePhoto('after', i)">×</span>
            </div>
            <label v-if="!sent && afterPhotos.length < 5" class="photo-add">
              <span class="photo-add__icon">+</span>
              <input type="file" accept="image/*" class="hidden-input" @change="onAddPhoto($event, 'after')" />
            </label>
          </div>
        </div>
      </van-cell-group>

      <!-- 课后评估 -->
      <van-cell-group inset title="课后评估">
        <div class="summary-section">
          <div class="summary-header">
            <van-button v-if="!sent" size="small" plain type="success" :loading="aiLoading"
              loading-text="AI 生成中..." @click="onAIGenerate">
              AI 生成
            </van-button>
            <span v-if="!sent" class="summary-edit-btn" @click="isEditing = !isEditing">
              {{ isEditing ? '完成' : '编辑' }}
            </span>
          </div>
          <div v-if="aiLoading" class="ai-loading-hint">
            正在生成课后评估，预计 10~20 秒...
          </div>
          <div v-if="aiError" class="ai-error">
            {{ aiError }}
            <span class="ai-retry" @click="onAIGenerate">重试</span>
          </div>
          <textarea v-if="isEditing" v-model="summaryText" class="summary-textarea"
            placeholder="输入课后评估内容..." rows="6" maxlength="500" />
          <div v-else class="summary-text">
            {{ summaryText || '点击「AI 生成」或编辑按钮填写课后评估' }}
          </div>
        </div>
      </van-cell-group>

      <!-- 训练重点回顾 -->
      <van-cell-group inset title="训练重点" v-if="session.focusAreas?.length">
        <div class="focus-section">
          <span v-for="a in session.focusAreas" :key="a" class="focus-tag">{{ a }}</span>
        </div>
      </van-cell-group>

      <!-- 操作按钮 -->
      <div class="bottom-actions">
        <van-button v-if="isEditing" block round type="primary" color="#4A7C59" @click="onSaveEdit">
          保存评估
        </van-button>
        <van-button v-else-if="!sent" block round type="primary" color="#4A7C59" @click="onMarkSent">
          标记为已发送
        </van-button>
        <div v-else class="sent-badge">已发送 ✓</div>
      </div>
    </template>

    <div v-else class="empty">
      <p>课程不存在</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showImagePreview } from 'vant'
import * as storage from '../services/storage'
import { generateSummary } from '../services/api'

const route = useRoute()
const router = useRouter()

const session = ref(null)
const memberName = ref('')
const summaryText = ref('')
const isEditing = ref(false)
const sent = ref(false)
const beforePhotos = ref([])
const afterPhotos = ref([])
const aiLoading = ref(false)
const aiError = ref('')

onMounted(() => {
  const id = route.params.id
  if (!id) { router.back(); return }

  const s = storage.getSessionById(id)
  if (!s) {
    showToast('课程不存在')
    router.back()
    return
  }

  session.value = s
  summaryText.value = s.summaryText || ''
  sent.value = s.summarySent || false
  beforePhotos.value = s.beforePhotos || []
  afterPhotos.value = s.afterPhotos || []

  if (s.memberId) {
    const m = storage.getMemberById(s.memberId)
    if (m) memberName.value = m.name
  }

  if (!s.summaryText) isEditing.value = true
})

async function onAIGenerate() {
  const s = session.value
  if (!s) return

  aiLoading.value = true
  aiError.value = ''

  try {
    const member = s.memberId ? storage.getMemberById(s.memberId) : null
    const history = s.memberId ? storage.getSessionsByMemberId(s.memberId).filter(h => h.id !== s.id).slice(0, 5) : []

    const result = await generateSummary(
      { courseType: s.courseType, duration: s.duration, focusAreas: s.focusAreas, location: s.location, notes: s.notes },
      member ? { name: member.name } : {},
      history.map(h => ({ date: h.date, courseType: h.courseType, focusAreas: h.focusAreas, notes: h.notes }))
    )

    summaryText.value = result.text
    isEditing.value = false
    storage.updateSessionSummary(route.params.id, result.text)
    showToast({ message: 'AI 生成完成', type: 'success' })
  } catch (err) {
    aiError.value = err.message || 'AI 生成失败'
  } finally {
    aiLoading.value = false
  }
}

function onSaveEdit() {
  isEditing.value = false
  storage.updateSessionSummary(route.params.id, summaryText.value)
  showToast({ message: '已保存', type: 'success' })
}

function onMarkSent() {
  sent.value = true
  storage.markSummarySent(route.params.id)
  showToast({ message: '已标记发送', type: 'success' })
}

function previewPhoto(photos, index) {
  showImagePreview({ images: photos, startPosition: index })
}

function onAddPhoto(e, type) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const url = reader.result
    if (type === 'before') {
      beforePhotos.value = [...beforePhotos.value, url]
      session.value.beforePhotos = beforePhotos.value
    } else {
      afterPhotos.value = [...afterPhotos.value, url]
      session.value.afterPhotos = afterPhotos.value
    }
    storage.saveSession({ ...session.value })
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function removePhoto(type, index) {
  if (type === 'before') {
    beforePhotos.value = beforePhotos.value.filter((_, i) => i !== index)
    session.value.beforePhotos = beforePhotos.value
  } else {
    afterPhotos.value = afterPhotos.value.filter((_, i) => i !== index)
    session.value.afterPhotos = afterPhotos.value
  }
  storage.saveSession({ ...session.value })
}
</script>

<style scoped>
.summary-page { background: var(--bg-page); min-height: 100vh; }

.photos-section { padding: 12px 16px; }

.photos-grid {
  display: flex; flex-wrap: wrap; gap: 8px;
}

.photo-item {
  position: relative; width: 80px; height: 80px;
}

.photo-img {
  width: 100%; height: 100%; object-fit: cover;
  border-radius: 8px; cursor: pointer;
}

.photo-remove {
  position: absolute; top: -6px; right: -6px;
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(0,0,0,0.5); color: #fff;
  font-size: 14px; line-height: 20px; text-align: center;
  cursor: pointer;
}

.photo-add {
  width: 80px; height: 80px; border-radius: 8px;
  border: 1px dashed var(--bg-hairline);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; background: var(--bg-input);
}

.photo-add__icon {
  font-size: 24px; color: var(--text-muted);
}

.hidden-input { display: none; }

.summary-section { padding: 12px 16px; }

.summary-header {
  display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-bottom: 8px;
}

.summary-edit-btn {
  font-size: 13px; color: var(--color-primary); cursor: pointer;
}

.ai-loading-hint {
  text-align: center; padding: 12px; font-size: 13px; color: var(--text-muted);
}

.ai-error {
  padding: 8px 12px; margin-bottom: 8px; border-radius: 8px;
  background: #FFF3F0; color: #D03050; font-size: 13px;
}

.ai-retry {
  margin-left: 8px; color: var(--color-primary); cursor: pointer; text-decoration: underline;
}

.summary-textarea {
  width: 100%; padding: 12px; border: 1px solid var(--bg-hairline);
  border-radius: 8px; font-size: 14px; resize: none;
  background: var(--bg-input); color: var(--text-primary);
  box-sizing: border-box;
}

.summary-text {
  font-size: 14px; line-height: 1.8; color: var(--text-primary);
  white-space: pre-wrap;
}

.focus-section {
  display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px;
}

.focus-tag {
  padding: 4px 12px; border-radius: 999px;
  background: var(--color-primary-light); color: var(--color-primary);
  font-size: 13px;
}

.bottom-actions { padding: 20px 16px; }

.sent-badge {
  text-align: center; padding: 12px;
  font-size: 16px; font-weight: 600;
  color: var(--color-completed);
}

.empty { text-align: center; padding: 80px 20px; color: var(--text-muted); }
</style>
