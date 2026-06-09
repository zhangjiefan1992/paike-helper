<template>
  <div class="page">
    <header class="nav-bar">
      <h2 class="nav-bar__title">AI 备课 · {{ member?.name || '' }}</h2>
      <button class="nav-bar__close" @click="$router.back()">×</button>
    </header>

    <!-- Phase 1: 输入 -->
    <template v-if="!loading && !done">
      <!-- 会员上下文 -->
      <section class="context" v-if="member">
        <span class="context__label">会员背景（自动注入）</span>
        <div class="context__list">
          <div class="context__item">· {{ sessionCount }} 节累计，最近 {{ lastSessionDesc }}</div>
          <div class="context__item" v-if="monthCount">· 本月 {{ monthCount }} 节，出勤 {{ attendance }}</div>
          <div class="context__item" v-if="memberTags">· 标签：{{ memberTags }}</div>
          <div class="context__item" v-if="recentFocus">· 最近重点：{{ recentFocus }}</div>
          <div class="context__item" v-if="memberNotes">· 注意：{{ memberNotes }}</div>
        </div>
      </section>

      <!-- 提问 -->
      <section class="question-section">
        <span class="question-section__label">你想问什么？</span>
        <textarea
          v-model="question"
          class="question-section__textarea"
          placeholder="例：下次重点 / 强度该不该升"
          rows="3"
          maxlength="300"
        ></textarea>
      </section>

      <!-- 快捷选项 -->
      <div class="quick-tags">
        <span
          v-for="opt in quickOptions"
          :key="opt"
          class="quick-tags__item"
          @click="question = opt; startConsult()"
        >{{ opt }}</span>
      </div>

      <!-- CTA -->
      <button class="start-btn" @click="startConsult">开始咨询 ✦</button>
    </template>

    <!-- Phase 2: Loading -->
    <template v-if="loading">
      <div class="phase-loading">
        <div class="user-question">
          <span class="user-question__label">你问：</span>
          <span class="user-question__text">{{ question || '综合备课建议' }}</span>
        </div>
        <div class="school-status">
          <div v-for="school in schools" :key="school.key" class="school-status__row">
            <span class="school-status__icon">✦</span>
            <span class="school-status__name">{{ school.name }}</span>
            <span class="school-status__state" v-if="school.loading">· 思考中...</span>
            <span class="school-status__state" v-else-if="school.text">· ✓</span>
          </div>
        </div>
        <div class="loading-area">
          <div class="loading-area__dots">
            <span class="loading-area__dot"></span>
            <span class="loading-area__dot"></span>
            <span class="loading-area__dot"></span>
          </div>
          <span class="loading-area__hint">{{ loadingHint }}</span>
        </div>
      </div>
    </template>

    <!-- Phase 3: Result -->
    <template v-if="done">
      <div class="phase-result">
        <div class="user-question">
          <span class="user-question__label">你问：</span>
          <span class="user-question__text">{{ askedQuestion || '综合备课建议' }}</span>
        </div>

        <!-- 4 流派折叠 -->
        <div class="school-fold">
          <div
            v-for="school in schools"
            :key="school.key"
            class="school-fold__item"
            :class="{ 'school-fold__item--open': school.expanded }"
          >
            <div class="school-fold__header" @click="school.expanded = !school.expanded">
              <span class="school-fold__check" v-if="school.text">✓</span>
              <span class="school-fold__fail" v-else>×</span>
              <span class="school-fold__name">{{ school.name }}</span>
              <span class="school-fold__arrow">{{ school.expanded ? '▾' : '▸' }}</span>
            </div>
            <div class="school-fold__body" v-show="school.expanded && school.text">
              <div class="school-fold__text" v-html="renderMd(school.text)"></div>
            </div>
          </div>
        </div>

        <!-- 综合建议 -->
        <section class="synthesis" v-if="judgeText">
          <div class="synthesis__divider"></div>
          <span class="synthesis__title">综合建议</span>
          <div class="synthesis__divider"></div>
          <div class="synthesis__body">
            <div class="synthesis__text" v-html="renderMd(judgeText)"></div>
          </div>
        </section>

        <!-- 免责声明 -->
        <div class="disclaimer">ⓘ AI 生成，仅供参考；最终决定由教练做</div>

        <!-- 操作按钮（3 层） -->
        <section class="actions">
          <div class="actions__row">
            <button class="actions__primary" @click="applyToSession">应用到下次课程</button>
          </div>
          <div class="actions__row">
            <button class="actions__secondary" @click="showFollowup = true" v-if="!showFollowup">继续追问 →</button>
          </div>
          <div class="actions__link" @click="saveToProfile">保存到客档</div>
        </section>

        <!-- 追问 -->
        <section class="phase-followup" v-if="showFollowup">
          <div class="followup__history" v-if="followups.length">
            <div v-for="(f, i) in followups" :key="i" class="followup__item">
              <span class="followup__q">你：{{ f.question }}</span>
              <span class="followup__a" v-html="renderMd(f.answer)"></span>
            </div>
          </div>
          <div class="followup__input-row">
            <input
              v-model="followupText"
              class="followup__field"
              placeholder="接着问"
              @keyup.enter="sendFollowup"
              :disabled="followupLoading"
            />
            <button
              class="followup__send"
              :class="{ 'followup__send--disabled': !followupText.trim() || followupLoading }"
              @click="sendFollowup"
              :disabled="!followupText.trim() || followupLoading"
            >{{ followupLoading ? '...' : '发送 →' }}</button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { agentConsult, agentFollowup } from '../services/api'
