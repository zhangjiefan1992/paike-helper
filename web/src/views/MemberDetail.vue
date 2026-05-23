<template>
  <div class="page" v-if="member">
    <!-- 浮动顶栏，几乎不可见 -->
    <header class="hdr">
      <button class="icon-btn" aria-label="返回" @click="$router.back()">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div class="hdr__actions">
        <button class="icon-btn" aria-label="导出明细" @click="onExport">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button class="text-btn" @click="$router.push('/member-edit/' + member.id)">编辑</button>
      </div>
    </header>

    <!-- 档案块 -->
    <section class="profile">
      <div class="profile__accent" :style="{ background: accentColor }"></div>
      <h1 class="profile__name">{{ member.name }}</h1>
      <div class="profile__meta" v-if="member.phone || member.tags?.length">
        <span v-if="member.phone" class="profile__phone">{{ member.phone }}</span>
        <template v-if="member.tags?.length">
          <span v-if="member.phone" class="dot-sep">·</span>
          <span v-for="(t, i) in member.tags" :key="t">
            {{ t }}<span v-if="i < member.tags.length - 1" class="dot-sep">·</span>
          </span>
        </template>
      </div>
      <p class="profile__quote" v-if="member.notes" v-html="highlightMedical(member.notes)"></p>
    </section>

    <!-- 健康关注（条件展示） -->
    <div class="alert" v-if="medicalKeywords.length">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="alert__icon">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span class="alert__label">健康关注</span>
      <span v-for="k in medicalKeywords" :key="k" class="alert__kw">{{ k }}</span>
    </div>

    <hr class="rule" />

    <!-- Hero: 距上次上课天数 -->
    <section class="hero" v-if="lastSession">
      <span class="hero__label">上一次课程</span>
      <div class="hero__display">
        <span class="hero__num">{{ daysSinceLast }}</span>
        <span class="hero__unit">{{ daysSinceLast === 0 ? '今天' : '天前' }}</span>
      </div>
      <div class="hero__sub">
        {{ formatLong(lastSession.date) }} <span class="dot-sep">·</span>
        {{ lastSession.courseType }} <span v-if="lastSession.duration"><span class="dot-sep">·</span> {{ lastSession.duration }} 分钟</span>
      </div>

      <div class="hero__stats">
        <div class="stat">
          <span class="stat__num">{{ thisMonthCount }}</span>
          <span class="stat__lbl">本月</span>
        </div>
        <span class="stat__div"></span>
        <div class="stat">
          <span class="stat__num">{{ totalCompleted }}</span>
          <span class="stat__lbl">累计</span>
        </div>
        <span class="stat__div"></span>
        <div class="stat">
          <span class="stat__num">{{ attendRatePct }}<small>%</small></span>
          <span class="stat__lbl">出勤</span>
        </div>
        <span class="stat__div" v-if="avgPerMonth >= 0.5"></span>
        <div class="stat" v-if="avgPerMonth >= 0.5">
          <span class="stat__num">{{ avgPerMonthLabel }}</span>
          <span class="stat__lbl">月均</span>
        </div>
      </div>
    </section>

    <section class="hero hero--empty" v-else>
      <span class="hero__label">还没有上过课</span>
      <p class="hero__hint">从周视图为这位会员安排第一节课</p>
    </section>

    <hr class="rule" v-if="recent5.length" />

    <!-- 近期记录 时间线 -->
    <section class="block" v-if="recent5.length">
      <h2 class="block__title">近期记录</h2>
      <div class="timeline">
        <article
          v-for="(s, i) in recent5"
          :key="s.id"
          class="entry"
          @click="$router.push('/session/' + s.id)"
        >
          <div class="entry__rail">
            <span class="entry__dot" :class="'entry__dot--' + s.status"></span>
            <div class="entry__line" v-if="i < recent5.length - 1"></div>
          </div>
          <div class="entry__body">
            <div class="entry__head">
              <time class="entry__date">{{ formatShort(s.date) }}</time>
              <span class="entry__time">{{ s.startTime }}</span>
              <span class="entry__status" :class="'entry__status--' + s.status">{{ statusLabel(s.status) }}</span>
            </div>
            <div class="entry__type">
              {{ s.courseType || '课程' }}<span v-if="s.location" class="entry__loc"> · {{ s.location }}</span>
            </div>
            <div class="entry__focus" v-if="s.focusAreas?.length">
              <span class="entry__focus-label">重点</span>
              <span v-for="(f, fi) in s.focusAreas" :key="f">{{ f }}<span v-if="fi < s.focusAreas.length - 1">、</span></span>
            </div>
            <p class="entry__digest" v-if="digestOrNotes(s)" v-html="highlightMedical(truncate(digestOrNotes(s), 110))"></p>
          </div>
        </article>
      </div>
    </section>

    <hr class="rule" v-if="recent5.length && (courseTypeDistribution.length || topFocusAreas.length)" />

    <!-- 训练分布 -->
    <section class="block" v-if="courseTypeDistribution.length || topFocusAreas.length">
      <h2 class="block__title">训练分布</h2>

      <div class="bars" v-if="courseTypeDistribution.length">
        <div v-for="item in courseTypeDistribution" :key="item.name" class="bar">
          <span class="bar__name">{{ item.name }}</span>
          <span class="bar__track">
            <span class="bar__fill" :style="{ width: item.pct + '%' }"></span>
          </span>
          <span class="bar__count">{{ item.count }}</span>
        </div>
      </div>

      <div class="cloud" v-if="topFocusAreas.length">
        <h3 class="cloud__title">常练部位</h3>
        <div class="cloud__items">
          <span
            v-for="(f, i) in topFocusAreas"
            :key="f.name"
            class="cloud__item"
            :style="{ fontSize: cloudSize(i) + 'px', opacity: cloudOpacity(i) }"
          >{{ f.name }}</span>
        </div>
      </div>
    </section>

    <div class="page__tail"></div>

    <!-- 导出明细弹窗 -->
    <van-popup
      v-model:show="exportModal.show"
      position="bottom"
      round
      :style="{ height: '88%', background: 'var(--paper)' }"
    >
      <div class="export-dialog">
        <header class="export-dialog__hdr">
          <h2 class="export-dialog__title">导出明细</h2>
          <button class="icon-btn" @click="exportModal.show = false" aria-label="关闭">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </header>
        <p class="export-dialog__hint">长按选中复制，或直接点下方"复制全文"</p>
        <textarea class="export-dialog__text" v-model="exportModal.text" readonly></textarea>
        <div class="export-dialog__actions">
          <button class="export-dialog__btn export-dialog__btn--ghost" @click="exportModal.show = false">关闭</button>
          <button class="export-dialog__btn" @click="onCopyExport">复制全文</button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import * as storage from '../services/storage'
