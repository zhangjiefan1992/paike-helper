import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/week' },
  { path: '/week', name: 'week', component: () => import('../views/WeekView.vue') },
  { path: '/day/:date', name: 'day', component: () => import('../views/DayView.vue') },
  { path: '/session', name: 'session-new', component: () => import('../views/SessionForm.vue') },
  { path: '/session/:id', name: 'session-edit', component: () => import('../views/SessionForm.vue') },
  { path: '/members', name: 'members', component: () => import('../views/MemberList.vue') },
  { path: '/member/:id', name: 'member-detail', component: () => import('../views/MemberDetail.vue') },
  { path: '/member-edit', name: 'member-new', component: () => import('../views/MemberEdit.vue') },
  { path: '/member-edit/:id', name: 'member-edit', component: () => import('../views/MemberEdit.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
  { path: '/stats', name: 'stats', component: () => import('../views/StatsView.vue') },
  { path: '/summary/:id', name: 'summary', component: () => import('../views/SummaryView.vue') },
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
