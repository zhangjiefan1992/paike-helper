<template>
  <div class="session-page">
    <van-nav-bar :title="isEdit ? '编辑课程' : '新增课程'" left-arrow @click-left="$router.back()">
      <template #right v-if="isEdit">
        <span class="delete-btn" @click="onDelete">删除</span>
      </template>
    </van-nav-bar>

    <VoiceInput v-if="!isEdit" :members="members" :config="config" @result="onVoiceResult" />
    <TextInput v-if="!isEdit" :members="members" :config="config" @result="onVoiceResult" />

    <van-form @submit="onSave">
      <!-- 日期时间 -->
      <van-cell-group inset title="基本信息">
        <van-field v-model="form.date" label="日期" required is-link readonly
          @click="showDatePicker = true" placeholder="选择日期" />
        <van-field v-model="form.startTime" label="时间" required is-link readonly
          @click="showTimePicker = true" placeholder="选择时间" />
        <van-field label="时长">
          <template #input>
            <div class="duration-chips">
              <span v-for="d in [30,45,60,90,120]" :key="d"
                class="chip" :class="{ 'chip--active': form.duration === d }"
                @click="form.duration = d">{{ d }}min</span>
            </div>
          </template>
        </van-field>
      </van-cell-group>

      <!-- 课程类型 -->
      <van-cell-group inset title="课程信息">
        <van-field label="类型" required>
          <template #input>
            <div class="tag-list">
              <span v-for="t in config.courseTypes" :key="t"
                class="chip" :class="{ 'chip--active': form.courseType === t }"
                @click="form.courseType = t">{{ t }}</span>
            </div>
          </template>
        </van-field>
        <van-field label="地点">
          <template #input>
            <div class="location-select">
              <div class="tag-list" v-if="config.locations?.length">
                <span v-for="l in config.locations" :key="l"
                  class="chip" :class="{ 'chip--active': form.location === l }"
                  @click="form.location = form.location === l ? '' : l">{{ l }}</span>
              </div>
              <input v-model="form.location" class="inline-input" placeholder="选择或输入地点" />
            </div>
          </template>
        </van-field>
      </van-cell-group>

      <!-- 课程模式 & 会员 -->
      <van-cell-group inset title="上课模式">
        <van-field label="模式">
          <template #input>
            <div class="duration-chips">
              <span class="chip" :class="{ 'chip--active': form.classMode === 'private' }"
                @click="form.classMode = 'private'; form.memberIds = []">私教</span>
              <span class="chip" :class="{ 'chip--active': form.classMode === 'group' }"
                @click="form.classMode = 'group'; form.memberId = ''">团课</span>
            </div>
          </template>
        </van-field>
        <van-field v-if="form.classMode === 'private'" label="会员" required is-link readonly
          :model-value="selectedMemberName" placeholder="选择会员"
          @click="showMemberPicker = true" />
        <van-field v-if="form.classMode === 'group'" label="参课会员">
          <template #input>
            <div class="tag-list">
              <span v-for="m in members" :key="m.id"
                class="chip" :class="{ 'chip--active': form.memberIds.includes(m.id) }"
                @click="toggleGroupMember(m.id)">{{ m.name }}</span>
            </div>
          </template>
        </van-field>
      </van-cell-group>

      <!-- 训练重点 -->
      <van-cell-group inset title="训练重点">
        <van-field label="">
          <template #input>
            <div class="tag-list">
              <span v-for="a in config.focusAreaOptions" :key="a"
                class="chip" :class="{ 'chip--active': form.focusAreas.includes(a) }"
                @click="toggleFocusArea(a)">{{ a }}</span>
            </div>
          </template>
        </van-field>
      </van-cell-group>

      <!-- 状态 & 备注 -->
      <van-cell-group inset title="状态">
        <van-field label="状态">
          <template #input>
            <div class="duration-chips">
              <span v-for="s in statusOptions" :key="s.value"
                class="chip" :class="'chip--status-' + s.value + (form.status === s.value ? ' chip--active' : '')"
                @click="form.status = s.value">{{ s.label }}</span>
            </div>
          </template>
        </van-field>
        <van-field v-model="form.notes" label="备注" type="textarea" rows="2"
          autosize placeholder="课程备注..." />
      </van-cell-group>

      <!-- 照片 -->
      <van-cell-group inset title="照片记录">
        <van-field label="课程照片">
          <template #input>
            <van-uploader v-model="photoFiles" :max-count="9" :after-read="(f) => onAfterRead(f, 'photos')"
              :before-delete="(f, d) => onPhotoDelete(d, 'photos')" />
          </template>
        </van-field>
        <van-field label="课前照片">
          <template #input>
            <van-uploader v-model="beforePhotoFiles" :max-count="5" :after-read="(f) => onAfterRead(f, 'beforePhotos')"
              :before-delete="(f, d) => onPhotoDelete(d, 'beforePhotos')" />
          </template>
        </van-field>
        <van-field label="课后照片">
          <template #input>
            <van-uploader v-model="afterPhotoFiles" :max-count="5" :after-read="(f) => onAfterRead(f, 'afterPhotos')"
              :before-delete="(f, d) => onPhotoDelete(d, 'afterPhotos')" />
          </template>
        </van-field>
      </van-cell-group>

      <!-- 编辑信息 -->
      <van-cell-group inset v-if="isEdit && updatedAtLabel">
        <van-cell title="最近修改" :value="updatedAtLabel" />
      </van-cell-group>

      <!-- AI 总结入口 -->
      <van-cell-group inset v-if="isEdit && form.status === 'completed'">
        <van-cell title="课后总结" is-link :value="form.summaryText ? '查看总结' : '去生成'"
          @click="goSummary" />
      </van-cell-group>

      <div class="form-actions">
        <van-button block round type="primary" native-type="submit" color="#4A7C59">
          保存课程
        </van-button>
      </div>
    </van-form>

    <!-- Date Picker -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker v-model="datePickerValue" title="选择日期" @confirm="onDateConfirm" @cancel="showDatePicker = false" />
    </van-popup>

    <!-- Time Picker -->
    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-time-picker v-model="timePickerValue" title="选择时间" @confirm="onTimeConfirm" @cancel="showTimePicker = false" />
    </van-popup>

    <!-- Member Picker -->
    <van-popup v-model:show="showMemberPicker" position="bottom" round>
      <van-picker :columns="memberColumns" @confirm="onMemberConfirm" @cancel="showMemberPicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import * as storage from '../services/storage'