import { exportMemberDetail, buildMemberStats } from '../utils/memberExport'

const route = useRoute()
const member = ref(null)
const sessions = ref([])

const MEDICAL_KEYWORDS = ['膝伤', '腰痛', '颈椎', '肩颈', '孕期', '经期', '受伤', '不适', '术后', '高血压', '低血压', '腰伤', '腰间盘']

const ACCENT_PALETTE = ['#4A7C59', '#A8B8A0', '#C2A882', '#B8A898', '#9EABA2']
const accentColor = computed(() => {
  if (!member.value?.name) return ACCENT_PALETTE[0]
  let h = 0
  for (const c of member.value.name) h = c.charCodeAt(0) + ((h << 5) - h)
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length]
})

const sortedSessions = computed(() =>
  [...sessions.value].sort((a, b) => {
    const da = `${a.date} ${a.startTime}`, db = `${b.date} ${b.startTime}`
    return db.localeCompare(da)
  })
)

const lastSession = computed(() => sortedSessions.value.find(s => s.status === 'completed') || sortedSessions.value[0] || null)

const daysSinceLast = computed(() => {
  if (!lastSession.value) return null
  const d = new Date(lastSession.value.date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - d) / 86400000)
  return diff < 0 ? 0 : diff
})

const totalCompleted = computed(() => sessions.value.filter(s => s.status === 'completed').length)

