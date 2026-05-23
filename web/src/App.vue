<template>
  <div class="app">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['WeekView', 'MemberList']">
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <nav class="tabbar" v-if="showTabbar">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        class="tabbar__item"
        :class="{ 'tabbar__item--active': activeTab === tab.path }"
        @click="$router.push(tab.path)"
        :aria-label="tab.label"
      >
        <span class="tabbar__icon" v-html="tab.icon"></span>
        <span class="tabbar__label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const ICON_WEEK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="5" width="18" height="16" rx="1.5" />
  <line x1="3" y1="10" x2="21" y2="10" />
  <line x1="8" y1="3" x2="8" y2="7" />
  <line x1="16" y1="3" x2="16" y2="7" />
</svg>`

const ICON_MEMBERS = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="8" r="3.5" />
  <path d="M5 21v-1.5a5.5 5.5 0 0 1 5.5-5.5h3a5.5 5.5 0 0 1 5.5 5.5V21" />
</svg>`

const ICON_SETTINGS = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" y1="7" x2="13" y2="7" />
  <circle cx="17" cy="7" r="2.4" />
  <line x1="4" y1="17" x2="9" y2="17" />
  <circle cx="13" cy="17" r="2.4" />
  <line x1="17" y1="17" x2="20" y2="17" />
</svg>`

const tabs = [
  { path: '/week', label: '排课', icon: ICON_WEEK },
  { path: '/members', label: '会员', icon: ICON_MEMBERS },
  { path: '/settings', label: '设置', icon: ICON_SETTINGS },
]

const tabPaths = tabs.map(t => t.path)
const showTabbar = computed(() => tabPaths.includes(route.path))
const activeTab = computed(() => route.path)
</script>

<style scoped>
.app {
  min-height: 100vh;
  padding-bottom: 64px;
}

.tabbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  background: var(--paper);
  border-top: 1px solid var(--rule);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
  font-feature-settings: 'palt', 'kern';
}

.tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--ink-4);
  font-family: inherit;
  position: relative;
  transition: color 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.tabbar__item:active { color: var(--ink-2); }

.tabbar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.tabbar__label {
  font-size: 10.5px;
  letter-spacing: 0.16em;
  font-weight: 400;
}

.tabbar__item--active {
  color: var(--ink);
}

.tabbar__item--active::after {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 1.5px;
  background: var(--ink);
  border-radius: 1px;
}
</style>
