<template>
  <div class="stats-page" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <!-- 维度切换 -->
    <div class="view-toggle">
      <button class="toggle-btn" @click="toggleMode">
        {{ viewMode === 'week' ? '按月' : '按周' }}
      </button>
    </div>

    <!-- 时段导航 -->
    <div class="period-nav">
      <button class="nav-arrow" @click="onPrev">‹</button>
      <span class="nav-label">{{ periodLabel }}</span>
      <button class="nav-arrow" @click="onNext">›</button>
    </div>

    <!-- 空状态 -->
    <div v-if="isEmpty" class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">{{ viewMode === 'week' ? '本周暂无课程数据' : '本月暂无课程数据' }}</div>
      <div class="empty-sub">{{ viewMode === 'week' ? '切换到其他周查看，或去排课吧' : '切换到其他月查看，或去排课吧' }}</div>
    </div>

    <template v-else>
      <!-- 课时汇总 -->
      <section class="section">
        <h3 class="section-title">课时汇总</h3>
        <div class="summary-grid">
          <div class="summary-card summary-card--primary">
            <div class="summary-val">{{ summary.total }}</div>
            <div class="summary-label">总课时</div>
            <div class="summary-diff" :class="diffClass">
              较上{{ viewMode === 'week' ? '周' : '月' }} {{ summary.diffText }}
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-val summary-val--green">{{ summary.completed }}</div>
            <div class="summary-label">已完成</div>
          </div>
          <div class="summary-card">
            <div class="summary-val summary-val--grey">{{ summary.cancelled }}</div>
            <div class="summary-label">已取消</div>
          </div>
          <div class="summary-card">
            <div class="summary-val summary-val--orange">{{ summary.noshow }}</div>
            <div class="summary-label">爽约</div>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-item">
            <span class="detail-label">教学时长</span>
            <span class="detail-val">{{ summary.totalHoursText }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">私教</span>
            <span class="detail-val">{{ summary.privateCnt }} 节</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">团课</span>
            <span class="detail-val">{{ summary.groupCnt }} 节</span>
          </div>
        </div>
      </section>

      <!-- 会员活跃度 -->
      <section class="section">
        <h3 class="section-title">会员活跃度</h3>
        <div v-if="activeMembers.length" class="member-rank">
          <div class="rank-item" v-for="(m, idx) in activeMembers" :key="m.id"
            @click="goMember(m.id)">
            <span class="rank-num">{{ idx + 1 }}</span>
            <span class="rank-name">{{ m.name }}</span>
            <span class="rank-sub">本月 {{ m.monthCount }} 节</span>
            <span class="rank-count">{{ m.weekCount }} <small>节</small></span>
          </div>
        </div>
        <div v-else class="empty-hint">本周暂无会员上课</div>

        <div v-if="inactiveMembers.length" class="inactive-section">
          <div class="inactive-title">超过7天未上课</div>
          <div class="inactive-list">
            <div class="inactive-item" v-for="m in inactiveMembers" :key="m.id"
              @click="goMember(m.id)">
              <span class="inactive-name">{{ m.name }}</span>
              <span class="inactive-days">{{ m.daysSince }}天未上课</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 课程类型分布 -->
      <section class="section" v-if="courseTypeBars.length">
        <h3 class="section-title">课程类型分布</h3>
        <div class="bar-list">
          <div class="bar-item" v-for="b in courseTypeBars" :key="b.name">
            <span class="bar-label">{{ b.name }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: b.percent + '%' }"></div>
            </div>
            <span class="bar-count">{{ b.count }}</span>
          </div>
        </div>
      </section>

      <!-- 地点分布 -->
      <section class="section" v-if="locationBars.length">
        <h3 class="section-title">上课地点分布</h3>
        <div class="bar-list">
          <div class="bar-item" v-for="b in locationBars" :key="b.name">
            <span class="bar-label">{{ b.name }}</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--alt" :style="{ width: b.percent + '%' }"></div>
            </div>
            <span class="bar-count">{{ b.count }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getWeekRange, getLastWeekRange, getMonthRange, getLastMonthRange,
  toDateStr, parseDate, addDays
} from '../utils/dateUtil'
import * as storage from '../services/storage'

function getSessionsByDateRange(start, end) { return storage.getSessionsByDateRange(start, end) }
function getMembers() { return storage.getMembers() }
function getSessions() { return storage.getSessions() }

const router = useRouter()

const viewMode = ref('week')
const periodLabel = ref('')
const isEmpty = ref(true)
const summary = ref({
  total: 0, completed: 0, cancelled: 0, noshow: 0,
  privateCnt: 0, groupCnt: 0, totalMinutes: 0,
  diff: 0, diffText: '0', totalHoursText: '0分钟'
})
const activeMembers = ref([])
const inactiveMembers = ref([])
const courseTypeBars = ref([])
const locationBars = ref([])

let currentDate = new Date()

const diffClass = computed(() => {
  if (summary.value.diff > 0) return 'diff--up'
  if (summary.value.diff < 0) return 'diff--down'
  return ''
})

function loadStats(date) {
  const isMonth = viewMode.value === 'month'
  let currentRange, lastRange

  if (isMonth) {
    currentRange = getMonthRange(date)
    lastRange = getLastMonthRange(date)
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    periodLabel.value = y + '年' + m + '月'
  } else {
    const wr = getWeekRange(date)
    currentRange = { start: wr.start, end: wr.end }
    const lr = getLastWeekRange(date)
    lastRange = { start: lr.start, end: lr.end }
    periodLabel.value = currentRange.start.substring(5).replace('-', '/') + ' - ' + currentRange.end.substring(5).replace('-', '/')
  }

  const currentSessions = getSessionsByDateRange(currentRange.start, currentRange.end)
  const lastSessions = getSessionsByDateRange(lastRange.start, lastRange.end)
  const members = getMembers()
  const allSessions = getSessions()

  const s = calcSummary(currentSessions, lastSessions)
  s.totalHoursText = formatHours(s.totalMinutes)
  s.diffText = s.diff > 0 ? '+' + s.diff : String(s.diff)
  summary.value = s

  const activity = calcMemberActivity(currentSessions, members, allSessions)
  activeMembers.value = activity.active
  inactiveMembers.value = activity.inactive

  courseTypeBars.value = calcDistribution(currentSessions, 'courseType')
  locationBars.value = calcDistribution(currentSessions, 'location')

  isEmpty.value = currentSessions.length === 0
  currentDate = date
}

function calcSummary(sessions, lastSessions) {
  let total = 0, completed = 0, cancelled = 0, noshow = 0
  let privateCnt = 0, groupCnt = 0, totalMinutes = 0
  sessions.forEach(s => {
    total++
    if (s.status === 'completed') completed++
    if (s.status === 'cancelled') cancelled++
    if (s.status === 'noshow') noshow++
    if (s.classMode === 'group') groupCnt++
    else privateCnt++
    totalMinutes += (s.duration || 60)
  })
  const diff = total - lastSessions.length
  return { total, completed, cancelled, noshow, privateCnt, groupCnt, totalMinutes, diff }
}

function calcMemberActivity(weekSessions, members, allSessions) {
  const memberMap = {}
  members.forEach(m => { memberMap[m.id] = m })
  const weekCount = {}
  weekSessions.forEach(s => {
    const ids = []
    if (s.memberId) ids.push(s.memberId)
    if (s.memberIds) s.memberIds.forEach(id => ids.push(id))
    ids.forEach(id => { weekCount[id] = (weekCount[id] || 0) + 1 })
  })
  const now = new Date()
  const thisMonthPrefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const monthCount = {}
  const lastSessionDate = {}
  allSessions.forEach(s => {
    if (s.date && s.date.startsWith(thisMonthPrefix)) {
      const ids = []
      if (s.memberId) ids.push(s.memberId)
      if (s.memberIds) s.memberIds.forEach(id => ids.push(id))
      ids.forEach(id => { monthCount[id] = (monthCount[id] || 0) + 1 })
    }
    const ids2 = []
    if (s.memberId) ids2.push(s.memberId)
    if (s.memberIds) s.memberIds.forEach(id => ids2.push(id))
    ids2.forEach(id => {
      if (!lastSessionDate[id] || s.date > lastSessionDate[id]) lastSessionDate[id] = s.date
    })
  })

  const todayStr = toDateStr(now)
  const sevenDaysAgo = addDays(todayStr, -7)
  const active = []
  const inactive = []

  members.forEach(m => {
    const wk = weekCount[m.id] || 0
    const mo = monthCount[m.id] || 0
    const lastDate = lastSessionDate[m.id] || ''
    if (wk > 0) {
      active.push({ id: m.id, name: m.name, weekCount: wk, monthCount: mo })
    } else if (lastDate && lastDate < sevenDaysAgo) {
      const daysSince = Math.floor((parseDate(todayStr) - parseDate(lastDate)) / 86400000)
      inactive.push({ id: m.id, name: m.name, daysSince })
    }
  })
  active.sort((a, b) => b.weekCount - a.weekCount)
  inactive.sort((a, b) => b.daysSince - a.daysSince)
  return { active, inactive }
}

function calcDistribution(sessions, field) {
  const counts = {}
  sessions.forEach(s => {
    const val = s[field]
    if (val) counts[val] = (counts[val] || 0) + 1
  })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = entries.length > 0 ? entries[0][1] : 1
  return entries.map(([name, count]) => ({
    name, count, percent: Math.round((count / max) * 100)
  }))
}

function formatHours(minutes) {
  if (minutes < 60) return minutes + '分钟'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? h + '小时' + m + '分' : h + '小时'
}

function toggleMode() {
  viewMode.value = viewMode.value === 'week' ? 'month' : 'week'
  loadStats(currentDate)
}

function onPrev() {
  const d = new Date(currentDate)
  if (viewMode.value === 'month') d.setMonth(d.getMonth() - 1)
  else d.setDate(d.getDate() - 7)
  loadStats(d)
}

function onNext() {
  const d = new Date(currentDate)
  if (viewMode.value === 'month') d.setMonth(d.getMonth() + 1)
  else d.setDate(d.getDate() + 7)
  loadStats(d)
}

let touchStartX = 0
function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) < 50) return
  const d = new Date(currentDate)
  if (viewMode.value === 'month') d.setMonth(d.getMonth() + (dx < 0 ? 1 : -1))
  else d.setDate(d.getDate() + (dx < 0 ? 7 : -7))
  loadStats(d)
}