import { toDateStr } from '../utils/dateUtil'
import { generateSessionId } from '../utils/idGenerator'
import VoiceInput from '../components/VoiceInput.vue'
import TextInput from '../components/TextInput.vue'

const route = useRoute()
const router = useRouter()

const isEdit = ref(false)
const config = ref({ courseTypes: [], focusAreaOptions: [], locations: [] })
const members = ref([])
const updatedAtLabel = ref('')

const form = reactive({
  id: '', date: '', startTime: '', duration: 60,
  classMode: 'private', courseType: '', location: '',
  memberId: '', memberIds: [], status: 'scheduled',
  notes: '', focusAreas: [], photos: [], beforePhotos: [], afterPhotos: [],
  summaryText: ''
})

const photoFiles = ref([])
const beforePhotoFiles = ref([])
const afterPhotoFiles = ref([])

const statusOptions = [
  { value: 'scheduled', label: '已约' },
  { value: 'completed', label: '已上' },
  { value: 'cancelled', label: '取消' },
  { value: 'noshow', label: '爽约' }
]

const showDatePicker = ref(false)
const showTimePicker = ref(false)
const showMemberPicker = ref(false)

const selectedMemberName = computed(() => {
  const m = members.value.find(m => m.id === form.memberId)
  return m ? m.name : ''
})

const memberColumns = computed(() =>
  members.value.map(m => ({ text: m.name, value: m.id }))
)

const datePickerValue = ref([])
const timePickerValue = ref([])

onMounted(() => {
  config.value = storage.getConfig()
  members.value = storage.getMembers()

  const id = route.params.id
  if (id) {
    const session = storage.getSessionById(id)
    if (session) {
      isEdit.value = true
      Object.assign(form, session)
      photoFiles.value = (session.photos || []).map(url => ({ url, isImage: true }))
      beforePhotoFiles.value = (session.beforePhotos || []).map(url => ({ url, isImage: true }))
      afterPhotoFiles.value = (session.afterPhotos || []).map(url => ({ url, isImage: true }))
      if (session.updatedAt) {
        const d = new Date(session.updatedAt)
        updatedAtLabel.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      }
      return
    }
  }

  form.date = route.query.date || toDateStr(new Date())
  form.startTime = route.query.time || '09:00'
  form.duration = config.value.defaultDuration || 60
})

function onDateConfirm({ selectedValues }) {
  form.date = selectedValues.join('-')
  showDatePicker.value = false
}

function onTimeConfirm({ selectedValues }) {
  form.startTime = selectedValues.join(':')
  showTimePicker.value = false
}

function onMemberConfirm({ selectedOptions }) {
  if (selectedOptions[0]) {
    form.memberId = selectedOptions[0].value
  }
  showMemberPicker.value = false
}

