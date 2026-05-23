<template>
  <div class="page">
    <header class="hdr">
      <div class="hdr__lead">
        <h1 class="hdr__title">会员</h1>
        <span class="hdr__count" v-if="members.length">{{ members.length }} 位</span>
      </div>
      <button class="hdr__add" @click="$router.push('/member-edit')" aria-label="新建会员">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>新建</span>
      </button>
    </header>

    <div class="search">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="search__icon">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        v-model="keyword"
        type="text"
        class="search__input"
        placeholder="姓名 或 手机号"
        :aria-label="'搜索会员'"
      />
      <button v-if="keyword" class="search__clear" @click="keyword = ''" aria-label="清空">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      </button>
    </div>

    <main class="list" v-if="groupedSections.length">
      <section
        v-for="group in groupedSections"
        :key="group.label"
        class="group"
      >
        <div class="group__head">
          <span class="group__label">{{ group.label }}</span>
          <span class="group__count">{{ group.members.length }}</span>
        </div>
        <div class="group__rows">
          <article
            v-for="m in group.members"
            :key="m.id"
            class="row"
            @click="$router.push('/member/' + m.id)"
          >
            <span class="row__accent" :style="{ background: accentColor(m.name) }"></span>
            <div class="row__main">
              <div class="row__top">
                <h3 class="row__name">{{ m.name }}</h3>
                <span class="row__alert" v-if="hasMedical(m)" title="健康关注">
                  <svg viewBox="0 0 12 12" width="6" height="6" fill="currentColor">
                    <circle cx="6" cy="6" r="6" />
                  </svg>
                </span>
                <span class="row__time">{{ relativeLabel(m.id) }}</span>
              </div>
              <div class="row__bottom">
                <span class="row__phone" v-if="m.phone">{{ m.phone }}</span>
                <template v-if="m.tags?.length">
                  <span v-if="m.phone" class="dot-sep">·</span>
                  <span
                    v-for="(t, i) in m.tags.slice(0, 3)"
                    :key="t"
                    class="row__tag"
                  >{{ t }}<span v-if="i < Math.min(m.tags.length, 3) - 1" class="dot-sep">·</span></span>
                </template>
                <template v-if="sessionStats(m.id).total > 0">
                  <span v-if="m.phone || m.tags?.length" class="dot-sep">·</span>
                  <span class="row__count">{{ sessionStats(m.id).total }} 节累计</span>
                </template>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div class="empty" v-else-if="!members.length">
      <span class="empty__mark"></span>
      <div class="empty__title">名单尚未开始</div>
      <p class="empty__hint">第一位会员的故事，从这里写起。</p>
      <button class="empty__cta" @click="$router.push('/member-edit')">
        新建会员
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>

    <div class="empty" v-else>
      <div class="empty__title">未找到</div>
      <p class="empty__hint">关键词「{{ keyword }}」无匹配会员</p>
      <button class="empty__cta" @click="keyword = ''">清空搜索</button>
    </div>

    <div class="page__tail"></div>
  </div>
</template>

<script>
import * as storage from '../services/storage'

const ACCENT_PALETTE = ['#4A7C59', '#A8B8A0', '#C2A882', '#B8A898', '#9EABA2']
const MEDICAL_KEYWORDS = ['膝伤', '腰痛', '颈椎', '肩颈', '孕期', '经期', '受伤', '不适', '术后', '高血压', '低血压', '腰伤', '腰间盘']

function hashColor(name) {
  if (!name) return ACCENT_PALETTE[0]
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length]
}