function goMember(id) {
  router.push('/member/' + id)
}

onMounted(() => loadStats(currentDate))
onActivated(() => loadStats(currentDate))
</script>

<style scoped>
.stats-page {
  padding: 16px;
  padding-bottom: 80px;
  min-height: 100vh;
  background: var(--bg-page, #f5f5f5);
}

.view-toggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.toggle-btn {
  font-size: 13px;
  padding: 4px 14px;
  border-radius: 20px;
  background: var(--bg-card, #fff);
  color: var(--color-primary, #6B8DE3);
  border: 1px solid var(--color-primary, #6B8DE3);
  cursor: pointer;
}

.period-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}
.nav-arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-card, #fff);
  border: none;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.nav-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary, #999);
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-title { font-size: 16px; margin-bottom: 6px; color: var(--text-primary, #666); }
.empty-sub { font-size: 13px; }

.section {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text-primary, #333);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.summary-card {
  text-align: center;
  padding: 10px 4px;
  border-radius: 8px;
  background: var(--bg-page, #f5f5f5);
}
.summary-card--primary {
  background: var(--color-primary, #6B8DE3);
  color: #fff;
}
.summary-card--primary .summary-label { color: rgba(255,255,255,0.8); }
.summary-val { font-size: 24px; font-weight: 700; }
.summary-val--green { color: #81C995; }
.summary-val--grey { color: #aaa; }
.summary-val--orange { color: #FFB74D; }
.summary-label { font-size: 12px; color: var(--text-secondary, #999); margin-top: 2px; }
.summary-diff { font-size: 11px; margin-top: 4px; color: rgba(255,255,255,0.7); }
.diff--up { color: #81C995; }
.diff--down { color: #F28B82; }
.summary-card--primary .diff--up { color: rgba(255,255,255,0.9); }
.summary-card--primary .diff--down { color: #FFD6D6; }

.detail-row {
  display: flex;
  justify-content: space-around;
  padding-top: 10px;
  border-top: 1px solid var(--border-color, #eee);
}
.detail-item { text-align: center; }
.detail-label { font-size: 12px; color: var(--text-secondary, #999); display: block; }
.detail-val { font-size: 14px; font-weight: 600; color: var(--text-primary, #333); }

.member-rank { }
.rank-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  cursor: pointer;
  gap: 10px;
}
.rank-item:last-child { border-bottom: none; }
.rank-num {
  width: 20px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary, #6B8DE3);
}
.rank-name { font-size: 14px; font-weight: 500; flex: 1; color: var(--text-primary, #333); }
.rank-sub { font-size: 12px; color: var(--text-secondary, #999); }
.rank-count { font-size: 18px; font-weight: 700; color: var(--color-primary, #6B8DE3); }
.rank-count small { font-size: 12px; font-weight: 400; }
.empty-hint { text-align: center; padding: 20px; color: var(--text-secondary, #999); font-size: 13px; }

.inactive-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #eee); }
.inactive-title { font-size: 13px; color: var(--text-secondary, #999); margin-bottom: 8px; }
.inactive-list { display: flex; flex-wrap: wrap; gap: 8px; }
.inactive-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-page, #f5f5f5);
  border-radius: 8px;
  cursor: pointer;
}
.inactive-name { font-size: 13px; color: var(--text-primary, #333); }
.inactive-days { font-size: 11px; color: #F28B82; }

.bar-list { }
.bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.bar-item:last-child { margin-bottom: 0; }
.bar-label { width: 60px; font-size: 13px; color: var(--text-primary, #333); text-align: right; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { flex: 1; height: 16px; background: var(--bg-page, #f0f0f0); border-radius: 8px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--color-primary, #6B8DE3); border-radius: 8px; transition: width 0.3s ease; }
.bar-fill--alt { background: #81C995; }
.bar-count { width: 28px; font-size: 13px; font-weight: 600; color: var(--text-primary, #333); }
</style>
