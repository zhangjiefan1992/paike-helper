<template>
  <div class="detail-page" v-if="member">
    <van-nav-bar :title="member.name" left-arrow @click-left="$router.back()">
      <template #right>
        <span class="edit-btn" @click="$router.push('/member-edit/' + member.id)">编辑</span>
      </template>
    </van-nav-bar>

    <div class="profile">
      <div class="avatar" :style="{ background: avatarColor }">{{ member.name?.charAt(0) }}</div>
      <h3 class="profile__name">{{ member.name }}</h3>
      <p class="profile__phone" v-if="member.phone">{{ member.phone }}</p>
      <p class="profile__note" v-if="member.notes">{{ member.notes }}</p>
    </div>

    <div class="stat-row">
      <div class="stat-card">
        <span class="stat-card__num">{{ sessions.length }}</span>
        <span class="stat-card__label">总课时</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__num">{{ completedCount }}</span>
        <span class="stat-card__label">已完成</span>
      </div>
    </div>

    <div class="section-title" v-if="sessions.length">上课记录</div>
    <div class="timeline">
      <div v-for="s in sessions" :key="s.id" class="timeline-item"
        @click="$router.push('/session/' + s.id)">
        <div class="timeline-item__date">{{ formatSessionDate(s.date) }}</div>
        <div class="timeline-item__body">
          <span class="timeline-item__time">{{ s.startTime }}</span>
          <span class="timeline-item__type">{{ s.courseType }}</span>
          <span class="timeline-item__status" :class="'timeline-item__status--' + s.status">
            {{ statusLabel(s.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as storage from '../services/storage'

const route = useRoute()
const member = ref(null)
const sessions = ref([])

const COLORS = ['#4A7C59','#7E9F7A','#C2A882','#80CBC4','#F48FB1','#AED581','#FFB74D']
const avatarColor = computed(() => {
  if (!member.value?.name) return COLORS[0]
  let h = 0
  for (const c of member.value.name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
})

const completedCount = computed(() => sessions.value.filter(s => s.status === 'completed').length)

onMounted(() => {
  member.value = storage.getMemberById(route.params.id)
  if (member.value) {
    sessions.value = storage.getSessionsByMemberId(member.value.id)
  }
})

function formatSessionDate(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function statusLabel(status) {
  return { scheduled: '待上课', completed: '已完成', cancelled: '已取消', noshow: '未出勤' }[status] || status
}
</script>

<style scoped>
.detail-page { background: var(--bg-page); min-height: 100vh; }
.edit-btn { color: var(--color-primary); font-size: 14px; }

.profile { text-align: center; padding: 24px 20px 16px; }
.avatar {
  width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 26px; font-weight: 600;
}
.profile__name { font-size: 20px; font-weight: 600; }
.profile__phone { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.profile__note { font-size: 13px; color: var(--text-secondary); margin-top: 8px; }

.stat-row { display: flex; gap: 12px; padding: 0 16px; margin-bottom: 16px; }
.stat-card {
  flex: 1; background: var(--bg-card); border-radius: 12px; padding: 16px;
  text-align: center; box-shadow: var(--shadow-card);
}
.stat-card__num { display: block; font-size: 24px; font-weight: 700; color: var(--color-primary); }
.stat-card__label { display: block; font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.section-title { padding: 8px 20px; font-size: 14px; font-weight: 600; color: var(--text-secondary); }

.timeline { padding: 0 16px; }
.timeline-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: var(--bg-card); border-radius: 10px;
  margin-bottom: 6px; cursor: pointer;
}
.timeline-item__date { font-size: 13px; color: var(--text-muted); min-width: 36px; }
.timeline-item__body { flex: 1; display: flex; align-items: center; gap: 8px; }
.timeline-item__time { font-size: 14px; font-weight: 500; }
.timeline-item__type { font-size: 13px; color: var(--text-secondary); }
.timeline-item__status {
  font-size: 11px; padding: 1px 8px; border-radius: 999px; margin-left: auto;
}
.timeline-item__status--completed { background: rgba(129,201,149,0.15); color: var(--color-completed); }
.timeline-item__status--scheduled { background: rgba(242,139,130,0.15); color: var(--color-scheduled); }
.timeline-item__status--cancelled { background: rgba(204,204,204,0.2); color: var(--color-cancelled); }
</style>