import { getMembers, getSessions } from '../services/storage'

const QUICK_OPTIONS = ['下次重点哪里', '评估近期进度', '强度建议', '注意事项检查']

const LOADING_HINTS = [
  '正在召集四大流派导师...',
  '罗马纳学派分析动作编排...',
  '斯多特学派评估动作质量...',
  '北极星学派考虑功能康复...',
  'BASI 流体运动学派思考...',
  '裁判综合各方意见...',
]

const route = useRoute()
const router = useRouter()
const memberId = route.params.memberId

const member = ref(null)
const sessionCount = ref(0)
const monthCount = ref(0)
const attendance = ref('')
const lastSessionDesc = ref('')
const memberTags = ref('')
const recentFocus = ref('')
const memberNotes = ref('')
const recentSessions = ref([])
const question = ref('')
const quickOptions = QUICK_OPTIONS
const loading = ref(false)
const loadingHint = ref('')
const done = ref(false)
const askedQuestion = ref('')
const conversationId = ref('')
const judgeText = ref('')
const showFollowup = ref(false)
const followupText = ref('')
const followupLoading = ref(false)
const followups = reactive([])

const schools = reactive([
  { key: 'romana', name: '罗马纳', text: '', loading: false, expanded: false },
  { key: 'stott', name: '斯多特', text: '', loading: false, expanded: false },
  { key: 'polestar', name: '北极星', text: '', loading: false, expanded: false },
  { key: 'basi', name: 'BASI', text: '', loading: false, expanded: false },
])

let hintTimer = null

onMounted(() => {
  const members = getMembers()
  member.value = members.find(m => m.id === memberId)
  if (!member.value) {
    showToast('会员不存在')
    router.back()
    return
  }

  const sessions = getSessions().filter(s => s.memberId === memberId || (s.memberIds && s.memberIds.includes(memberId)))
  const sorted = sessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  sessionCount.value = sessions.length

  recentSessions.value = sorted.slice(0, 5).map(s => ({
    date: s.date,
    courseType: s.courseType,
    focusAreas: s.focusAreas,
    notes: s.notes,
    trainingItems: s.trainingItems,
    intensity: s.intensity,
  }))

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthSessions = sessions.filter(s => (s.date || '').startsWith(thisMonth))
  const completed = sessions.filter(s => s.status === 'completed')

  monthCount.value = monthSessions.length
  attendance.value = sessions.length > 0 ? Math.round(completed.length / sessions.length * 100) + '%' : ''

  if (sorted.length > 0) {
    const last = sorted[0]
    lastSessionDesc.value = `${(last.date || '').slice(5)} ${last.courseType || ''}`
  }

  memberTags.value = (member.value.tags || []).join(' · ')
  memberNotes.value = member.value.notes || ''

  const focusSet = new Set()
  recentSessions.value.forEach(s => {
    if (s.focusAreas && s.focusAreas.length) {
      s.focusAreas.forEach(f => focusSet.add(f))
    }
  })
  recentFocus.value = [...focusSet].slice(0, 4).join('、')
})

onUnmounted(() => {
  stopLoadingHints()
})

function startLoadingHints() {
  let idx = 0
  loadingHint.value = LOADING_HINTS[0]
  hintTimer = setInterval(() => {
    idx = (idx + 1) % LOADING_HINTS.length
    loadingHint.value = LOADING_HINTS[idx]
  }, 3000)
}

function stopLoadingHints() {
  if (hintTimer) {
    clearInterval(hintTimer)
    hintTimer = null
  }
}

