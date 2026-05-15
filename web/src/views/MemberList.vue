<template>
  <div class="member-page">
    <div class="page-header">
      <h2 class="page-header__title">会员</h2>
      <span class="page-header__count" v-if="members.length">{{ members.length }} 人</span>
    </div>

    <van-search v-model="keyword" placeholder="搜索会员" shape="round" />

    <div class="member-list" v-if="filtered.length">
      <div v-for="m in filtered" :key="m.id" class="member-item"
        @click="$router.push('/member/' + m.id)">
        <div class="avatar" :style="{ background: avatarColor(m.name) }">
          {{ m.name?.charAt(0) || '?' }}
        </div>
        <div class="member-item__body">
          <div class="member-item__name">{{ m.name }}</div>
          <div class="member-item__tags" v-if="m.tags?.length">
            <span v-for="tag in m.tags" :key="tag" class="mini-tag">{{ tag }}</span>
          </div>
          <div class="member-item__meta" v-if="m.phone">{{ m.phone }}</div>
        </div>
        <span class="member-item__sessions">{{ sessionCount(m.id) }} 节</span>
      </div>
    </div>

    <div class="empty" v-else-if="!members.length">
      <p class="empty__icon">👤</p>
      <p class="empty__title">还没有会员</p>
      <p class="empty__sub">点击右下角添加第一位会员</p>
    </div>

    <div class="fab" @click="$router.push('/member-edit')">+</div>
  </div>
</template>

<script>
import * as storage from '../services/storage'

const COLORS = ['#4A7C59','#7E9F7A','#C2A882','#80CBC4','#F48FB1','#AED581','#FFB74D','#90A4AE']

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
        m.name?.toLowerCase().includes(kw) || m.phone?.includes(kw)
      )
    }
  },
  activated() { this.load() },
  mounted() { this.load() },
  methods: {
    load() {
      this.members = storage.getMembers()
      this.sessions = storage.getSessions()
    },
    sessionCount(memberId) {
      return this.sessions.filter(s =>
        s.memberId === memberId || (s.memberIds && s.memberIds.includes(memberId))
      ).length
    },
    avatarColor(name) {
      if (!name) return COLORS[0]
      let hash = 0
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
      return COLORS[Math.abs(hash) % COLORS.length]
    }
  }
}
</script>

<style scoped>
.member-page { background: var(--bg-page); min-height: 100vh; }

.page-header {
  display: flex; align-items: baseline; gap: 8px;
  padding: 20px 20px 8px;
}
.page-header__title { font-size: 22px; font-weight: 700; }
.page-header__count { font-size: 13px; color: var(--text-muted); }

.member-list { padding: 0 12px; }

.member-item {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-card); border-radius: 12px; padding: 14px 16px;
  margin-bottom: 8px; box-shadow: var(--shadow-card); cursor: pointer;
}

.avatar {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px; font-weight: 600;
}

.member-item__body { flex: 1; }
.member-item__name { font-size: 15px; font-weight: 500; }
.member-item__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
.mini-tag {
  font-size: 10px; padding: 1px 6px; border-radius: var(--radius-pill);
  background: var(--color-primary-light); color: var(--color-primary);
}
.member-item__meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.member-item__sessions { font-size: 12px; color: var(--text-muted); }

.empty { text-align: center; padding: 80px 20px; }
.empty__icon { font-size: 48px; }
.empty__title { font-size: 16px; color: var(--text-primary); font-weight: 500; margin-top: 8px; }
.empty__sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

.fab {
  position: fixed; bottom: 80px; right: 24px;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--color-primary); color: #fff;
  font-size: 28px; display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-float); cursor: pointer;
}
</style>
