<template>
  <div class="day-page">
    <van-nav-bar :title="pageTitle" left-arrow @click-left="$router.back()" />
    <div class="day-sessions" v-if="sessions.length">
      <div
        v-for="s in sessions" :key="s.id"
        class="session-item"
        @click="$router.push('/session/' + s.id)"
      >
        <div class="session-item__time">
          <span class="session-item__start">{{ s.startTime }}</span>
          <span class="session-item__dur">{{ s.duration || 60 }}min</span>
        </div>
        <div class="session-item__body">
          <div class="session-item__title">{{ s.courseType || '课程' }}</div>
          <div class="session-item__meta">
            <span v-if="memberName(s)">{{ memberName(s) }}</span>
            <span v-if="s.location">· {{ s.location }}</span>
          </div>
        </div>
        <span class="session-item__status" :class="'session-item__status--' + s.status">
          {{ statusLabel(s.status) }}
        </span>
      </div>
    </div>
    <div class="empty" v-else>
      <p class="empty__icon">🗓️</p>
      <p class="empty__title">当天没有课程</p>
    </div>
    <div class="fab" @click="$router.push('/session?date=' + date)">+</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as storage from '../services/storage'
import { parseDate } from '../utils/dateUtil'

const route = useRoute()
const date = route.params.date
const sessions = ref([])
const members = ref([])

const WEEKDAYS = ['周日','周一','周二','周三','周四','周五','周六']

const pageTitle = (() => {
  const d = parseDate(date)
  return `${d.getMonth()+1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`
})()

onMounted(() => {
  sessions.value = storage.getSessionsByDate(date)
  members.value = storage.getMembers()
})

function memberName(s) {
  const m = members.value.find(m => m.id === s.memberId)
  return m ? m.name : ''
}

function statusLabel(status) {
  const map = { scheduled: '待上课', completed: '已完成', cancelled: '已取消', noshow: '未出勤' }
  return map[status] || status
}
</script>

<style scoped>
.day-page { background: var(--bg-page); min-height: 100vh; }

.day-sessions { padding: 12px; }

.session-item {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-card); border-radius: 12px; padding: 14px 16px;
  margin-bottom: 8px; box-shadow: var(--shadow-card); cursor: pointer;
}

.session-item__time { text-align: center; min-width: 44px; }
.session-item__start { display: block; font-size: 16px; font-weight: 600; color: var(--color-primary); }
.session-item__dur { display: block; font-size: 11px; color: var(--text-muted); }

.session-item__body { flex: 1; }
.session-item__title { font-size: 15px; font-weight: 500; }
.session-item__meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

.session-item__status {
  font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 500;
}
.session-item__status--scheduled { background: rgba(242,139,130,0.15); color: var(--color-scheduled); }
.session-item__status--completed { background: rgba(129,201,149,0.15); color: var(--color-completed); }
.session-item__status--cancelled { background: rgba(204,204,204,0.2); color: var(--color-cancelled); }
.session-item__status--noshow { background: rgba(255,183,77,0.15); color: var(--color-noshow); }

.empty { text-align: center; padding: 80px 20px; }
.empty__icon { font-size: 48px; }
.empty__title { font-size: 16px; color: var(--text-muted); margin-top: 8px; }

.fab {
  position: fixed; bottom: 24px; right: 24px;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--color-primary); color: #fff;
  font-size: 28px; display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-float); cursor: pointer;
}
</style>
