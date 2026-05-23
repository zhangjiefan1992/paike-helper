<template>
  <div class="week-page" :class="[themeClass, { 'is-shot': shotMode }]"
    @touchstart="onSwipeStart" @touchmove="onSwipeMove" @touchend="onSwipeEnd"
  >
    <!-- Header -->
    <header class="wv-header" v-if="!shotMode">
      <div class="wv-header__top">
        <h1 class="wv-header__title">{{ todayLabel }}</h1>
        <div class="wv-header__top-actions">
          <button class="wv-header__icon-btn" @click="enterShotMode" aria-label="截图模式">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <button class="wv-header__today-btn" @click="goToday">今天</button>
        </div>
      </div>
      <div class="wv-header__nav">
        <span class="wv-header__range">{{ rangeLabel }}</span>
        <div class="wv-header__arrows">
          <button class="wv-header__arrow" @click="changeWeek(-1)" aria-label="上周">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="wv-header__arrow" @click="changeWeek(1)" aria-label="下周">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Shot mode header (clean) -->
    <header class="wv-header wv-header--shot" v-else>
      <div class="wv-header__shot-top">
        <div>
          <h1 class="wv-header__shot-title">本周课表</h1>
          <div class="wv-header__shot-range">{{ rangeLabel }}</div>
        </div>
        <button class="wv-header__exit-shot" @click="exitShotMode">退出截图</button>
      </div>
    </header>

    <!-- Swipeable content -->
    <div class="wv-swipe-wrap" :style="swipeStyle"
      :class="{ 'wv-swipe-wrap--animating': swipeAnimating }"
    >
    <!-- Summary -->
    <div class="wv-summary" v-if="sessions.length">
      <div class="wv-summary__item">
        <span class="wv-summary__num">{{ stats.total }}</span>
        <span class="wv-summary__label">节课<br>本周</span>
      </div>
      <div class="wv-summary__divider"></div>
      <div class="wv-summary__item">
        <span class="wv-summary__num">{{ stats.completed }}</span>
        <span class="wv-summary__label">已完成</span>
      </div>
      <div class="wv-summary__divider"></div>
      <div class="wv-summary__item">
        <span class="wv-summary__num">{{ stats.memberCount }}</span>
        <span class="wv-summary__label">位会员</span>
      </div>
    </div>

    <!-- Empty State -->
    <div class="wv-empty" v-if="!sessions.length">
      <span class="wv-empty__mark"></span>
      <p class="wv-empty__title">这周尚是空白</p>
      <p class="wv-empty__sub">把整周课表粘进来，AI 自动整理</p>
      <button class="wv-empty__cta" @click="$router.push('/settings')">前往批量导入 →</button>
      <span class="wv-empty__alt" @click="$router.push('/session')">或新增单节课程</span>
    </div>

    <!-- Week Grid -->
    <div class="wv-grid" v-else ref="gridRef">
      <div
        v-for="day in week.days" :key="day.date"
        class="wv-day"
        :class="{ 'wv-day--today': day.isToday }"
      >
        <div class="wv-day__head" @click="!shotMode && $router.push('/day/' + day.date)">
          <span class="wv-day__name">{{ day.weekday }}</span>
          <span class="wv-day__num">{{ day.dayNum }}</span>
          <span class="wv-day__count" v-if="dayCards[day.date]?.length">
            {{ dayCards[day.date].length }}节
          </span>
        </div>
        <div class="wv-day__body">
          <div
            v-for="card in dayCards[day.date]" :key="card.id"
            class="wv-card"
            :class="['wv-card--' + card.category, { 'wv-card--done': card.status === 'completed' }]"
            :style="cardStyle(card)"
            @click="onCardTap(card)"
            @contextmenu.prevent="onCardLongPress(card)"
            @touchstart="onCardTouchStart(card, $event)"
            @touchend="onCardTouchEnd"
          >
            <div class="wv-card__header">
              <span class="wv-card__dot" :style="{ background: card.dotColor }"></span>
              <span class="wv-card__time">{{ card.startTime }} · {{ card.duration }}min</span>
            </div>
            <div class="wv-card__type">{{ card.courseType }}</div>
            <div class="wv-card__member">{{ card.displayName }}</div>
            <div class="wv-card__location" v-if="card.location">{{ card.location }}</div>
            <div class="wv-card__footer">
              <span class="wv-card__status" :class="'wv-card__status--' + card.status">
                {{ card.status === 'completed' ? '✓ 已完成' : '待上课' }}
              </span>
            </div>
          </div>

          <!-- Empty day -->
          <div v-if="!dayCards[day.date]?.length" class="wv-day-empty" @click="$router.push('/session?date=' + day.date)">
            <span class="wv-day-empty__mark"></span>
          </div>
        </div>
      </div>
    </div>
    </div><!-- end wv-swipe-wrap -->

    <!-- Brand watermark (only in shot mode) -->
    <div class="wv-brand" v-if="shotMode">
      <span class="wv-brand__mark"></span>
      <span class="wv-brand__name">排课助手</span>
      <span class="wv-brand__url">keleya.org</span>
    </div>

    <!-- FAB -->
    <div class="wv-fab" v-if="!shotMode" @click="$router.push('/session')"
      @contextmenu.prevent="showThemePicker = true"
      @touchstart="onFabTouchStart"
      @touchend="onFabTouchEnd"
      aria-label="新建课程"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </div>

    <!-- Theme Switcher -->
    <van-action-sheet
      v-model:show="showThemePicker"
      :actions="themeActions"
      cancel-text="取消"
      description="选择周视图主题"
      @select="onThemeSelect"
    />

    <!-- Card Quick Actions -->
    <van-action-sheet
      v-model:show="showCardActions"
      :actions="cardActions"
      cancel-text="取消"
      @select="onCardActionSelect"
    />
  </div>
