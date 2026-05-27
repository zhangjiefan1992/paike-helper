<template>
  <div class="page">
    <header class="hdr">
      <button class="icon-btn" @click="$router.back()">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2 class="hdr__title">AI 备课</h2>
    </header>

    <!-- 会员信息概要 -->
    <section class="member-brief" v-if="member">
      <span class="member-brief__name">{{ member.name }}</span>
      <span class="member-brief__meta" v-if="sessionCount">{{ sessionCount }} 节课</span>
    </section>

    <!-- 教练提问 -->
    <section class="input-area">
      <textarea
        v-model="question"
        class="input-area__textarea"
        placeholder="输入关注的问题（可选），如：她最近腰不舒服，怎么调整？"
        rows="3"
        :disabled="loading"
      ></textarea>
      <button class="btn-primary" @click="startConsult" :disabled="loading">
        {{ loading ? '分析中...' : '开始备课' }}
      </button>
    </section>

    <!-- 流式输出区域 -->
    <div class="results" v-if="started">
      <!-- 4 流派意见（折叠） -->
      <section class="schools">
        <h3 class="section-title">多流派视角</h3>
        <div
          v-for="school in schools"
          :key="school.key"
          class="school-card"
          :class="{ 'school-card--loading': school.loading }"
        >
          <div class="school-card__header" @click="school.expanded = !school.expanded">
            <span class="school-card__dot" :style="{ background: school.color }"></span>
            <span class="school-card__name">{{ school.name }}</span>
            <span class="school-card__status" v-if="school.loading">思考中...</span>
            <svg v-else class="school-card__arrow" :class="{ 'school-card__arrow--open': school.expanded }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div class="school-card__body" v-show="school.expanded && school.text">
            <div class="school-card__content" v-html="renderMd(school.text)"></div>
          </div>
        </div>
      </section>

      <!-- 综合建议 -->
      <section class="synthesis" v-if="judgeStarted">
        <h3 class="section-title">综合建议</h3>
        <div class="synthesis__loading" v-if="judgeLoading">
          <span class="dot-pulse"></span>综合分析中...
        </div>
        <div class="synthesis__content" v-else-if="judgeText" v-html="renderMd(judgeText)"></div>
      </section>

      <!-- 操作区 -->
      <section class="actions" v-if="done">
        <button class="btn-primary" @click="applyToSession">应用到下次课程</button>
      </section>

      <!-- 追问 -->
      <section class="followup" v-if="done && conversationId">
        <div class="followup__history" v-if="followups.length">
          <div v-for="(f, i) in followups" :key="i" class="followup__item">
            <div class="followup__q">{{ f.question }}</div>
            <div class="followup__a" v-html="renderMd(f.answer)"></div>
          </div>
        </div>
        <div class="followup__input">
          <input
            v-model="followupText"
            class="followup__field"
            placeholder="继续追问..."
            @keyup.enter="sendFollowup"
            :disabled="followupLoading"
          />
          <button class="btn-sm" @click="sendFollowup" :disabled="!followupText.trim() || followupLoading">
            {{ followupLoading ? '...' : '发送' }}
          </button>
        </div>
      </section>
    </div>

    <!-- 免责声明 -->
    <footer class="disclaimer" v-if="started">
      AI 建议仅供参考，请教练审核后采纳
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { agentConsult, agentFollowup } from '../services/api'
import { getMembers, getSessions } from '../services/storage'

const route = useRoute()
const router = useRouter()
const memberId = route.params.memberId

const member = ref(null)
const sessionCount = ref(0)
const recentSessions = ref([])
const question = ref('')
const loading = ref(false)
const started = ref(false)
const done = ref(false)
const conversationId = ref('')
const judgeStarted = ref(false)
const judgeLoading = ref(false)
const judgeText = ref('')
const followupText = ref('')
const followupLoading = ref(false)
const followups = reactive([])

const SCHOOL_COLORS = { romana: '#B8860B', stott: '#4A90D9', polestar: '#5B8C5A', basi: '#C75050' }

const schools = reactive([
  { key: 'romana', name: '罗马纳', color: SCHOOL_COLORS.romana, text: '', loading: false, expanded: false },
  { key: 'stott', name: '斯多特', color: SCHOOL_COLORS.stott, text: '', loading: false, expanded: false },
  { key: 'polestar', name: '北极星', color: SCHOOL_COLORS.polestar, text: '', loading: false, expanded: false },
  { key: 'basi', name: 'BASI', color: SCHOOL_COLORS.basi, text: '', loading: false, expanded: false },
])

onMounted(() => {
  const members = getMembers()
  member.value = members.find(m => m.id === memberId)
  if (!member.value) {
    showToast('会员不存在')
    router.back()
    return
  }
  const sessions = getSessions().filter(s => s.memberId === memberId || (s.memberIds && s.memberIds.includes(memberId)))
  sessionCount.value = sessions.length
  recentSessions.value = sessions
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5)
    .map(s => ({
      date: s.date,
      courseType: s.courseType,
      focusAreas: s.focusAreas,
      notes: s.notes,
      trainingItems: s.trainingItems,
      intensity: s.intensity,
      summary: s.summary,
    }))
})

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
  loading.value = true
  started.value = true
  done.value = false
  judgeStarted.value = false
  judgeLoading.value = false
  judgeText.value = ''
  schools.forEach(s => { s.text = ''; s.loading = true; s.expanded = false })

  const memberProfile = member.value ? {
    name: member.value.name,
    tags: member.value.tags,
    notes: member.value.notes,
    age: member.value.age,
    conditions: member.value.conditions,
    goals: member.value.goals,
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
        if (line.startsWith('event:')) {
          // SSE event type is in the "event:" line; data in next "data:" line
          continue
        }
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
  } finally {
    loading.value = false
    schools.forEach(s => { s.loading = false })
    judgeLoading.value = false
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
      judgeStarted.value = true
      judgeLoading.value = true
      break
    case 'judge_chunk':
      judgeText.value += event.chunk
      break
    case 'judge_done':
      judgeLoading.value = false
      break
    case 'done':
      done.value = true
      break
  }
}

