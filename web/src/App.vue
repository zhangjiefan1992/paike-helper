<template>
  <div class="app">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['WeekView', 'MemberList']">
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <nav class="tabbar" v-if="showTabbar">
      <div
        v-for="tab in tabs" :key="tab.path"
        class="tabbar__item"
        :class="{ 'tabbar__item--active': activeTab === tab.path }"
        @click="$router.push(tab.path)"
      >
        <span class="tabbar__icon">{{ tab.icon }}</span>
        <span class="tabbar__label">{{ tab.label }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const tabs = [
  { path: '/week', label: '排课', icon: '📅' },
  { path: '/members', label: '会员', icon: '👤' },
  { path: '/settings', label: '我的', icon: '⚙️' },
]

const tabPaths = tabs.map(t => t.path)
const showTabbar = computed(() => tabPaths.includes(route.path))
const activeTab = computed(() => route.path)
</script>

<style scoped>
.app {
  min-height: 100vh;
  padding-bottom: 60px;
}

.tabbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  background: var(--bg-card);
  box-shadow: 0 -1px 8px rgba(0,0,0,0.06);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0 4px;
  color: var(--text-muted);
  font-size: 10px;
  cursor: pointer;
  transition: color 0.2s;
}

.tabbar__item--active { color: var(--color-primary); }
.tabbar__icon { font-size: 20px; line-height: 1.2; }
.tabbar__label { margin-top: 2px; font-weight: 500; }
</style>