const memberStats = computed(() => buildMemberStats(member.value, sessions.value))
const attendRatePct = computed(() => {
  const total = memberStats.value.completed + memberStats.value.cancelled + memberStats.value.noshow
  if (total === 0) return 0
  return Math.round(memberStats.value.attendRate * 100)
})
const avgPerMonth = computed(() => memberStats.value.avgPerMonth)
const avgPerMonthLabel = computed(() => {
  const v = memberStats.value.avgPerMonth
  if (v >= 10) return Math.round(v).toString()
  return v.toFixed(1)
})

const exportModal = reactive({ show: false, text: '' })

function onExport() {
  if (!sessions.value.length) {
    showToast('该会员还没有上课记录')
    return
  }
  exportModal.text = exportMemberDetail(member.value, sessions.value)
  exportModal.show = true
}

async function onCopyExport() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(exportModal.text)
    } else {
      // 兼容老浏览器
      const ta = document.createElement('textarea')
      ta.value = exportModal.text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    showSuccessToast({ message: '已复制', duration: 1200, forbidClick: true })
  } catch {
    showToast('复制失败，请长按选中后复制')
  }
}

const thisMonthCount = computed(() => {
  const ym = new Date().toISOString().slice(0, 7)
  return sessions.value.filter(s => s.status === 'completed' && s.date.startsWith(ym)).length
})

const thisWeekCount = computed(() => {
  const today = new Date()
  const day = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sessions.value.filter(s => {
    if (s.status !== 'completed') return false
    const d = new Date(s.date + 'T00:00:00')
    return d >= monday && d <= sunday
  }).length
})

const recent5 = computed(() => sortedSessions.value.slice(0, 5))

const courseTypeDistribution = computed(() => {
  const counts = {}
  sessions.value.forEach(s => {
    if (s.status === 'cancelled' || !s.courseType) return
    counts[s.courseType] = (counts[s.courseType] || 0) + 1
  })
  const items = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const max = items[0]?.count || 1
  return items.map(item => ({ ...item, pct: Math.round((item.count / max) * 100) }))
})

const topFocusAreas = computed(() => {
  const counts = {}
  sessions.value.forEach(s => {
    if (s.status === 'cancelled') return
    ;(s.focusAreas || []).forEach(a => { counts[a] = (counts[a] || 0) + 1 })
  })
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

const medicalKeywords = computed(() => {
  const found = new Set()
  const haystack = (member.value?.notes || '') + '\n' +
    sessions.value.map(s => `${s.notes || ''} ${s.aiDigest || ''}`).join('\n')
  MEDICAL_KEYWORDS.forEach(kw => {
    if (haystack.includes(kw)) found.add(kw)
  })
  return Array.from(found)
})

onMounted(() => {
  member.value = storage.getMemberById(route.params.id)
  if (member.value) sessions.value = storage.getSessionsByMemberId(member.value.id)
})

function formatShort(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}月${parseInt(d)}日`
}

function formatLong(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}年${parseInt(m)}月${parseInt(d)}日`
}

function statusLabel(status) {
  return { scheduled: '待上课', completed: '已完成', cancelled: '已取消', noshow: '未出勤' }[status] || status
}

function digestOrNotes(s) {
  return s.aiDigest || s.notes || ''
}

function truncate(text, n) {
  if (!text) return ''
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

function highlightMedical(text) {
  if (!text) return ''
  let html = escapeHtml(text)
  MEDICAL_KEYWORDS.forEach(kw => {
    if (html.includes(kw)) {
      const re = new RegExp(kw, 'g')
      html = html.replace(re, `<mark class="med-mark">${kw}</mark>`)
    }
  })
  return html
}

function cloudSize(i) { return Math.max(12, 20 - i * 1.2) }
function cloudOpacity(i) { return Math.max(0.35, 1 - i * 0.08) }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,700&display=swap');

/* Tokens local to this page (extends theme but committed to editorial palette) */
.page {
  --ink: #1F1D1A;
  --ink-2: #4A4642;
  --ink-3: #7A7470;
  --ink-4: #A8A29B;
  --rule: #E8E2D8;
  --rule-soft: #F0EBE2;
  --paper: #FAF7F0;
  --primary: #4A7C59;
  --warm: #B5573D;
  --warm-bg: rgba(181, 87, 61, 0.07);
  --display: 'Fraunces', 'Times New Roman', serif;

  background: var(--paper);
  color: var(--ink-2);
  min-height: 100vh;
  font-feature-settings: 'palt', 'kern';
  -webkit-font-smoothing: antialiased;
}

/* === Header (浮动，几乎不可见) === */
.hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 4px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(to bottom, var(--paper) 70%, transparent);
}
.icon-btn {
  width: 36px; height: 36px;
  display: inline-flex;
  align-items: center; justify-content: center;
  background: transparent;
  border: none;
  color: var(--ink-2);
  border-radius: 50%;
  -webkit-tap-highlight-color: transparent;
}
.icon-btn:active { background: var(--rule-soft); }
.hdr__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.text-btn {
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  background: transparent;
  border: none;
  padding: 8px 10px;
  -webkit-tap-highlight-color: transparent;
}
.text-btn:active { color: var(--primary); }
.stat__num small {
  font-size: 0.55em;
  font-weight: 400;
  color: var(--ink-3);
  margin-left: 2px;
  letter-spacing: 0;
}

/* === Export dialog === */
.export-dialog {
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-sizing: border-box;
}
.export-dialog__hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.export-dialog__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: 22px;
  color: var(--ink);
  margin: 0;
  letter-spacing: -0.01em;
}
.export-dialog__hint {
  font-family: var(--display);
  font-style: italic;
  font-weight: 300;
  font-size: 13px;
  color: var(--ink-3);
  margin: 0;
}
.export-dialog__text {
  flex: 1;
  width: 100%;
  font-family: var(--display);
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink);
  background: var(--rule-soft);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 14px 16px;
  resize: none;
  outline: none;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
}
.export-dialog__actions {
  display: flex;
  gap: 12px;
  padding-top: 4px;
}
.export-dialog__btn {
  flex: 1;
  padding: 14px 0;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  border-radius: 999px;
  font-size: 13.5px;
  letter-spacing: 0.06em;
  cursor: pointer;
  font-family: inherit;
}
.export-dialog__btn:active { background: var(--ink-2); }
.export-dialog__btn--ghost {
  background: transparent;
  color: var(--ink);
}
.export-dialog__btn--ghost:active {
  background: var(--ink);
  color: var(--paper);
}