export default {
  name: 'MemberList',
  data() {
    return { members: [], sessions: [], keyword: '' }
  },
  computed: {
    filtered() {
      const kw = this.keyword.trim().toLowerCase()
      if (!kw) return this.members
      return this.members.filter(m =>
        (m.name || '').toLowerCase().includes(kw) ||
        (m.phone || '').includes(kw) ||
        (m.tags || []).some(t => t.toLowerCase().includes(kw))
      )
    },
    groupedSections() {
      const groups = [
        { label: '本周活跃', minDays: 0, maxDays: 7, members: [] },
        { label: '本月', minDays: 8, maxDays: 30, members: [] },
        { label: '更早', minDays: 31, maxDays: Infinity, members: [] },
        { label: '新会员', minDays: -1, maxDays: -1, members: [] }
      ]
      this.filtered.forEach(m => {
        const days = this.daysSince(m.id)
        if (days === null) {
          groups[3].members.push(m)
        } else if (days <= 7) {
          groups[0].members.push(m)
        } else if (days <= 30) {
          groups[1].members.push(m)
        } else {
          groups[2].members.push(m)
        }
      })
      // 每组内按最近活跃排序
      groups.forEach(g => {
        g.members.sort((a, b) => {
          const da = this.daysSince(a.id)
          const db = this.daysSince(b.id)
          if (da === null && db === null) return (b.createdAt || 0) - (a.createdAt || 0)
          if (da === null) return 1
          if (db === null) return -1
          return da - db
        })
      })
      return groups.filter(g => g.members.length > 0)
    }
  },
  activated() { this.load() },
  mounted() { this.load() },
  methods: {
    load() {
      this.members = storage.getMembers()
      this.sessions = storage.getSessions()
    },
    sessionStats(memberId) {
      const ss = this.sessions.filter(s =>
        s.memberId === memberId || (s.memberIds && s.memberIds.includes(memberId))
      )
      const completed = ss.filter(s => s.status === 'completed')
      return { total: ss.length, completed: completed.length, list: ss }
    },
    lastSession(memberId) {
      const ss = this.sessionStats(memberId).list
        .filter(s => s.status !== 'cancelled')
        .sort((a, b) => {
          const da = `${a.date} ${a.startTime || '00:00'}`
          const db = `${b.date} ${b.startTime || '00:00'}`
          return db.localeCompare(da)
        })
      return ss[0] || null
    },
    daysSince(memberId) {
      const last = this.lastSession(memberId)
      if (!last) return null
      const d = new Date(last.date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diff = Math.round((today - d) / 86400000)
      return diff < 0 ? 0 : diff
    },
    relativeLabel(memberId) {
      const d = this.daysSince(memberId)
      if (d === null) return '未开始'
      if (d === 0) return '今天'
      if (d === 1) return '昨天'
      if (d <= 6) return `${d} 天前`
      if (d <= 30) return `${d} 天前`
      const dt = new Date(this.lastSession(memberId).date)
      return `${dt.getMonth() + 1}月${dt.getDate()}日`
    },
    hasMedical(m) {
      const haystack = (m.notes || '') + ' ' + (m.tags || []).join(' ')
      return MEDICAL_KEYWORDS.some(kw => haystack.includes(kw))
    },
    accentColor(name) { return hashColor(name) }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,700&display=swap');

.page {
  --ink: #1F1D1A;
  --ink-2: #4A4642;
  --ink-3: #7A7470;
  --ink-4: #A8A29B;
  --ink-5: #C4BEB6;
  --rule: #E8E2D8;
  --rule-soft: #F0EBE2;
  --paper: #FAF7F0;
  --primary: #4A7C59;
  --warm: #B5573D;
  --display: 'Fraunces', 'Times New Roman', serif;

  background: var(--paper);
  color: var(--ink-2);
  min-height: 100vh;
  font-feature-settings: 'palt', 'kern';
  -webkit-font-smoothing: antialiased;
  padding-bottom: env(safe-area-inset-bottom);
}

/* === Header === */
.hdr {
  padding: 22px 28px 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
}
.hdr__lead {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.hdr__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: 38px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0;
  font-variation-settings: 'opsz' 100;
}
.hdr__count {
  font-family: var(--display);
  font-weight: 300;
  font-size: 13px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  font-variation-settings: 'opsz' 14;
}
.hdr__add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: var(--ink-2);
  letter-spacing: 0.04em;
  padding: 8px 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.hdr__add:active { color: var(--primary); }

/* === Search === */
.search {
  margin: 10px 28px 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--rule);
}
.search__icon {
  color: var(--ink-4);
  flex-shrink: 0;
}
.search__input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--ink);
  font-family: inherit;
  letter-spacing: 0.01em;
}
.search__input::placeholder {
  color: var(--ink-4);
  letter-spacing: 0.04em;
}
.search__clear {
  background: transparent;
  border: none;
  color: var(--ink-4);
  padding: 4px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.search__clear:active { color: var(--ink-2); }

/* === List === */
.list { padding-top: 8px; }

.group { margin-top: 26px; }
.group:first-child { margin-top: 18px; }

.group__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 28px 10px;
}
.group__label {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.group__count {
  font-family: var(--display);
  font-weight: 300;
  font-size: 11px;
  color: var(--ink-4);
  font-variation-settings: 'opsz' 14;
}

.group__rows {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: stretch;
  cursor: pointer;
  padding: 14px 28px;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}
.row::after {
  content: "";
  position: absolute;
  left: 28px;
  right: 28px;
  bottom: 0;
  height: 1px;
  background: var(--rule-soft);
}
.group__rows .row:last-child::after { display: none; }
.row:active { background: rgba(74, 124, 89, 0.04); }

.row__accent {
  width: 2px;
  border-radius: 2px;
  margin-right: 16px;
  flex-shrink: 0;
  opacity: 0.85;
}
.row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.row__top {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.row__name {
  font-family: var(--display);
  font-weight: 400;
  font-size: 19px;
  line-height: 1.2;
  color: var(--ink);
  letter-spacing: -0.01em;
  margin: 0;
  font-variation-settings: 'opsz' 24;
}
.row__alert {
  display: inline-flex;
  color: var(--warm);
  margin-top: 1px;
}
.row__time {
  margin-left: auto;
  font-family: var(--display);
  font-weight: 300;
  font-size: 12.5px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  white-space: nowrap;
  font-variation-settings: 'opsz' 14;
}

.row__bottom {
  font-size: 12px;
  color: var(--ink-4);
  letter-spacing: 0.02em;
  line-height: 1.5;
}
.row__phone {
  font-variant-numeric: tabular-nums;
}
.row__tag { color: var(--ink-3); }
.row__count { color: var(--ink-3); }
.dot-sep {
  margin: 0 6px;
  color: var(--ink-5);
}

/* === Empty === */
.empty {
  text-align: center;
  padding: 96px 32px 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty__mark {
  width: 40px;
  height: 1px;
  background: var(--ink-4);
  margin-bottom: 28px;
  opacity: 0.5;
}
.empty__title {
  font-family: var(--display);
  font-weight: 300;
  font-size: 26px;
  color: var(--ink);
  letter-spacing: -0.01em;
  font-variation-settings: 'opsz' 36;
  margin-bottom: 8px;
}
.empty__hint {
  font-family: var(--display);
  font-style: italic;
  font-weight: 300;
  font-size: 14px;
  color: var(--ink-3);
  margin-bottom: 28px;
  line-height: 1.6;
}
.empty__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: 1px solid var(--ink-2);
  color: var(--ink);
  font-size: 13px;
  letter-spacing: 0.04em;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.empty__cta:active {
  background: var(--ink);
  color: var(--paper);
}

.page__tail { height: 72px; }
</style>