async function sendFollowup() {
  if (!followupText.value.trim() || !conversationId.value) return
  const q = followupText.value.trim()
  followupText.value = ''
  followupLoading.value = true

  try {
    const data = await agentFollowup(conversationId.value, q)
    followups.push({ question: q, answer: data.answer })
  } catch (err) {
    showToast(err.message || '追问失败')
  } finally {
    followupLoading.value = false
  }
}

function applyToSession() {
  router.push({
    name: 'session-new',
    query: {
      memberId,
      aiSynthesis: judgeText.value,
    }
  })
}
</script>

<style scoped>
.page { padding: 0 16px 32px; max-width: 500px; margin: 0 auto; }
.hdr { display: flex; align-items: center; gap: 8px; padding: 12px 0; position: sticky; top: 0; background: var(--bg-page, #faf9f7); z-index: 10; }
.hdr__title { font-size: 16px; font-weight: 600; color: var(--text-primary, #1a1a1a); }
.icon-btn { background: none; border: none; padding: 6px; color: var(--text-secondary, #666); cursor: pointer; }

.member-brief { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.member-brief__name { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.member-brief__meta { font-size: 13px; color: var(--text-tertiary, #999); }

.input-area { margin-bottom: 20px; }
.input-area__textarea { width: 100%; border: 1px solid var(--border-light, #e5e5e5); border-radius: 8px; padding: 10px 12px; font-size: 14px; resize: none; font-family: inherit; background: var(--bg-card, #fff); }
.input-area__textarea:focus { outline: none; border-color: var(--color-primary, #b8860b); }
.btn-primary { display: block; width: 100%; margin-top: 10px; padding: 12px; border: none; border-radius: 8px; background: var(--color-primary, #b8860b); color: #fff; font-size: 15px; font-weight: 500; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.section-title { font-size: 14px; font-weight: 600; color: var(--text-secondary, #555); margin: 16px 0 8px; letter-spacing: 0.5px; }

.school-card { background: var(--bg-card, #fff); border-radius: 8px; margin-bottom: 8px; overflow: hidden; border: 1px solid var(--border-light, #eee); }
.school-card--loading { opacity: 0.7; }
.school-card__header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; }
.school-card__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.school-card__name { font-size: 14px; font-weight: 500; flex: 1; }
.school-card__status { font-size: 12px; color: var(--text-tertiary); }
.school-card__arrow { transition: transform 0.2s; }
.school-card__arrow--open { transform: rotate(180deg); }
.school-card__body { padding: 0 12px 12px; }
.school-card__content { font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
.school-card__content :deep(h4) { font-size: 13px; font-weight: 600; margin: 8px 0 4px; }
.school-card__content :deep(ul) { padding-left: 16px; margin: 4px 0; }
.school-card__content :deep(li) { margin: 2px 0; }

.synthesis { margin-top: 16px; }
.synthesis__loading { font-size: 13px; color: var(--text-tertiary); display: flex; align-items: center; gap: 8px; }
.synthesis__content { font-size: 14px; line-height: 1.7; color: var(--text-primary); background: var(--bg-card); border-radius: 8px; padding: 12px; border: 1px solid var(--border-light); }
.synthesis__content :deep(h3) { font-size: 14px; font-weight: 600; margin: 12px 0 4px; color: var(--color-primary); }
.synthesis__content :deep(h4) { font-size: 13px; font-weight: 600; margin: 8px 0 4px; }
.synthesis__content :deep(ul) { padding-left: 16px; margin: 4px 0; }
.synthesis__content :deep(li) { margin: 3px 0; }

.actions { margin-top: 16px; }

.followup { margin-top: 20px; border-top: 1px solid var(--border-light); padding-top: 12px; }
.followup__item { margin-bottom: 12px; }
.followup__q { font-size: 13px; color: var(--text-tertiary); margin-bottom: 4px; }
.followup__q::before { content: '你：'; font-weight: 500; }
.followup__a { font-size: 14px; line-height: 1.6; color: var(--text-primary); background: var(--bg-card); border-radius: 6px; padding: 8px 10px; }
.followup__input { display: flex; gap: 8px; }
.followup__field { flex: 1; border: 1px solid var(--border-light); border-radius: 6px; padding: 8px 10px; font-size: 14px; }
.followup__field:focus { outline: none; border-color: var(--color-primary); }
.btn-sm { padding: 8px 14px; border: none; border-radius: 6px; background: var(--color-primary); color: #fff; font-size: 13px; cursor: pointer; }
.btn-sm:disabled { opacity: 0.5; }

.disclaimer { text-align: center; font-size: 11px; color: var(--text-tertiary); margin-top: 24px; padding: 8px; }

.dot-pulse { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-tertiary); animation: pulse 1s infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
</style>