function renderMd(text) {
  if (!text) return ''
  return text
    .replace(/### (.+)/g, '<h4>$1</h4>')
    .replace(/## (.+)/g, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

async function startConsult() {
  if (loading.value) return
  askedQuestion.value = question.value || ''
  loading.value = true
  done.value = false
  judgeText.value = ''
  conversationId.value = ''
  followups.splice(0)
  showFollowup.value = false
  schools.forEach(s => { s.text = ''; s.loading = true; s.expanded = false })
  startLoadingHints()

  const memberProfile = member.value ? {
    name: member.value.name,
    tags: member.value.tags,
    notes: member.value.notes,
  } : null

  try {
    const res = await agentConsult({
      memberId,
      memberProfile,
      recentSessions: recentSessions.value,
      coachQuestion: question.value || undefined,
      stream: true,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `请求失败 (${res.status})`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done: readerDone, value } = await reader.read()
      if (readerDone) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('event:')) continue
        if (!line.startsWith('data:')) continue
        const jsonStr = line.slice(5).trim()
        if (!jsonStr) continue

        try {
          const event = JSON.parse(jsonStr)
          handleSSEvent(event)
        } catch {}
      }
    }

    done.value = true
  } catch (err) {
    showToast(err.message || 'AI 服务暂不可用')
    done.value = false
  } finally {
    loading.value = false
    schools.forEach(s => { s.loading = false })
    stopLoadingHints()
  }
}

function handleSSEvent(event) {
  switch (event.type) {
    case 'school_start': {
      const s = schools.find(x => x.key === event.school)
      if (s) s.loading = true
      break
    }
    case 'school_chunk': {
      const s = schools.find(x => x.key === event.school)
      if (s) s.text += event.chunk
      break
    }
    case 'school_done': {
      const s = schools.find(x => x.key === event.school)
      if (s) s.loading = false
      break
    }
    case 'judge_start':
      break
    case 'judge_chunk':
      judgeText.value += event.chunk
      break
    case 'judge_done':
      break
    case 'conversation_id':
      conversationId.value = event.id || ''
      break
    case 'done':
      done.value = true
      break
  }
}

async function sendFollowup() {
  const q = (followupText.value || '').trim()
  if (!q || !conversationId.value || followupLoading.value) return
  followupText.value = ''
  followupLoading.value = true

  try {
    const data = await agentFollowup(conversationId.value, q)
    followups.push({ question: q, answer: data.answer || data.text || '' })
  } catch (err) {
    showToast(err.message || '追问失败')
  } finally {
    followupLoading.value = false
  }
}

function applyToSession() {
  router.push({
    name: 'session-new',
    query: { memberId, aiSynthesis: judgeText.value },
  })
}

function saveToProfile() {
  showToast('已保存到客档')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg-page, #faf9f7);
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 24px 60px;
  max-width: 500px;
  margin: 0 auto;
}

/* Nav bar */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  margin-bottom: 8px;
}
.nav-bar__title {
  font-size: 18px;
  color: var(--text-primary, #1a1a1a);
  font-weight: 400;
  letter-spacing: -0.01em;
}
.nav-bar__close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-tertiary, #999);
  background: none;
  border: none;
  cursor: pointer;
}