function toggleGroupMember(id) {
  const idx = form.memberIds.indexOf(id)
  if (idx >= 0) form.memberIds.splice(idx, 1)
  else form.memberIds.push(id)
}

function toggleFocusArea(area) {
  const idx = form.focusAreas.indexOf(area)
  if (idx >= 0) form.focusAreas.splice(idx, 1)
  else form.focusAreas.push(area)
}

function timeToMin(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function findConflict(f) {
  const daySessions = storage.getSessionsByDate(f.date)
  const startMin = timeToMin(f.startTime)
  const endMin = startMin + f.duration
  return daySessions.find(s => {
    if (s.id === f.id) return false
    const sStart = timeToMin(s.startTime)
    const sEnd = sStart + (s.duration || 60)
    return startMin < sEnd && endMin > sStart
  }) || null
}

function doSave() {
  if (!form.id) {
    form.id = generateSessionId()
    form.createdAt = Date.now()
  }
  form.updatedAt = Date.now()
  storage.saveSession({ ...form })
  showToast({ message: '保存成功', type: 'success' })
  setTimeout(() => router.back(), 500)
}

function onSave() {
  if (!form.date) { showToast('请选择日期'); return }
  if (!form.startTime) { showToast('请选择时间'); return }
  if (!form.courseType) { showToast('请选择课程类型'); return }
  if (form.classMode === 'private' && !form.memberId) {
    showToast('私教课请选择会员'); return
  }

  const conflict = findConflict(form)
  if (conflict) {
    const startMin = timeToMin(conflict.startTime)
    const endH = String(Math.floor((startMin + (conflict.duration || 60)) / 60)).padStart(2, '0')
    const endM = String((startMin + (conflict.duration || 60)) % 60).padStart(2, '0')
    const hint = `${conflict.startTime}-${endH}:${endM} ${conflict.courseType || '课程'}`
    showConfirmDialog({
      title: '时段冲突',
      message: `该时段已有课程：\n${hint}\n\n是否仍要保存？`,
      confirmButtonText: '仍然保存',
      confirmButtonColor: '#F28B82',
    }).then(() => doSave()).catch(() => {})
    return
  }
  doSave()
}

function onAfterRead(file, key) {
  const files = Array.isArray(file) ? file : [file]
  files.forEach(f => {
    form[key] = [...(form[key] || []), f.content || f.url || f.objectUrl]
  })
}

function onPhotoDelete(detail, key) {
  const idx = detail.index
  form[key] = form[key].filter((_, i) => i !== idx)
  return true
}

function goSummary() {
  router.push('/summary/' + form.id)
}

function onDelete() {
  showConfirmDialog({ title: '确认删除', message: '确定删除此课程？' })
    .then(() => {
      storage.deleteSession(form.id)
      showToast('已删除')
      setTimeout(() => router.back(), 500)
    })
    .catch(() => {})
}

function onVoiceResult(data) {
  if (data.date) form.date = data.date
  if (data.startTime) form.startTime = data.startTime
  if (data.duration) form.duration = data.duration
  if (data.courseType) form.courseType = data.courseType
  if (data.classMode) form.classMode = data.classMode
  if (data.location) form.location = data.location
  if (data.focusAreas && data.focusAreas.length) form.focusAreas = data.focusAreas
  if (data.notes) form.notes = data.notes

  if (data.memberName) {
    const member = members.value.find(m =>
      m.name === data.memberName || m.name.includes(data.memberName)
    )
    if (member) form.memberId = member.id
  }

  let count = 0
  ;['date', 'startTime', 'duration', 'courseType', 'classMode', 'location', 'notes'].forEach(k => {
    if (data[k]) count++
  })
  if (data.focusAreas?.length) count++
  if (data.memberName) count++

  showToast({ message: `已识别 ${count} 个字段`, type: 'success' })
}
</script>

<style scoped>
.session-page { background: var(--bg-page); min-height: 100vh; }

.delete-btn { color: #e74c3c; font-size: 14px; }

.duration-chips, .tag-list {
  display: flex; flex-wrap: wrap; gap: 8px;
}

.chip {
  padding: 4px 14px; border-radius: 999px;
  font-size: 13px; background: var(--bg-input); color: var(--text-secondary);
  cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
}
.chip--active {
  background: var(--color-primary-light); color: var(--color-primary);
  border-color: var(--color-primary); font-weight: 500;
}

.location-select { display: flex; flex-direction: column; gap: 8px; width: 100%; }

.inline-input {
  border: none; background: none; font-size: 14px; color: var(--text-primary);
  outline: none; width: 100%;
}

.form-actions { padding: 20px 16px; }
</style>
