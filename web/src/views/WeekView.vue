<template>
  <div class="week-page">
    <!-- Header -->
    <header class="header">
      <div class="header__nav">
        <button class="header__arrow" @click="changeWeek(-1)">‹</button>
        <span class="header__range">{{ rangeLabel }}</span>
        <button class="header__arrow" @click="changeWeek(1)">›</button>
      </div>
      <div class="stats" v-if="sessions.length">
        <span class="stats__item">已排 {{ stats.total }} 节</span>
        <span class="stats__item stats__item--completed">完成 {{ stats.completed }}</span>
        <span class="stats__item stats__item--cancelled">取消 {{ stats.cancelled }}</span>
      </div>
    </header>

    <!-- Empty state -->
    <div class="empty" v-if="!sessions.length">
      <div class="empty__icon">📋</div>
      <p class="empty__title">这周还没有排课哦～</p>
      <p class="empty__sub">点击下方 + 开始排课吧</p>
    </div>

    <!-- Grid -->
    <div class="grid" v-else>
      <div class="grid__header">
        <div class="grid__corner"></div>
        <div
          v-for="day in week.days" :key="day.date"
          class="grid__day-head"
          :class="{ 'grid__day-head--today': day.isToday }"
          @click="$router.push('/day/' + day.date)"
        >
          <span class="grid__weekday">{{ day.weekday }}</span>
          <span class="grid__daynum">{{ day.dayNum }}</span>
        </div>
      </div>
      <div class="grid__row" v-for="period in grid" :key="period.name">
        <div class="grid__period">{{ period.name }}</div>
        <div
          v-for="day in week.days" :key="day.date"
          class="grid__cell"
          :class="{ 'grid__cell--today': day.isToday }"
          @click="$router.push('/session?date=' + day.date)"
        >
          <div
            v-for="card in period.slots[day.date]" :key="card.id"
            class="card"
            :style="{ background: card.cardColor }"
            @click.stop="$router.push('/session/' + card.id)"
          >
            <span class="card__time">{{ card.startTime }}</span>
            <span class="card__course">{{ card.courseType }}</span>
            <span class="card__name" v-if="card.displayName">{{ card.displayName }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="toolbar__btn toolbar__btn--primary" @click="$router.push('/session')">
        <span class="toolbar__plus">+</span>
        <span>新建课程</span>
      </button>
    </div>
  </div>
</template>

<script>
import * as storage from '../services/storage'
import { getWeekRange } from '../utils/dateUtil'

const TIME_PERIODS = [
  { name: '上午', startMin: 0, endMin: 720 },
  { name: '中午', startMin: 720, endMin: 840 },
  { name: '下午', startMin: 840, endMin: 1080 },
  { name: '晚上', startMin: 1080, endMin: 1440 }
]

const CARD_COLORS = [
  '#4A7C59', '#7E9F7A', '#A8B8A0', '#C2A882', '#B8A898',
  '#9EABA2', '#80CBC4', '#F48FB1', '#AED581', '#FFB74D'
]

export default {
  name: 'WeekView',
  data() {
    return { currentDate: new Date(), week: null, grid: [], sessions: [], stats: {} }
  },
  computed: {
    rangeLabel() {
      if (!this.week) return ''
      const s = this.week.days[0], e = this.week.days[6]
      return `${parseInt(s.date.slice(5,7))}月${s.dayNum}日 - ${parseInt(e.date.slice(5,7))}月${e.dayNum}日`
    }
  },
  activated() { this.loadWeek() },
  mounted() { this.loadWeek() },
  methods: {
    loadWeek() {
      const week = getWeekRange(this.currentDate)
      const sessions = storage.getSessionsByDateRange(week.start, week.end)
      const members = storage.getMembers()
      const memberMap = {}
      members.forEach(m => { memberMap[m.id] = m })

      const courseTypes = [...new Set(sessions.map(s => s.courseType).filter(Boolean))]
      const colorMap = {}
      courseTypes.forEach((t, i) => { colorMap[t] = CARD_COLORS[i % CARD_COLORS.length] })

      const grid = TIME_PERIODS.map(p => {
        const slots = {}
        week.days.forEach(d => { slots[d.date] = [] })
        return { ...p, slots }
      })

      sessions.forEach(s => {
        if (s.status === 'cancelled') return
        const [h, m] = s.startTime.split(':').map(Number)
        const sMin = h * 60 + m
        const period = grid.find(g => sMin >= g.startMin && sMin < g.endMin)
        if (period && period.slots[s.date]) {
          const member = memberMap[s.memberId]
          period.slots[s.date].push({
            id: s.id,
            startTime: s.startTime,
            courseType: s.courseType || '',
            displayName: member ? member.name : (s.classMode === 'group' ? '团课' : ''),
            cardColor: colorMap[s.courseType] || '#90A4AE',
            status: s.status
          })
        }
      })

      grid.forEach(g => {
        Object.values(g.slots).forEach(arr => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)))
      })

      let total = sessions.length, completed = 0, cancelled = 0
      sessions.forEach(s => {
        if (s.status === 'completed') completed++
        if (s.status === 'cancelled') cancelled++
      })

      this.week = week
      this.grid = grid
      this.sessions = sessions
      this.stats = { total, completed, cancelled }
    },
    changeWeek(dir) {
      const d = new Date(this.currentDate)
      d.setDate(d.getDate() + dir * 7)
      this.currentDate = d
      this.loadWeek()
    }
  }
}
</script>