/* Context section */
.context {
  margin-bottom: 20px;
  padding: 14px;
  background: var(--bg-card-alt, #f5f4f0);
  border-radius: 8px;
}
.context__label {
  display: block;
  font-size: 11px;
  color: var(--text-tertiary, #999);
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  font-weight: 500;
}
.context__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.context__item {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, #666);
}

/* Question section */
.question-section {
  margin-bottom: 14px;
}
.question-section__label {
  display: block;
  font-size: 14px;
  color: var(--text-primary, #1a1a1a);
  font-weight: 500;
  margin-bottom: 8px;
}
.question-section__textarea {
  width: 100%;
  min-height: 60px;
  border: 1px solid var(--border-light, #e5e5e5);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary, #1a1a1a);
  background: var(--bg-page, #faf9f7);
  box-sizing: border-box;
  resize: none;
  font-family: inherit;
}
.question-section__textarea:focus {
  outline: none;
  border-color: var(--text-tertiary, #999);
}

/* Quick tags */
.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}
.quick-tags__item {
  padding: 7px 14px;
  border: 1px solid var(--border-light, #e5e5e5);
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-secondary, #666);
  background: var(--bg-page, #faf9f7);
  cursor: pointer;
}
.quick-tags__item:active {
  background: var(--bg-card-alt, #f5f4f0);
  border-color: var(--text-tertiary, #999);
}

/* Start button */
.start-btn {
  display: block;
  width: 100%;
  padding: 14px 0;
  text-align: center;
  background: var(--text-primary, #1a1a1a);
  color: var(--bg-page, #faf9f7);
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.04em;
  border: none;
  cursor: pointer;
}
.start-btn:active {
  opacity: 0.85;
}

/* Loading phase */
.phase-loading {
  padding-top: 8px;
}

.user-question {
  margin-bottom: 16px;
}
.user-question__label {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}
.user-question__text {
  font-size: 14px;
  color: var(--text-primary, #1a1a1a);
  font-weight: 500;
}

.school-status {
  margin-bottom: 10px;
}
.school-status__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid var(--bg-card-alt, #f5f4f0);
}
.school-status__icon {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}
.school-status__name {
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  font-weight: 500;
}
.school-status__state {
  font-size: 12px;
  color: var(--text-quaternary, #bbb);
  font-style: italic;
}

.loading-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}
.loading-area__dots {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.loading-area__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary, #999);
  animation: pulse 1.2s ease-in-out infinite;
}
.loading-area__dot:nth-child(2) { animation-delay: 0.2s; }
.loading-area__dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}
.loading-area__hint {
  font-size: 12px;
  color: var(--text-tertiary, #999);
  font-style: italic;
}

/* Result phase */
.phase-result {
  padding-top: 8px;
}

/* School fold */
.school-fold {
  margin-bottom: 16px;
}
.school-fold__item {
  border-bottom: 1px solid var(--bg-card-alt, #f5f4f0);
}
.school-fold__item--open {
  border-bottom-color: var(--border-light, #e5e5e5);
}
.school-fold__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  cursor: pointer;
}
.school-fold__check {
  font-size: 12px;
  color: #5B8C5A;
  font-weight: 600;
}
.school-fold__fail {
  font-size: 12px;
  color: #C75050;
  font-weight: 600;
}
.school-fold__name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  font-weight: 500;
}
.school-fold__arrow {
  font-size: 11px;
  color: var(--text-quaternary, #bbb);
}
.school-fold__body {
  padding: 0 0 12px 18px;
}
.school-fold__text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary, #666);
  white-space: pre-wrap;
}
.school-fold__text :deep(h3) { font-size: 14px; font-weight: 600; margin: 8px 0 4px; }
.school-fold__text :deep(h4) { font-size: 13px; font-weight: 600; margin: 6px 0 4px; }
.school-fold__text :deep(ul) { padding-left: 16px; margin: 4px 0; }
.school-fold__text :deep(li) { margin: 2px 0; }
.school-fold__text :deep(strong) { font-weight: 600; color: var(--text-primary, #1a1a1a); }

/* Synthesis */
.synthesis {
  margin-bottom: 20px;
}
.synthesis__divider {
  height: 1px;
  background: var(--text-quaternary, #bbb);
  margin: 4px 0;
}
.synthesis__title {
  display: block;
  font-size: 18px;
  color: var(--text-primary, #1a1a1a);
  text-align: center;
  padding: 10px 0;
  letter-spacing: 0.04em;
}
.synthesis__body {
  margin-top: 8px;
  padding: 14px;
  background: var(--bg-card-alt, #f5f4f0);
  border-radius: 8px;
}
.synthesis__text {
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-primary, #1a1a1a);
  white-space: pre-wrap;
}
.synthesis__text :deep(h3) { font-size: 14px; font-weight: 600; margin: 8px 0 4px; }
.synthesis__text :deep(h4) { font-size: 13px; font-weight: 600; margin: 6px 0 4px; }
.synthesis__text :deep(ul) { padding-left: 16px; margin: 4px 0; }
.synthesis__text :deep(li) { margin: 3px 0; }
.synthesis__text :deep(strong) { font-weight: 600; }

/* Disclaimer */
.disclaimer {
  text-align: center;
  font-size: 11px;
  color: var(--text-quaternary, #bbb);
  margin-bottom: 20px;
}

/* Actions */
.actions {
  margin-bottom: 20px;
}
.actions__row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.actions__primary {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  background: var(--text-primary, #1a1a1a);
  color: var(--bg-page, #faf9f7);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
.actions__primary:active {
  opacity: 0.85;
}
.actions__secondary {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  border: 1px solid var(--text-primary, #1a1a1a);
  color: var(--text-primary, #1a1a1a);
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  background: none;
  cursor: pointer;
}
.actions__secondary:active {
  background: var(--bg-card-alt, #f5f4f0);
}
.actions__link {
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary, #999);
  text-decoration: underline;
  cursor: pointer;
}

/* Followup */
.phase-followup {
  padding-top: 16px;
  border-top: 1px solid var(--border-light, #e5e5e5);
  margin-top: 8px;
}
.followup__history {
  margin-bottom: 14px;
}
.followup__item {
  margin-bottom: 12px;
}
.followup__q {
  display: block;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  font-weight: 500;
  margin-bottom: 4px;
}
.followup__a {
  display: block;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary, #666);
  white-space: pre-wrap;
}
.followup__input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.followup__field {
  flex: 1;
  height: 36px;
  border: 1px solid var(--border-light, #e5e5e5);
  border-radius: 999px;
  padding: 0 14px;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  background: var(--bg-page, #faf9f7);
}
.followup__field:focus {
  outline: none;
  border-color: var(--text-tertiary, #999);
}
.followup__send {
  padding: 8px 14px;
  background: var(--text-primary, #1a1a1a);
  color: var(--bg-page, #faf9f7);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
.followup__send--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
