<template>
  <div class="session-page">
    <van-nav-bar :title="isEdit ? '编辑课程' : '新增课程'" left-arrow @click-left="$router.back()">
      <template #right v-if="isEdit">
        <span class="delete-btn" @click="onDelete">删除</span>
      </template>
    </van-nav-bar>

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
                @click="onStatusChange(s.value)">{{ s.label }}</span>
            </div>
          </template>
        </van-field>
        <van-field v-model="form.notes" label="备注" type="textarea" rows="2"
          autosize placeholder="课程备注..." />
      </van-cell-group>

      <!-- AI 课程档案 -->
      <van-cell-group inset title="课程档案" v-if="form.aiDigest || form.voiceSegments?.length">
        <van-field
          v-if="form.aiDigest"
          v-model="form.aiDigest"
          type="textarea"
          rows="5"
          autosize
          placeholder="AI 收敛的本次课程档案，可编辑"
        />
        <van-cell v-if="form.voiceSegments?.length" :title="`原始语音片段 (${form.voiceSegments.length})`" is-link @click="showSegments = !showSegments" />
        <van-cell v-if="showSegments" v-for="(seg, idx) in form.voiceSegments" :key="idx">
          <template #title>
            <div class="seg-meta">片段 {{ idx + 1 }} · {{ seg.asrModel || 'asr' }}</div>
            <div class="seg-text">{{ seg.rawText }}</div>
          </template>
        </van-cell>
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

    <!-- 课后快速记录（标记完成时弹出） -->
    <van-popup
      v-model:show="quickNote.show"
      round
      position="bottom"
      :style="{ padding: '20px 16px 24px' }"
    >
      <div class="qn-dialog">
        <div class="qn-dialog__title">5 秒速记 · 课后</div>
        <div class="qn-dialog__chips">
          <span
            v-for="t in QUICK_NOTE_TAGS"
            :key="t"
            class="qn-chip"
            :class="{ 'qn-chip--active': quickNote.tags.includes(t) }"
            @click="toggleQuickTag(t)"
          >{{ t }}</span>
        </div>
        <input
          v-model="quickNote.text"
          class="qn-dialog__input"
          placeholder="补一句话（可选）"
          maxlength="80"
        />
        <div class="qn-dialog__actions">
          <van-button size="small" plain @click="quickNoteSkip">不记了</van-button>
          <van-button size="small" type="primary" @click="quickNoteSave">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 会员确认/纠正对话框（语音识别后） -->
    <van-popup
      v-model:show="memberConfirm.show"
      round
      position="center"
      :close-on-click-overlay="false"
      :style="{ width: '88vw', maxWidth: '420px', padding: '20px' }"
    >
      <div class="mc-dialog">
        <div class="mc-dialog__title">{{ existingMatchedMember ? '匹配到已有会员' : '未找到会员' }}</div>
        <div class="mc-dialog__desc">
          语音识别可能有误，可手动修改或选择候选会员
        </div>
        <input
          v-model="memberConfirm.name"
          class="mc-dialog__input"
          placeholder="会员姓名"
          autocomplete="off"
        />
        <div class="mc-dialog__hint" v-if="existingMatchedMember">
          ✓ 将使用已有会员『{{ existingMatchedMember.name }}』
        </div>
        <div class="mc-dialog__hint mc-dialog__hint--new" v-else-if="memberConfirm.name.trim()">
          + 将新建会员『{{ memberConfirm.name.trim() }}』
        </div>

        <div class="mc-dialog__suggestions" v-if="memberSuggestions.length">
          <div class="mc-dialog__label">候选（点击使用）</div>
          <div class="mc-dialog__chips">
            <span
              v-for="m in memberSuggestions"
              :key="m.id"
              class="mc-chip"
              @click="memberConfirm.name = m.name"
            >{{ m.name }}</span>
          </div>
        </div>

        <div class="mc-dialog__actions">
          <van-button size="small" plain @click="memberConfirmReject">取消</van-button>
          <van-button size="small" type="primary" @click="memberConfirmAccept" :disabled="!memberConfirm.name.trim()">
            {{ existingMatchedMember ? '使用此会员' : '新建并使用' }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'
import * as storage from '../services/storage'
import { toDateStr } from '../utils/dateUtil'
import { generateSessionId, generateMemberId } from '../utils/idGenerator'
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
  summaryText: '',
  voiceSegments: [], aiDigest: ''
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
const showSegments = ref(false)

// 课后快速记录
const QUICK_NOTE_TAGS = ['进步明显', '配合很好', '状态一般', '需要注意', '动作改善', '体力欠佳']
const quickNote = reactive({ show: false, tags: [], text: '' })

function onStatusChange(value) {
  const wasCompleted = form.status === 'completed'
  form.status = value
  if (value === 'completed' && !wasCompleted) {
    // 切换到已完成 → 弹快速记录
    quickNote.tags = []
    quickNote.text = ''
    quickNote.show = true
  }
}

function toggleQuickTag(tag) {
  const i = quickNote.tags.indexOf(tag)
  if (i >= 0) quickNote.tags.splice(i, 1)
  else quickNote.tags.push(tag)
}

function quickNoteSkip() {
  quickNote.show = false
}

function quickNoteSave() {
  const parts = []
  if (quickNote.tags.length) parts.push(quickNote.tags.join('、'))
  if (quickNote.text.trim()) parts.push(quickNote.text.trim())
  if (parts.length) {
    const append = parts.join('；')
    form.notes = form.notes ? `${form.notes}\n${append}` : append
    showSuccessToast({ message: '已记录', duration: 1200, forbidClick: true })
  }
  quickNote.show = false
}

// 会员确认对话框
const memberConfirm = reactive({ show: false, name: '' })
let memberConfirmResolver = null

const existingMatchedMember = computed(() => {
  const q = memberConfirm.name.trim()
  if (!q) return null
  return members.value.find(m => m.name === q) || null
})

const memberSuggestions = computed(() => {
  const q = memberConfirm.name.trim()
  // 提供候选：与输入有交集的会员（去掉精确同名的，因为已通过 hint 显示）
  return members.value
    .filter(m => m.name !== q)
    .map(m => ({ m, score: similarityScore(m.name, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.m)
})

function similarityScore(a, b) {
  if (!a || !b) return 0
  if (a.includes(b) || b.includes(a)) return 100
  // 字符交集数
  const setA = new Set(a)
  let common = 0
  for (const c of b) if (setA.has(c)) common++
  return common
}

function askMemberConfirm(initialName) {
  return new Promise(resolve => {
    memberConfirm.name = initialName
    memberConfirm.show = true
    memberConfirmResolver = resolve
  })
}

function memberConfirmAccept() {
  const name = memberConfirm.name.trim()
  if (!name) return
  memberConfirm.show = false
  const existing = members.value.find(m => m.name === name)
  if (existing) {
    memberConfirmResolver?.({ memberId: existing.id, created: false, name })
  } else {
    const newMember = {
      id: generateMemberId(),
      name,
      phone: '',
      avatar: '',
      tags: [],
      notes: '',
      createdAt: Date.now()
    }
    storage.saveMember(newMember)
    members.value = storage.getMembers()
    memberConfirmResolver?.({ memberId: newMember.id, created: true, name })
  }
  memberConfirmResolver = null
}

function memberConfirmReject() {
  memberConfirm.show = false
  memberConfirmResolver?.(null)
  memberConfirmResolver = null
}

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
  form.startTime = route.query.time || findNextEmptySlot(form.date) || '09:00'
  form.duration = config.value.defaultDuration || 60

  // 套用上次的"常用组合"，让会员/课程/地点几乎总是预填好
  const lastCombo = loadLastCombo()
  if (lastCombo) {
    if (!form.courseType && lastCombo.courseType) form.courseType = lastCombo.courseType
    if (!form.location && lastCombo.location) form.location = lastCombo.location
    if (lastCombo.classMode) form.classMode = lastCombo.classMode
    if (lastCombo.focusAreas?.length && !form.focusAreas?.length) {
      form.focusAreas = [...lastCombo.focusAreas]
    }
  }
})

const LAST_COMBO_KEY = 'pk_last_session_combo'

function loadLastCombo() {
  try {
    const raw = localStorage.getItem(LAST_COMBO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveLastCombo() {
  try {
    localStorage.setItem(LAST_COMBO_KEY, JSON.stringify({
      courseType: form.courseType,
      location: form.location,
      classMode: form.classMode,
      focusAreas: form.focusAreas
    }))
  } catch {}
}

function findNextEmptySlot(dateStr) {
  const wh = config.value.workingHours || { start: '08:00', end: '21:00' }
  const [whStartH] = wh.start.split(':').map(Number)
  const [whEndH] = wh.end.split(':').map(Number)
  const sessions = storage.getSessionsByDate(dateStr) || []
  const occupied = new Set()
  sessions.forEach(s => {
    if (s.status === 'cancelled') return
    const [h, m] = s.startTime.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + (s.duration || 60)
    for (let t = startMin; t < endMin; t += 30) occupied.add(Math.floor(t / 30))
  })

  const isToday = dateStr === toDateStr(new Date())
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  for (let h = whStartH; h < whEndH; h++) {
    for (let m of [0, 30]) {
      const slotMin = h * 60 + m
      if (isToday && slotMin <= nowMin) continue
      if (!occupied.has(Math.floor(slotMin / 30))) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
    }
  }
  return null
}

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
  saveLastCombo()
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

async function onVoiceResult(data) {
  if (data.date) form.date = data.date
  if (data.startTime) form.startTime = data.startTime
  if (data.duration) form.duration = data.duration
  if (data.courseType) form.courseType = data.courseType
  if (data.classMode) form.classMode = data.classMode
  if (data.location) form.location = data.location
  if (data.focusAreas && data.focusAreas.length) form.focusAreas = data.focusAreas
  if (data.notes) form.notes = data.notes
  if (data.voiceSegments?.length) form.voiceSegments = data.voiceSegments
  if (data.aiDigest) form.aiDigest = data.aiDigest

  let memberCreated = false
  let memberFinalName = ''
  if (data.memberName) {
    const name = data.memberName.trim()
    const exact = members.value.find(m => m.name === name)
    if (exact) {
      form.memberId = exact.id
      memberFinalName = exact.name
    } else {
      // 模糊匹配但不静默使用——交给对话框让用户确认
      const result = await askMemberConfirm(name)
      if (result) {
        form.memberId = result.memberId
        memberFinalName = result.name
        memberCreated = result.created
      }
    }
  }

  let count = 0
  ;['date', 'startTime', 'duration', 'courseType', 'classMode', 'location', 'notes'].forEach(k => {
    if (data[k]) count++
  })
  if (data.focusAreas?.length) count++
  if (data.memberName) count++

  const suffix = memberCreated ? `，已新建『${memberFinalName}』` : ''
  showSuccessToast({
    message: `已识别 ${count} 个字段${suffix}`,
    duration: 2000,
    forbidClick: true
  })
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

.seg-meta { font-size: 11px; color: #999; margin-bottom: 4px; }
.seg-text {
  font-size: 13px; color: var(--text-primary, #333); line-height: 1.5;
  white-space: pre-wrap; word-break: break-all;
  font-weight: normal;
}

.mc-dialog { display: flex; flex-direction: column; gap: 12px; }
.mc-dialog__title { font-size: 16px; font-weight: 600; color: var(--text-primary, #333); }
.mc-dialog__desc { font-size: 12px; color: var(--text-muted, #888); line-height: 1.5; }
.mc-dialog__input {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  border: 1px solid #e0e0e0; font-size: 14px;
  box-sizing: border-box; outline: none;
  color: var(--text-primary, #333);
}
.mc-dialog__input:focus { border-color: var(--color-primary, #4A7C59); }
.mc-dialog__hint {
  font-size: 12px; padding: 6px 8px; border-radius: 6px;
  background: rgba(74,124,89,0.08); color: var(--color-primary, #4A7C59);
}
.mc-dialog__hint--new { background: rgba(255,183,77,0.12); color: #c47b00; }
.mc-dialog__label { font-size: 12px; color: var(--text-muted, #888); margin-bottom: 6px; }
.mc-dialog__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mc-chip {
  font-size: 12px; padding: 4px 10px; border-radius: 12px;
  background: var(--bg-input, #f5f5f5); color: var(--text-secondary, #555);
  cursor: pointer; user-select: none;
  border: 1px solid #e0e0e0;
}
.mc-chip:active { background: rgba(74,124,89,0.12); }
.mc-dialog__actions {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 4px;
}

/* 课后快速记录 */
.qn-dialog { display: flex; flex-direction: column; gap: 12px; }
.qn-dialog__title { font-size: 15px; font-weight: 600; color: var(--text-primary, #333); }
.qn-dialog__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.qn-chip {
  font-size: 12px; padding: 6px 12px; border-radius: 14px;
  background: var(--bg-input, #f5f5f5); color: var(--text-secondary, #555);
  cursor: pointer; user-select: none;
  border: 1px solid #e0e0e0;
}
.qn-chip--active {
  background: var(--color-primary, #4A7C59);
  border-color: var(--color-primary, #4A7C59);
  color: #fff;
}
.qn-dialog__input {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  border: 1px solid #e0e0e0; font-size: 14px; outline: none;
  box-sizing: border-box; color: var(--text-primary, #333);
}
.qn-dialog__input:focus { border-color: var(--color-primary, #4A7C59); }
.qn-dialog__actions {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 4px;
}
</style>