/* === Profile === */
.profile {
  padding: 28px 28px 36px;
  position: relative;
}
.profile__accent {
  width: 28px;
  height: 2px;
  margin-bottom: 22px;
  border-radius: 2px;
}
.profile__name {
  font-family: var(--display);
  font-weight: 400;
  font-size: 42px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0 0 14px;
  font-variation-settings: 'opsz' 120;
}
.profile__meta {
  font-size: 12.5px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  line-height: 1.8;
}
.dot-sep {
  margin: 0 6px;
  color: var(--ink-4);
}
.profile__quote {
  font-family: var(--display);
  font-style: italic;
  font-weight: 300;
  font-size: 15px;
  line-height: 1.7;
  color: var(--ink-2);
  margin-top: 20px;
  padding-left: 14px;
  border-left: 1px solid var(--rule);
  font-variation-settings: 'opsz' 14;
}

/* === Medical alert === */
.alert {
  margin: 0 28px 12px;
  padding: 10px 14px;
  background: var(--warm-bg);
  border-radius: 8px;
  color: var(--warm);
  font-size: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  letter-spacing: 0.02em;
}
.alert__icon { flex-shrink: 0; }
.alert__label {
  font-weight: 500;
  margin-right: 4px;
}
.alert__kw {
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.04em;
}

/* === Rule === */
.rule {
  border: none;
  height: 1px;
  background: var(--rule);
  margin: 28px 28px;
}

/* === Hero === */
.hero {
  padding: 8px 28px 24px;
}
.hero__label {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 18px;
}
.hero__display {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 10px;
}
.hero__num {
  font-family: var(--display);
  font-weight: 300;
  font-size: 96px;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--ink);
  font-variation-settings: 'opsz' 144;
}
.hero__unit {
  font-family: var(--display);
  font-weight: 300;
  font-size: 22px;
  color: var(--ink-3);
  font-variation-settings: 'opsz' 20;
}
.hero__sub {
  font-size: 13px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  margin-bottom: 28px;
}
.hero__stats {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--rule-soft);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat__num {
  font-family: var(--display);
  font-weight: 400;
  font-size: 24px;
  line-height: 1;
  color: var(--ink);
  letter-spacing: -0.01em;
  font-variation-settings: 'opsz' 30;
}
.stat__lbl {
  font-size: 11px;
  color: var(--ink-4);
  letter-spacing: 0.06em;
}
.stat__div {
  width: 1px;
  height: 22px;
  background: var(--rule);
}