</template>

<script>
import * as storage from '../services/storage'
import { getWeekRange } from '../utils/dateUtil'
import { showToast } from 'vant'

const CATEGORY_MAP = {
  '普拉提': 'pilates',
  '瑜伽': 'yoga',
  '体能训练': 'fitness',
  '拉伸放松': 'fitness',
}

const THEME_CONFIGS = {
  'soft-color': {
    pilates: { bg: '#E8EDFF', border: 'transparent', dot: '#3B52A5', typeColor: '#3B52A5' },
    yoga: { bg: '#FFF0E6', border: 'transparent', dot: '#B85C1F', typeColor: '#B85C1F' },
    fitness: { bg: '#E6F9F0', border: 'transparent', dot: '#1A7A4C', typeColor: '#1A7A4C' },
    group: { bg: '#F3E8FF', border: 'transparent', dot: '#7C3AED', typeColor: '#7C3AED' },
    isGradient: false,
  },
  'candy-gradient': {
    pilates: { bg: 'linear-gradient(135deg, #667EEA, #764BA2)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    yoga: { bg: 'linear-gradient(135deg, #F093FB, #F5576C)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    fitness: { bg: 'linear-gradient(135deg, #4FACFE, #00F2FE)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    group: { bg: 'linear-gradient(135deg, #43E97B, #38F9D7)', border: 'transparent', dot: 'rgba(255,255,255,0.8)', typeColor: '#fff' },
    isGradient: true,
  },
  'airy-tint': {
    pilates: { bg: '#F0F4FF', border: '#C7D2FE', dot: '#6366F1', typeColor: '#1E293B' },
    yoga: { bg: '#FFF7ED', border: '#FED7AA', dot: '#F59E0B', typeColor: '#1E293B' },
    fitness: { bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981', typeColor: '#1E293B' },
    group: { bg: '#FAF5FF', border: '#E9D5FF', dot: '#A855F7', typeColor: '#1E293B' },
    isGradient: false,
  },
}

const THEME_OPTIONS = [
  { name: '柔彩', value: 'soft-color' },
  { name: '渐变', value: 'candy-gradient' },
  { name: '轻盈', value: 'airy-tint' },
]

export default {
  name: 'WeekView',
  data() {
    return {
      currentDate: new Date(),
      week: null,
      sessions: [],
      dayCards: {},
      stats: { total: 0, completed: 0, memberCount: 0 },
      currentTheme: 'airy-tint',
      showThemePicker: false,
      showCardActions: false,
      cardActions: [],
      activeCard: null,
      themeActions: THEME_OPTIONS,
      fabTimer: null,
      cardLongPressTimer: null,
      cardLongPressed: false,
      touchStartX: 0,
      touchStartY: 0,
      touchStartTime: 0,
      swipeOffsetX: 0,
      swiping: false,
      swipeAnimating: false,
      shotMode: false,
    }
  },
  computed: {
    themeClass() {
      return 'theme-' + this.currentTheme
    },
    todayLabel() {
      const d = this.currentDate
      return `${d.getMonth() + 1}月${d.getDate()}日`
    },
    rangeLabel() {
      if (!this.week) return ''
      const s = this.week.days[0], e = this.week.days[6]
      return `${parseInt(s.date.slice(5,7))}月${s.dayNum}日 – ${parseInt(e.date.slice(5,7))}月${e.dayNum}日`
    },
    themeConfig() {
      return THEME_CONFIGS[this.currentTheme] || THEME_CONFIGS['airy-tint']
    },
    swipeStyle() {
      if (!this.swiping || this.swipeOffsetX === 0) return {}
      return { transform: `translateX(${this.swipeOffsetX}px)` }
    }
  },
  activated() { this.loadWeek() },
  mounted() {
    this.loadTheme()
    this.loadWeek()
  },
  methods: {
    loadTheme() {
      const config = storage.getConfig()
      if (config.weekTheme && THEME_CONFIGS[config.weekTheme]) {
        this.currentTheme = config.weekTheme
      }
    },
    loadWeek() {
      const week = getWeekRange(this.currentDate)
      const sessions = storage.getSessionsByDateRange(week.start, week.end)
      const members = storage.getMembers()
      const memberMap = {}
      members.forEach(m => { memberMap[m.id] = m })

      const dayCards = {}
      week.days.forEach(d => { dayCards[d.date] = [] })

      const memberIds = new Set()

      sessions.forEach(s => {
        if (s.status === 'cancelled') return
        const member = memberMap[s.memberId]
        const category = this.getCategory(s.courseType)

        if (s.memberId) memberIds.add(s.memberId)
        if (s.memberIds) s.memberIds.forEach(id => memberIds.add(id))

        const tc = this.themeConfig[category] || this.themeConfig.pilates

        if (dayCards[s.date]) {
          dayCards[s.date].push({
            id: s.id,
            startTime: s.startTime,
            duration: s.duration || 60,
            courseType: s.courseType || '课程',
            displayName: member ? member.name : (s.classMode === 'group' ? `${s.memberIds?.length || 0}人` : ''),
            location: s.location || '',
            status: s.status || 'scheduled',
            category,
            dotColor: tc.dot,
          })
        }
      })

      Object.values(dayCards).forEach(arr => {
        arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
      })

      let completed = 0
      sessions.forEach(s => { if (s.status === 'completed') completed++ })

      this.week = week
      this.sessions = sessions
      this.dayCards = dayCards
      this.stats = { total: sessions.length, completed, memberCount: memberIds.size }

      this.$nextTick(() => this.scrollToToday())
    },
    getCategory(courseType) {
      if (!courseType) return 'pilates'
      if (courseType.includes('团课')) return 'group'
      for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (courseType.includes(key)) return val
      }
      return 'pilates'
    },
    cardStyle(card) {
      const tc = this.themeConfig[card.category] || this.themeConfig.pilates
      const style = {}
      if (this.themeConfig.isGradient) {
        style.background = tc.bg
        style.color = '#fff'
      } else {
        style.background = tc.bg
        if (tc.border && tc.border !== 'transparent') {
          style.borderColor = tc.border
        }
      }
      return style
    },
    changeWeek(dir) {
      const d = new Date(this.currentDate)
      d.setDate(d.getDate() + dir * 7)
      this.currentDate = d
      this.loadWeek()
    },
    goToday() {
      this.currentDate = new Date()
      this.loadWeek()
    },
    enterShotMode() {
      this.shotMode = true
      showToast({ message: '已进入截图模式，长按或截屏保存', duration: 2000 })
    },
    exitShotMode() {
      this.shotMode = false
    },
    scrollToToday() {
      const grid = this.$refs.gridRef
      if (!grid) return
      const todayEl = grid.querySelector('.wv-day--today')
      if (todayEl) {
        const offset = todayEl.offsetLeft - grid.offsetWidth / 2 + todayEl.offsetWidth / 2
        grid.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' })
      }
    },
    onThemeSelect(action) {
      this.currentTheme = action.value
      this.showThemePicker = false
      const config = storage.getConfig()
      config.weekTheme = action.value
      storage.saveConfig(config)
      this.loadWeek()
    },
    onFabTouchStart() {
      this.fabTimer = setTimeout(() => {
        this.showThemePicker = true
      }, 600)
    },
    onFabTouchEnd() {
      if (this.fabTimer) {
        clearTimeout(this.fabTimer)
        this.fabTimer = null
      }
    },
    onSwipeStart(e) {
      if (this.shotMode) return
      const touch = e.touches[0]
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
      this.touchStartTime = Date.now()
      this.swiping = false
      this.swipeOffsetX = 0
    },
    onSwipeMove(e) {
      if (this.shotMode) return
      const touch = e.touches[0]
      const dx = touch.clientX - this.touchStartX
      const dy = touch.clientY - this.touchStartY
      if (!this.swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        this.swiping = true
      }
      if (this.swiping) {
        e.preventDefault()
        const damping = 0.4
        this.swipeOffsetX = dx * damping
      }
    },
    onSwipeEnd(e) {
      const touch = e.changedTouches[0]
      const dx = touch.clientX - this.touchStartX
      const dy = touch.clientY - this.touchStartY
      const dt = Date.now() - this.touchStartTime
      const absDx = Math.abs(dx)
      const isHorizontal = absDx > Math.abs(dy) * 1.5
      const triggered = isHorizontal && (absDx > 60 || (absDx > 30 && dt < 300))

      if (triggered) {
        const dir = dx > 0 ? -1 : 1
        const flyTo = dir > 0 ? -window.innerWidth : window.innerWidth
        this.swipeAnimating = true
        this.swiping = true
        this.swipeOffsetX = flyTo * 0.3

        setTimeout(() => {
          this.changeWeek(dir)
          this.swipeOffsetX = -flyTo * 0.3

          setTimeout(() => {
            this.swipeAnimating = true
            this.swipeOffsetX = 0
            setTimeout(() => {
              this.swipeAnimating = false
              this.swiping = false
            }, 250)
          }, 20)
        }, 150)
      } else {
        this.swipeAnimating = true
        this.swipeOffsetX = 0
        setTimeout(() => {
          this.swipeAnimating = false
          this.swiping = false
        }, 250)
      }
    },
    onCardTap(card) {
      if (this.cardLongPressed) {
        this.cardLongPressed = false
        return
      }
      const session = storage.getSessionById(card.id)
      if (session && session.summaryText && !session.summarySent) {
        this.$router.push('/summary/' + card.id)
      } else {
        this.$router.push('/session/' + card.id)
      }
    },
    onCardTouchStart(card, e) {
      this.cardLongPressed = false
      this.cardLongPressTimer = setTimeout(() => {
        this.cardLongPressed = true
        this.showCardActionSheet(card)
      }, 600)
    },
    onCardTouchEnd() {
      if (this.cardLongPressTimer) {
        clearTimeout(this.cardLongPressTimer)
        this.cardLongPressTimer = null
      }
    },
    onCardLongPress(card) {
      this.cardLongPressed = true
      this.showCardActionSheet(card)
    },
    showCardActionSheet(card) {
      const session = storage.getSessionById(card.id)
      if (!session) return
      const actions = []
      if (session.status !== 'completed') actions.push({ name: '标记已完成', value: 'completed' })
      if (session.status !== 'cancelled') actions.push({ name: '标记取消', value: 'cancelled' })
      if (session.status !== 'scheduled') actions.push({ name: '恢复待上课', value: 'scheduled' })
      actions.push({ name: '复制到下周同时段', value: 'copy_next_week' })
      actions.push({ name: '编辑课程', value: 'edit' })
      this.activeCard = card
      this.cardActions = actions
      this.showCardActions = true
    },
    onCardActionSelect(action) {
      const card = this.activeCard
      this.showCardActions = false
      if (!card) return
      if (action.value === 'edit') {
        this.$router.push('/session/' + card.id)
        return
      }
      if (action.value === 'copy_next_week') {
        this.copyToNextWeek(card.id)
        return
      }
      storage.updateSessionStatus(card.id, action.value)
      const msg = action.value === 'completed' ? '已标记完成' : action.value === 'cancelled' ? '已取消' : '已恢复'
      showToast({ message: msg, type: action.value === 'completed' ? 'success' : 'text' })
      this.loadWeek()
    },
    copyToNextWeek(sessionId) {
      const session = storage.getSessionById(sessionId)
      if (!session) return
      const d = new Date(session.date)
      d.setDate(d.getDate() + 7)
      const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const newSession = {
        ...session,
        id: 's_' + Date.now() + Math.random().toString(36).slice(2, 6),
        date: newDate,
        status: 'scheduled',
        summaryText: '',
        summarySent: false,
        photos: [],
        beforePhotos: [],
        afterPhotos: [],
        notes: '',
        voiceSegments: [],
        aiDigest: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      storage.saveSession(newSession)
      showToast({ message: `已复制到 ${newDate}`, type: 'success' })
      this.loadWeek()
    },
  }
}
</script>

<style scoped>
.week-page {
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink-2);
  padding-bottom: 80px;
  overflow-x: hidden;
  font-family: var(--sans);
  font-feature-settings: 'palt', 'kern';
}

.wv-swipe-wrap { will-change: transform; }
.wv-swipe-wrap--animating {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

/* === Header === */
.wv-header {
  padding: 24px 28px 16px;
}
.wv-header__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.wv-header__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0;
  font-variation-settings: 'opsz' 80;
}
.wv-header__top-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.wv-header__icon-btn {
  width: 34px; height: 34px;
  background: transparent;
  border: none;
  color: var(--ink-3);
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.wv-header__icon-btn:active {
  background: var(--rule-soft);
  color: var(--ink);
}
.wv-header__today-btn {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--ink-2);
  background: transparent;
  border: none;
  padding: 8px 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.wv-header__today-btn:active { color: var(--primary); }

.wv-header__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--rule);
}
.wv-header__range {
  font-family: var(--display);
  font-weight: 300;
  font-size: 13.5px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  font-variation-settings: 'opsz' 14;
}
.wv-header__arrows {
  display: flex;
  gap: 2px;
}
.wv-header__arrow {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.wv-header__arrow:active {
  background: var(--rule-soft);
  color: var(--ink);
}

/* === Shot mode header === */
.wv-header--shot {
  padding: 28px 28px 12px;
}
.wv-header__shot-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.wv-header__shot-title {
  font-family: var(--display);
  font-weight: 400;
  font-size: 28px;
  line-height: 1.1;
  color: var(--ink);
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  font-variation-settings: 'opsz' 60;
}
.wv-header__shot-range {
  font-family: var(--display);
  font-style: italic;
  font-weight: 300;
  font-size: 13px;
  color: var(--ink-3);
}
.wv-header__exit-shot {
  font-size: 12px;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  background: transparent;
  color: var(--ink-3);
  border: 1px solid var(--rule);
  border-radius: 999px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.wv-header__exit-shot:active {
  background: var(--rule-soft);
  color: var(--ink);
}

/* === Summary === */
.wv-summary {
  display: flex;
  align-items: center;
  padding: 8px 28px 20px;
  gap: 22px;
}
.wv-summary__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.wv-summary__num {
  font-family: var(--display);
  font-weight: 400;
  font-size: 22px;
  line-height: 1;
  color: var(--ink);
  letter-spacing: -0.01em;
  font-variation-settings: 'opsz' 30;
}
.wv-summary__label {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.08em;
  line-height: 1.3;
}
.wv-summary__divider {
  width: 1px;
  height: 18px;
  background: var(--rule);
}

/* === Empty === */
.wv-empty {
  text-align: center;
  padding: 100px 32px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wv-empty__mark {
  width: 36px;
  height: 1px;
  background: var(--ink-4);
  opacity: 0.5;
  margin-bottom: 24px;
}
.wv-empty__title {
  font-family: var(--display);
  font-weight: 300;
  font-size: 22px;
  color: var(--ink);
  letter-spacing: -0.01em;
  margin: 0 0 6px;
  font-variation-settings: 'opsz' 30;
}
.wv-empty__sub {
  font-family: var(--display);
  font-style: italic;
  font-weight: 300;
  font-size: 13px;
  color: var(--ink-3);
  margin-bottom: 28px;
  line-height: 1.6;
  max-width: 240px;
}
.wv-empty__cta {
  display: inline-flex;
  align-items: center;
  padding: 12px 22px;
  background: var(--ink);
  color: var(--paper);
  font-size: 13px;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
}
.wv-empty__cta:active { background: var(--ink-2); }
.wv-empty__alt {
  margin-top: 14px;
  font-size: 12px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: var(--ink-4);
  cursor: pointer;
}
.wv-empty__alt:active { color: var(--primary); }

/* === Week Grid === */
.wv-grid {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 0 16px;
  gap: 4px;
  margin-top: 4px;
  border-top: 1px solid var(--rule-soft);
  padding-top: 14px;
}
.wv-grid::-webkit-scrollbar { display: none; }

.wv-day {
  flex: 0 0 calc((100% - 32px) / 3.5);
  scroll-snap-align: start;
  min-width: 100px;
}
.wv-day--today {
  flex: 0 0 calc((100% - 32px) / 3);
}

/* === Day header === */
.wv-day__head {
  text-align: center;
  padding: 4px 0 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--rule-soft);
  margin-bottom: 8px;
}
.wv-day__name {
  display: block;
  font-size: 10px;
  color: var(--ink-4);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.wv-day__num {
  display: inline-block;
  font-family: var(--display);
  font-weight: 300;
  font-size: 24px;
  line-height: 1;
  color: var(--ink-2);
  letter-spacing: -0.01em;
  font-variation-settings: 'opsz' 30;
}
.wv-day__count {
  display: block;
  font-family: var(--display);
  font-weight: 400;
  font-size: 10.5px;
  color: var(--ink-4);
  letter-spacing: 0.04em;
  margin-top: 4px;
  font-variation-settings: 'opsz' 12;
}

.wv-day--today .wv-day__name {
  color: var(--ink);
  font-weight: 500;
}
.wv-day--today .wv-day__num {
  color: var(--ink);
  font-weight: 500;
}
.wv-day--today .wv-day__num::after {
  content: "";
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
  margin: 6px auto 0;
}

/* === Day body === */
.wv-day__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 2px 16px;
}
.wv-day--today .wv-day__body {
  position: relative;
}
.wv-day--today .wv-day__body::before {
  content: "";
  position: absolute;
  top: -8px; left: 0; right: 0; bottom: 0;
  background: rgba(74, 124, 89, 0.04);
  border-radius: 8px;
  pointer-events: none;
}

/* === Cards === */
.wv-card {
  border-radius: 10px;
  padding: 10px 11px;
  cursor: pointer;
  transition: transform 0.15s ease;
  position: relative;
  overflow: hidden;
}
.wv-card:active { transform: scale(0.97); }
.wv-card--done { opacity: 0.45; }

.wv-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wv-card__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--ink-3);
}
.wv-card__time {
  font-family: var(--display);
  font-weight: 400;
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  font-variation-settings: 'opsz' 14;
}
.wv-card__type {
  font-family: var(--display);
  font-weight: 400;
  font-size: 14px;
  color: var(--ink);
  margin-top: 4px;
  line-height: 1.2;
  letter-spacing: -0.005em;
  font-variation-settings: 'opsz' 18;
}
.wv-card__member {
  font-size: 12px;
  color: var(--ink-2);
  margin-top: 3px;
  letter-spacing: 0.01em;
}
.wv-card__location {
  font-size: 10.5px;
  color: var(--ink-3);
  margin-top: 2px;
  letter-spacing: 0.02em;
}
.wv-card__footer {
  margin-top: 8px;
}
.wv-card__status {
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.wv-card__status--completed { color: var(--primary); }
.wv-card__status--scheduled { color: var(--ink-3); }

/* Default (no theme picked) — soft sage tint */
.wv-card {
  background: rgba(74, 124, 89, 0.04);
  border: 1px solid rgba(74, 124, 89, 0.10);
}

/* Gradient theme overrides (via parent class) */
.theme-candy-gradient .wv-card__time,
.theme-candy-gradient .wv-card__type,
.theme-candy-gradient .wv-card__member,
.theme-candy-gradient .wv-card__location {
  color: #fff;
}

.theme-candy-gradient .wv-card__time { opacity: 0.85; }
.theme-candy-gradient .wv-card__member { opacity: 0.9; }
.theme-candy-gradient .wv-card__location { opacity: 0.7; }

.theme-candy-gradient .wv-card__status {
  background: rgba(255,255,255,0.25);
  color: #fff;
  backdrop-filter: blur(4px);
}

.theme-candy-gradient .wv-card::after {
  content: "";
  position: absolute;
  top: 0; right: 0;
  width: 60%; height: 100%;
  background: rgba(255,255,255,0.1);
  border-radius: 0 0 0 80px;
  pointer-events: none;
}

/* Soft color type colors */
.theme-soft-color .wv-card--pilates .wv-card__type { color: #3B52A5; }
.theme-soft-color .wv-card--yoga .wv-card__type { color: #B85C1F; }
.theme-soft-color .wv-card--fitness .wv-card__type { color: #1A7A4C; }
.theme-soft-color .wv-card--group .wv-card__type { color: #7C3AED; }

/* === Empty Day === */
.wv-day-empty {
  text-align: center;
  padding: 28px 0;
  cursor: pointer;
}
.wv-day-empty__mark {
  display: inline-block;
  width: 16px;
  height: 1px;
  background: var(--ink-5);
  opacity: 0.6;
  transition: width 0.18s, background 0.18s;
}
.wv-day-empty:active .wv-day-empty__mark {
  width: 24px;
  background: var(--primary);
  opacity: 1;
}

/* === Shot mode: 7 days visible, no scroll === */
.week-page.is-shot {
  background: var(--paper);
  padding-bottom: 20px;
}
.is-shot .wv-grid {
  overflow-x: hidden;
  padding: 14px 16px 0;
  gap: 4px;
  border-top: none;
}
.is-shot .wv-day, .is-shot .wv-day--today {
  flex: 1 1 0;
  min-width: 0;
}
.is-shot .wv-day__num { font-size: 18px; }
.is-shot .wv-day__name { font-size: 9px; }
.is-shot .wv-day__count { font-size: 9.5px; margin-top: 2px; }
.is-shot .wv-card { padding: 6px; border-radius: 6px; }
.is-shot .wv-card__time { font-size: 9px; }
.is-shot .wv-card__type { font-size: 11px; margin-top: 2px; }
.is-shot .wv-card__member { font-size: 10px; margin-top: 1px; }
.is-shot .wv-card__location { display: none; }
.is-shot .wv-card__footer { display: none; }
.is-shot .wv-day-empty { padding: 14px 0; }

/* === Brand watermark === */
.wv-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 20px 16px;
  color: var(--ink-3);
}
.wv-brand__mark {
  display: inline-block;
  width: 14px;
  height: 1px;
  background: var(--ink-3);
  opacity: 0.5;
}
.wv-brand__name {
  font-family: var(--display);
  font-weight: 400;
  font-size: 12.5px;
  color: var(--ink-2);
  letter-spacing: 0.04em;
}
.wv-brand__url {
  font-family: var(--display);
  font-style: italic;
  font-weight: 300;
  font-size: 11px;
  color: var(--ink-4);
  letter-spacing: 0.02em;
}

/* === FAB === */
.wv-fab {
  position: fixed;
  bottom: 78px;
  right: 22px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(31, 29, 26, 0.18);
  cursor: pointer;
  z-index: 10;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  -webkit-user-select: none;
  user-select: none;
}
.wv-fab:active {
  transform: scale(0.92);
  box-shadow: 0 4px 14px rgba(31, 29, 26, 0.25);
}
</style>