<style scoped>
.week-page { padding-bottom: 80px; }

.header { padding: 16px 20px 8px; text-align: center; }
.header__nav { display: flex; align-items: center; justify-content: center; gap: 16px; }
.header__arrow {
  background: none; border: none; font-size: 22px; color: var(--text-muted);
  cursor: pointer; padding: 4px 8px;
}
.header__range { font-size: 17px; font-weight: 600; color: var(--text-primary); }
.stats { display: flex; justify-content: center; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--text-secondary); }
.stats__item--completed { color: var(--color-completed); }
.stats__item--cancelled { color: var(--color-cancelled); }

.empty { text-align: center; padding: 80px 20px; }
.empty__icon { font-size: 48px; margin-bottom: 12px; }
.empty__title { font-size: 16px; color: var(--text-primary); font-weight: 500; }
.empty__sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

.grid {
  margin: 8px 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.grid__header { display: flex; background: var(--color-primary); }
.grid__corner { width: 36px; flex-shrink: 0; }
.grid__day-head {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 6px 0; cursor: pointer;
}
.grid__day-head--today { background: var(--color-primary-dark); }
.grid__weekday { font-size: 10px; color: rgba(255,255,255,0.65); }
.grid__day-head--today .grid__weekday { color: rgba(255,255,255,0.85); }
.grid__daynum { font-size: 14px; font-weight: 600; color: #fff; }

.grid__row { display: flex; background: var(--bg-card); }
.grid__row + .grid__row { border-top: 1px solid var(--bg-hairline); }
.grid__period {
  width: 36px; flex-shrink: 0; display: flex; align-items: flex-start;
  justify-content: center; padding-top: 6px; background: var(--bg-input);
  font-size: 10px; font-weight: 500; color: var(--text-muted);
}
.grid__cell {
  flex: 1; min-height: 60px; padding: 2px; display: flex;
  flex-direction: column; gap: 2px; cursor: pointer;
}
.grid__cell + .grid__cell { border-left: 1px solid var(--bg-hairline); }
.grid__cell--today { background: var(--color-primary-light); }

.card { border-radius: 3px; padding: 2px 4px; overflow: hidden; cursor: pointer; }
.card__time { display: block; font-size: 9px; color: rgba(255,255,255,0.8); line-height: 1.3; }
.card__course {
  display: block; font-size: 10px; color: #fff; font-weight: 600; line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.card__name {
  display: block; font-size: 9px; color: rgba(255,255,255,0.75); line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.toolbar {
  position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px; padding: 8px 20px;
  padding-bottom: 8px; z-index: 10;
}
.toolbar__btn {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  width: 100%; height: 44px; border: none; border-radius: 999px;
  font-size: 15px; font-weight: 500; cursor: pointer;
}
.toolbar__btn--primary { background: var(--color-primary); color: #fff; }
.toolbar__plus { font-size: 20px; font-weight: 300; }
</style>