.hero--empty {
  padding: 36px 28px;
  text-align: center;
}
.hero--empty .hero__label {
  font-family: var(--display);
  font-size: 22px;
  color: var(--ink-2);
  font-weight: 300;
  text-transform: none;
  letter-spacing: -0.01em;
  margin: 0;
}
.hero__hint {
  font-size: 13px;
  color: var(--ink-4);
  margin-top: 8px;
}

/* === Section block === */
.block {
  padding: 0 28px;
}
.block__title {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 0 0 20px;
  font-weight: 500;
}

/* === Timeline === */
.timeline {
  display: flex;
  flex-direction: column;
}
.entry {
  display: flex;
  gap: 14px;
  cursor: pointer;
  padding-bottom: 22px;
  -webkit-tap-highlight-color: transparent;
}
.entry:last-child { padding-bottom: 0; }
.entry:active .entry__body { opacity: 0.65; }
.entry__rail {
  width: 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 5px;
  flex-shrink: 0;
}
.entry__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ink-4);
  border: 2px solid var(--paper);
  box-shadow: 0 0 0 1px var(--ink-4);
}
.entry__dot--completed { background: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.entry__dot--scheduled { background: var(--paper); box-shadow: 0 0 0 1.4px var(--ink-3); }
.entry__dot--cancelled { background: var(--ink-4); box-shadow: 0 0 0 1px var(--ink-4); opacity: 0.4; }
.entry__dot--noshow { background: #C58A3B; box-shadow: 0 0 0 1px #C58A3B; }
.entry__line {
  flex: 1;
  width: 1px;
  background: var(--rule);
  margin: 8px 0 -8px;
}
.entry__body {
  flex: 1;
  min-width: 0;
  transition: opacity 0.15s;
  padding-bottom: 4px;
}
.entry__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 5px;
}
.entry__date {
  font-family: var(--display);
  font-weight: 400;
  font-size: 14px;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.entry__time {
  font-size: 12px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.entry__status {
  margin-left: auto;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--ink-4);
}
.entry__status--completed { color: var(--primary); }
.entry__status--scheduled { color: var(--ink-2); }
.entry__status--noshow { color: #C58A3B; }
.entry__type {
  font-size: 13.5px;
  color: var(--ink-2);
  margin-bottom: 4px;
}
.entry__loc { color: var(--ink-3); }
.entry__focus {
  font-size: 12px;
  color: var(--ink-3);
  margin-bottom: 6px;
}
.entry__focus-label {
  color: var(--ink-4);
  letter-spacing: 0.08em;
  margin-right: 8px;
  font-size: 10.5px;
}
.entry__digest {
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--ink-3);
  margin-top: 6px;
}

/* === Distribution bars === */
.bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 32px;
}
.bar {
  display: grid;
  grid-template-columns: 64px 1fr 32px;
  align-items: center;
  gap: 12px;
}
.bar__name {
  font-size: 13px;
  color: var(--ink-2);
}
.bar__track {
  height: 1px;
  background: var(--rule);
  position: relative;
  border-radius: 1px;
}
.bar__fill {
  position: absolute;
  top: -1px; left: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.bar__count {
  font-family: var(--display);
  font-size: 14px;
  color: var(--ink-3);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* === Focus area cloud === */
.cloud {
  padding-top: 8px;
}
.cloud__title {
  font-size: 11px;
  color: var(--ink-4);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 14px;
  font-weight: 500;
}
.cloud__items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: baseline;
}
.cloud__item {
  font-family: var(--display);
  font-weight: 400;
  color: var(--ink);
  letter-spacing: -0.005em;
  line-height: 1.4;
  font-variation-settings: 'opsz' 18;
}

/* === Medical keyword highlight === */
:deep(.med-mark) {
  background: transparent;
  color: var(--warm);
  font-weight: 500;
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
}

/* === Tail spacing === */
.page__tail { height: 80px; }
</style>
