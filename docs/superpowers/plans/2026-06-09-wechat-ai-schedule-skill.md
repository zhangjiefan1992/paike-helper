# WeChat AI Schedule Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare a local-first WeChat Mini Program AI `schedule` SKILL that can query schedules, preview and commit bulk imports, update session status, and return weekly stats.

**Architecture:** Add one independent AI subpackage under `miniprogram/agent-packages/schedule-skill`. Because WeChat AI SKILLs must live in an independent subpackage, keep the SKILL self-contained with its own focused date, storage, parsing, and formatting helpers instead of importing main-package `utils/`. Use root-level Node tests with a stubbed `wx` storage API to verify business logic while AI 开发模式 is still under review.

**Tech Stack:** WeChat Mini Program native JS, CommonJS modules, WXML/WXSS atomic components, `wx.modelContext`, local `wx` storage keys, Node.js test harness with built-in `assert`.

---

## File Structure

Create:

- `tests/agent-schedule-skill/run.js` — local test runner that stubs `wx` storage and exercises pure AI SKILL APIs.
- `miniprogram/agent-packages/AGENTS.md` — optional global AI instruction for the Mini Program AI agent, kept under 10000 bytes.
- `miniprogram/agent-packages/page-meta.json` — optional fallback page metadata for week, stats, and session pages.
- `miniprogram/agent-packages/schedule-skill/SKILL.md` — business workflow and cross-interface rules.
- `miniprogram/agent-packages/schedule-skill/mcp.json` — model-callable API and component declarations.
- `miniprogram/agent-packages/schedule-skill/index.js` — registers all atomic APIs with `wx.modelContext.createSkill`.
- `miniprogram/agent-packages/schedule-skill/lib/date.js` — week/date helpers copied in focused form.
- `miniprogram/agent-packages/schedule-skill/lib/ids.js` — local `m_` / `s_` ID generation.
- `miniprogram/agent-packages/schedule-skill/lib/storage.js` — self-contained CRUD for `pk_members`, `pk_sessions`, `pk_config`, and `pk_ai_import_previews`.
- `miniprogram/agent-packages/schedule-skill/lib/importParser.js` — self-contained text-to-session parser for AI bulk import.
- `miniprogram/agent-packages/schedule-skill/lib/presenters.js` — member/status labels, schedule shaping, stats calculation, and result content helpers.
- `miniprogram/agent-packages/schedule-skill/apis/getWeekSchedule.js`
- `miniprogram/agent-packages/schedule-skill/apis/previewImportSchedule.js`
- `miniprogram/agent-packages/schedule-skill/apis/commitImportSchedule.js`
- `miniprogram/agent-packages/schedule-skill/apis/updateSessionStatus.js`
- `miniprogram/agent-packages/schedule-skill/apis/getWeekStats.js`
- `miniprogram/agent-packages/schedule-skill/components/week-schedule-card/index.{js,json,wxml,wxss}`
- `miniprogram/agent-packages/schedule-skill/components/import-preview-card/index.{js,json,wxml,wxss}`
- `miniprogram/agent-packages/schedule-skill/components/status-result-card/index.{js,json,wxml,wxss}`
- `miniprogram/agent-packages/schedule-skill/components/week-stats-card/index.{js,json,wxml,wxss}`

Modify:

- `miniprogram/app.json` — add `subPackages` and `agent` config.
- `project.config.json` — pin or raise `libVersion` to `3.16.1` for AI debugging. If Developer Tools rewrites this to `trial`, keep `trial` only when the UI confirms the active debug base library is 3.16.1 or higher.

Do not modify existing business pages or main-package `utils/` for the first pass.

---

## Task 1: Add Local Test Harness

**Files:**

- Create: `tests/agent-schedule-skill/run.js`

- [ ] **Step 1: Create the test harness with failing imports**

Create `tests/agent-schedule-skill/run.js`:

```js
const assert = require('assert')

const storageState = {}

global.wx = {
  getStorageSync(key) {
    return storageState[key]
  },
  setStorageSync(key, value) {
    storageState[key] = value
  },
  removeStorageSync(key) {
    delete storageState[key]
  }
}

function resetStorage() {
  Object.keys(storageState).forEach(key => delete storageState[key])
  wx.setStorageSync('pk_members', [
    { id: 'm_zhang', name: '张三', phone: '', avatar: '', notes: '', createdAt: 1, updatedAt: 1 },
    { id: 'm_li', name: '李四', phone: '', avatar: '', notes: '', createdAt: 1, updatedAt: 1 }
  ])
  wx.setStorageSync('pk_sessions', [
    {
      id: 's_mon_1000',
      date: '2026-06-08',
      startTime: '10:00',
      duration: 60,
      classMode: 'private',
      courseType: '普拉提',
      location: 'A教室',
      memberId: 'm_zhang',
      memberIds: [],
      status: 'scheduled',
      notes: '',
      focusAreas: [],
      photos: [],
      createdAt: 1,
      updatedAt: 1
    },
    {
      id: 's_wed_1400',
      date: '2026-06-10',
      startTime: '14:00',
      duration: 60,
      classMode: 'private',
      courseType: '瑜伽',
      location: '',
      memberId: 'm_li',
      memberIds: [],
      status: 'completed',
      notes: '',
      focusAreas: [],
      photos: [],
      createdAt: 1,
      updatedAt: 1
    }
  ])
  wx.setStorageSync('pk_config', {
    courseTypes: ['瑜伽', '普拉提', '体能训练', '拉伸放松'],
    locations: ['A教室'],
    focusAreaOptions: ['核心', '髋关节'],
    defaultDuration: 60,
    workingHours: { start: '08:00', end: '21:00' }
  })
}

async function testWeekSchedule() {
  resetStorage()
  const getWeekSchedule = require('../../miniprogram/agent-packages/schedule-skill/apis/getWeekSchedule')
  const res = await getWeekSchedule({ weekStart: '2026-06-08' })
  assert.strictEqual(res.isError, false)
  assert.strictEqual(res.structuredContent.total, 2)
  assert.strictEqual(res.structuredContent.days[0].sessions[0].memberName, '张三')
  assert.match(res.content[0].text, /已找到/)
}

async function testPreviewAndCommitImport() {
  resetStorage()
  const previewImportSchedule = require('../../miniprogram/agent-packages/schedule-skill/apis/previewImportSchedule')
  const commitImportSchedule = require('../../miniprogram/agent-packages/schedule-skill/apis/commitImportSchedule')
  const preview = await previewImportSchedule({
    text: '6.11 10:00 普拉提 周四 王五 A教室\n6.12 15:00 瑜伽 周五 张三',
    clearExisting: false
  })
  assert.strictEqual(preview.isError, false)
  assert.strictEqual(preview.structuredContent.importableCount, 2)
  assert.ok(preview.structuredContent.previewToken)

  const commit = await commitImportSchedule({ previewToken: preview.structuredContent.previewToken })
  assert.strictEqual(commit.isError, false)
  assert.strictEqual(commit.structuredContent.importedCount, 2)
  assert.strictEqual(wx.getStorageSync('pk_sessions').length, 4)

  const secondCommit = await commitImportSchedule({ previewToken: preview.structuredContent.previewToken })
  assert.strictEqual(secondCommit.isError, true)
  assert.match(secondCommit.content[0].text, /已被使用/)
}

async function testUpdateStatus() {
  resetStorage()
  const updateSessionStatus = require('../../miniprogram/agent-packages/schedule-skill/apis/updateSessionStatus')
  const res = await updateSessionStatus({ date: '2026-06-08', startTime: '10:00', status: 'completed' })
  assert.strictEqual(res.isError, false)
  assert.strictEqual(res.structuredContent.updatedSession.status, 'completed')
  assert.strictEqual(wx.getStorageSync('pk_sessions')[0].status, 'completed')

  const ambiguous = await updateSessionStatus({ date: '2026-06-08', status: 'cancelled' })
  assert.strictEqual(ambiguous.isError, false)
  assert.strictEqual(ambiguous.structuredContent.action, 'choose')
  assert.ok(Array.isArray(ambiguous.structuredContent.candidates))
}

async function testWeekStats() {
  resetStorage()
  const getWeekStats = require('../../miniprogram/agent-packages/schedule-skill/apis/getWeekStats')
  const res = await getWeekStats({ weekStart: '2026-06-08' })
  assert.strictEqual(res.isError, false)
  assert.strictEqual(res.structuredContent.summary.total, 2)
  assert.strictEqual(res.structuredContent.summary.completed, 1)
  assert.strictEqual(res.structuredContent.summary.totalMinutes, 120)
}

async function main() {
  await testWeekSchedule()
  await testPreviewAndCommitImport()
  await testUpdateStatus()
  await testWeekStats()
  console.log('agent schedule skill tests passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the failing harness**

Run:

```bash
node tests/agent-schedule-skill/run.js
```

Expected: FAIL with a module-not-found error for `miniprogram/agent-packages/schedule-skill/apis/getWeekSchedule`.

- [ ] **Step 3: Commit the failing test harness**

Run:

```bash
git add tests/agent-schedule-skill/run.js
git commit -m "test: add schedule skill harness"
```

---

## Task 2: Add Self-Contained SKILL Libraries

**Files:**

- Create: `miniprogram/agent-packages/schedule-skill/lib/date.js`
- Create: `miniprogram/agent-packages/schedule-skill/lib/ids.js`
- Create: `miniprogram/agent-packages/schedule-skill/lib/storage.js`
- Create: `miniprogram/agent-packages/schedule-skill/lib/importParser.js`
- Create: `miniprogram/agent-packages/schedule-skill/lib/presenters.js`

- [ ] **Step 1: Implement date helpers**

Create `miniprogram/agent-packages/schedule-skill/lib/date.js`:

```js
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateStr(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
}

function parseDate(dateStr) {
  const parts = String(dateStr || '').split('-').map(Number)
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return new Date()
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

function getWeekRange(dateInput) {
  const d = dateInput ? (typeof dateInput === 'string' ? parseDate(dateInput) : new Date(dateInput)) : new Date()
  const dayOfWeek = d.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  const days = []
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday)
    current.setDate(monday.getDate() + i)
    const date = toDateStr(current)
    days.push({
      date,
      weekday: WEEKDAYS[current.getDay()],
      dayNum: current.getDate()
    })
  }
  return { start: days[0].date, end: days[6].date, days }
}

function getLastWeekRange(dateInput) {
  const d = dateInput ? (typeof dateInput === 'string' ? parseDate(dateInput) : new Date(dateInput)) : new Date()
  d.setDate(d.getDate() - 7)
  return getWeekRange(d)
}

function getWeekday(dateStr) {
  return WEEKDAYS[parseDate(dateStr).getDay()]
}

function formatMonthDay(dateStr) {
  const d = parseDate(dateStr)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日'
}

module.exports = {
  WEEKDAYS,
  toDateStr,
  parseDate,
  addDays,
  getWeekRange,
  getLastWeekRange,
  getWeekday,
  formatMonthDay
}
```

- [ ] **Step 2: Implement ID helpers**

Create `miniprogram/agent-packages/schedule-skill/lib/ids.js`:

```js
function generateId(prefix) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return prefix + timestamp + random
}

function generateMemberId() {
  return generateId('m_')
}

function generateSessionId() {
  return generateId('s_')
}

function generatePreviewToken() {
  return generateId('ai_preview_')
}

module.exports = { generateMemberId, generateSessionId, generatePreviewToken }
```

- [ ] **Step 3: Implement storage helpers**

Create `miniprogram/agent-packages/schedule-skill/lib/storage.js`:

```js
const KEYS = {
  MEMBERS: 'pk_members',
  SESSIONS: 'pk_sessions',
  CONFIG: 'pk_config',
  IMPORT_PREVIEWS: 'pk_ai_import_previews'
}

const defaultConfig = {
  courseTypes: ['瑜伽', '普拉提', '体能训练', '拉伸放松'],
  locations: [],
  focusAreaOptions: ['核心', '髋关节', '肩颈', '下肢', '上肢', '全身', '平衡', '柔韧'],
  defaultDuration: 60,
  workingHours: { start: '08:00', end: '21:00' }
}

function readKey(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    return value || fallback
  } catch (err) {
    return fallback
  }
}

function writeKey(key, value) {
  wx.setStorageSync(key, value)
}

function getMembers() {
  return readKey(KEYS.MEMBERS, [])
}

function getMemberById(id) {
  return getMembers().find(member => member.id === id) || null
}

function getMemberByName(name) {
  if (!name) return null
  return getMembers().find(member => member.name === name) || null
}

function saveMember(member) {
  const members = getMembers()
  const idx = members.findIndex(item => item.id === member.id)
  const next = Object.assign({}, member, { updatedAt: Date.now() })
  if (idx >= 0) members[idx] = next
  else members.push(next)
  writeKey(KEYS.MEMBERS, members)
  return next
}

function getSessions() {
  return readKey(KEYS.SESSIONS, [])
}

function getSessionById(id) {
  return getSessions().find(session => session.id === id) || null
}

function getSessionsByDateRange(start, end) {
  return getSessions()
    .filter(session => session.date >= start && session.date <= end)
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
}

function saveSession(session) {
  const sessions = getSessions()
  const idx = sessions.findIndex(item => item.id === session.id)
  const next = Object.assign({}, session, { updatedAt: Date.now() })
  if (idx >= 0) sessions[idx] = next
  else sessions.push(next)
  writeKey(KEYS.SESSIONS, sessions)
  return next
}

function deleteSessionsByDate(date) {
  writeKey(KEYS.SESSIONS, getSessions().filter(session => session.date !== date))
}

function updateSessionStatus(id, status) {
  const sessions = getSessions()
  const idx = sessions.findIndex(session => session.id === id)
  if (idx < 0) return null
  sessions[idx] = Object.assign({}, sessions[idx], { status, updatedAt: Date.now() })
  writeKey(KEYS.SESSIONS, sessions)
  return sessions[idx]
}

function getConfig() {
  return readKey(KEYS.CONFIG, defaultConfig)
}

function getImportPreviews() {
  return readKey(KEYS.IMPORT_PREVIEWS, [])
}

function saveImportPreview(preview) {
  const previews = getImportPreviews().filter(item => item.token !== preview.token)
  previews.push(preview)
  writeKey(KEYS.IMPORT_PREVIEWS, previews.slice(-20))
  return preview
}

function getImportPreview(token) {
  return getImportPreviews().find(item => item.token === token) || null
}

function markImportPreviewConsumed(token) {
  const previews = getImportPreviews()
  const idx = previews.findIndex(item => item.token === token)
  if (idx < 0) return null
  previews[idx] = Object.assign({}, previews[idx], { consumed: true, consumedAt: Date.now() })
  writeKey(KEYS.IMPORT_PREVIEWS, previews)
  return previews[idx]
}

module.exports = {
  KEYS,
  getMembers,
  getMemberById,
  getMemberByName,
  saveMember,
  getSessions,
  getSessionById,
  getSessionsByDateRange,
  saveSession,
  deleteSessionsByDate,
  updateSessionStatus,
  getConfig,
  saveImportPreview,
  getImportPreview,
  markImportPreviewConsumed
}
```

- [ ] **Step 4: Implement import parser**

Create `miniprogram/agent-packages/schedule-skill/lib/importParser.js`:

```js
const dateUtil = require('./date')
const storage = require('./storage')
const { generateSessionId, generateMemberId } = require('./ids')

const BUILTIN_COURSE_TYPES = ['微私教', '私教', '团课']

function normalizeLine(line) {
  return String(line || '')
    .replace(/[✅✓√☑✔]/g, '')
    .replace(/^[◦●•○▪▸►‣※·\-–—]\s*/g, '')
    .trim()
}

function buildMemberMap(members) {
  const map = {}
  members.forEach(member => { map[member.name] = member })
  return map
}

function parseDateToken(text, currentYear) {
  const match = text.match(/(\d{1,2})[.\/](\d{1,2})/)
  if (!match) return { date: '', text }
  const month = Number(match[1])
  const day = Number(match[2])
  const date = currentYear + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
  return { date, text: text.replace(match[0], ' ') }
}

function parseTimeToken(text) {
  const match = text.match(/(\d{1,2}):(\d{2})/)
  if (!match) return { startTime: '', text }
  const startTime = String(match[1]).padStart(2, '0') + ':' + match[2]
  return { startTime, text: text.replace(match[0], ' ') }
}

function parseLine(line, ctx) {
  let remaining = normalizeLine(line)
  if (!/\d{1,2}[.\/]\d{1,2}/.test(remaining)) return null

  const checked = /[✅✓√☑✔]/.test(line)
  let status = checked ? 'completed' : 'scheduled'

  const dateResult = parseDateToken(remaining, ctx.currentYear)
  const date = dateResult.date
  remaining = dateResult.text

  const timeResult = parseTimeToken(remaining)
  const startTime = timeResult.startTime
  remaining = timeResult.text

  const weekdayMatch = remaining.match(/周[一二三四五六日]/)
  const weekday = weekdayMatch ? weekdayMatch[0] : ''
  if (weekday) remaining = remaining.replace(weekday, ' ')

  let location = ''
  const bracketMatch = remaining.match(/[（(]([^）)]+)[）)]/)
  if (bracketMatch) {
    location = bracketMatch[1]
    remaining = remaining.replace(bracketMatch[0], ' ')
  }

  let courseType = ''
  const allTypes = BUILTIN_COURSE_TYPES.slice()
  ctx.knownCourseTypes.forEach(type => {
    if (!allTypes.includes(type)) allTypes.push(type)
  })
  allTypes.sort((a, b) => b.length - a.length)
  for (const type of allTypes) {
    if (remaining.indexOf(type) !== -1) {
      courseType = type
      remaining = remaining.replace(type, ' ')
      break
    }
  }

  if (!date) return null
  if (!startTime) throw new Error('缺少时间(如 10:30)')
  if (!courseType) courseType = '私教'

  const tokens = remaining.split(/\s+/).filter(Boolean)
  let memberName = ''
  let memberId = ''
  const memberDrafts = []

  tokens.forEach(token => {
    if (ctx.knownLocations.has(token) && !location) {
      location = token
      return
    }
    if (!memberName) {
      memberName = token
      const existing = ctx.memberByName[token]
      if (existing) {
        memberId = existing.id
      } else {
        const draft = {
          id: generateMemberId(),
          name: token,
          phone: '',
          avatar: '',
          notes: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        ctx.memberByName[token] = draft
        memberId = draft.id
        memberDrafts.push(draft)
      }
      return
    }
    if (!location) location = token
  })

  const classMode = courseType === '团课' ? 'group' : 'private'
  const session = {
    id: generateSessionId(),
    date,
    startTime,
    duration: ctx.defaultDuration,
    classMode,
    courseType,
    location,
    memberId,
    memberIds: [],
    status,
    notes: '',
    focusAreas: [],
    photos: [],
    beforePhotos: [],
    afterPhotos: [],
    voiceSegments: [],
    aiDigest: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    _raw: line,
    _memberName: memberName,
    _weekday: weekday
  }

  return { session, memberDrafts }
}

function parseTextToSessions(text) {
  const members = storage.getMembers()
  const config = storage.getConfig()
  const ctx = {
    currentYear: new Date().getFullYear(),
    memberByName: buildMemberMap(members),
    knownCourseTypes: new Set(config.courseTypes || []),
    knownLocations: new Set(config.locations || []),
    defaultDuration: config.defaultDuration || 60
  }
  const lines = String(text || '').split(/[\r\n]+/).map(line => line.trim()).filter(Boolean)
  const sessions = []
  const skipped = []
  const errors = []
  const memberDrafts = []

  lines.forEach((line, index) => {
    try {
      const parsed = parseLine(line, ctx)
      if (!parsed) {
        skipped.push({ line: index + 1, text: line })
        return
      }
      sessions.push(Object.assign(parsed.session, { _lineNum: index + 1 }))
      parsed.memberDrafts.forEach(member => memberDrafts.push(member))
    } catch (err) {
      errors.push({ line: index + 1, text: line, message: err.message })
    }
  })

  return { sessions, skipped, errors, memberDrafts }
}

module.exports = { parseTextToSessions }
```

- [ ] **Step 5: Implement presenters**

Create `miniprogram/agent-packages/schedule-skill/lib/presenters.js`:

```js
const dateUtil = require('./date')

const STATUS_LABELS = {
  scheduled: '已约',
  completed: '已上',
  cancelled: '取消',
  noshow: '爽约'
}

function text(text) {
  return [{ type: 'text', text }]
}

function makeMemberMap(members) {
  const map = {}
  members.forEach(member => { map[member.id] = member })
  return map
}

function getSessionMemberName(session, memberMap) {
  if (session.memberId && memberMap[session.memberId]) return memberMap[session.memberId].name
  if (session.classMode === 'group') return ((session.memberIds || []).length || '') + '人团课'
  return '未选会员'
}

function shapeSession(session, memberMap) {
  return {
    id: session.id,
    date: session.date,
    dateLabel: dateUtil.formatMonthDay(session.date) + ' ' + dateUtil.getWeekday(session.date),
    startTime: session.startTime,
    duration: session.duration || 60,
    classMode: session.classMode || 'private',
    courseType: session.courseType || '课程',
    location: session.location || '',
    memberId: session.memberId || '',
    memberName: getSessionMemberName(session, memberMap),
    status: session.status || 'scheduled',
    statusLabel: STATUS_LABELS[session.status] || '已约'
  }
}

function groupWeekSessions(week, sessions, members) {
  const memberMap = makeMemberMap(members)
  const byDate = {}
  week.days.forEach(day => { byDate[day.date] = [] })
  sessions.forEach(session => {
    if (!byDate[session.date]) byDate[session.date] = []
    byDate[session.date].push(shapeSession(session, memberMap))
  })
  return week.days.map(day => ({
    date: day.date,
    weekday: day.weekday,
    dayNum: day.dayNum,
    count: byDate[day.date].length,
    sessions: byDate[day.date].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }))
}

function summarizeStats(sessions, lastWeekSessions) {
  const summary = {
    total: sessions.length,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    noshow: 0,
    privateCnt: 0,
    groupCnt: 0,
    totalMinutes: 0,
    lastWeekTotal: lastWeekSessions.length,
    diff: sessions.length - lastWeekSessions.length
  }
  const memberIds = {}
  const courseTypeCounts = {}
  sessions.forEach(session => {
    const status = session.status || 'scheduled'
    if (summary[status] !== undefined) summary[status] += 1
    if (session.classMode === 'group') summary.groupCnt += 1
    else summary.privateCnt += 1
    summary.totalMinutes += session.duration || 60
    if (session.memberId) memberIds[session.memberId] = true
    ;(session.memberIds || []).forEach(id => { memberIds[id] = true })
    if (session.courseType) courseTypeCounts[session.courseType] = (courseTypeCounts[session.courseType] || 0) + 1
  })
  summary.activeMemberCount = Object.keys(memberIds).length
  summary.totalHoursText = formatMinutes(summary.totalMinutes)
  const courseTypes = Object.keys(courseTypeCounts)
    .sort((a, b) => courseTypeCounts[b] - courseTypeCounts[a])
    .map(name => ({ name, count: courseTypeCounts[name] }))
  return { summary, courseTypes }
}

function formatMinutes(minutes) {
  if (minutes < 60) return minutes + '分钟'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? h + '小时' + m + '分' : h + '小时'
}

function cleanSessionForStorage(session) {
  const transientKeys = ['_raw', '_lineNum', '_memberName', '_weekday', 'checked', 'displayText']
  const next = {}
  Object.keys(session).forEach(key => {
    if (!transientKeys.includes(key)) next[key] = session[key]
  })
  return next
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

module.exports = {
  STATUS_LABELS,
  text,
  makeMemberMap,
  shapeSession,
  groupWeekSessions,
  summarizeStats,
  formatMinutes,
  cleanSessionForStorage,
  statusLabel
}
```

- [ ] **Step 6: Run the harness**

Run:

```bash
node tests/agent-schedule-skill/run.js
```

Expected: still FAIL with a module-not-found error for `apis/getWeekSchedule`, because helpers exist but APIs do not.

- [ ] **Step 7: Commit helper libraries**

Run:

```bash
git add miniprogram/agent-packages/schedule-skill/lib
git commit -m "feat: add schedule skill helper libraries"
```

---

## Task 3: Implement Schedule Query and Stats APIs

**Files:**

- Create: `miniprogram/agent-packages/schedule-skill/apis/getWeekSchedule.js`
- Create: `miniprogram/agent-packages/schedule-skill/apis/getWeekStats.js`

- [ ] **Step 1: Implement `getWeekSchedule`**

Create `miniprogram/agent-packages/schedule-skill/apis/getWeekSchedule.js`:

```js
const storage = require('../lib/storage')
const dateUtil = require('../lib/date')
const presenters = require('../lib/presenters')

async function getWeekSchedule(args = {}) {
  const baseDate = args.date || args.weekStart || dateUtil.toDateStr(new Date())
  const week = dateUtil.getWeekRange(baseDate)
  const rangeStart = args.date || week.start
  const rangeEnd = args.date || week.end
  const sessions = storage.getSessionsByDateRange(rangeStart, rangeEnd)
  const members = storage.getMembers()
  const days = presenters.groupWeekSessions(week, sessions, members)
  const filteredDays = args.date ? days.filter(day => day.date === args.date) : days
  const rangeLabel = dateUtil.formatMonthDay(week.start) + ' - ' + dateUtil.formatMonthDay(week.end)
  const total = filteredDays.reduce((sum, day) => sum + day.count, 0)

  const contentText = total === 0
    ? '未找到' + rangeLabel + '的课程。请展示空课表卡片，并提示用户可以继续批量录入课表。'
    : '已找到' + rangeLabel + '的 ' + total + ' 节课程。请展示周课表卡片，并用一句话概括本周安排。'

  return {
    isError: false,
    content: presenters.text(contentText),
    structuredContent: {
      weekStart: week.start,
      weekEnd: week.end,
      rangeLabel,
      total,
      days: filteredDays
    }
  }
}

module.exports = getWeekSchedule
```

- [ ] **Step 2: Implement `getWeekStats`**

Create `miniprogram/agent-packages/schedule-skill/apis/getWeekStats.js`:

```js
const storage = require('../lib/storage')
const dateUtil = require('../lib/date')
const presenters = require('../lib/presenters')

async function getWeekStats(args = {}) {
  const baseDate = args.weekStart || dateUtil.toDateStr(new Date())
  const week = dateUtil.getWeekRange(baseDate)
  const lastWeek = dateUtil.getLastWeekRange(baseDate)
  const sessions = storage.getSessionsByDateRange(week.start, week.end)
  const lastWeekSessions = storage.getSessionsByDateRange(lastWeek.start, lastWeek.end)
  const stats = presenters.summarizeStats(sessions, lastWeekSessions)
  const rangeLabel = dateUtil.formatMonthDay(week.start) + ' - ' + dateUtil.formatMonthDay(week.end)
  const summary = stats.summary
  const diffText = summary.diff > 0 ? '+' + summary.diff : String(summary.diff)

  return {
    isError: false,
    content: presenters.text('已统计' + rangeLabel + '的课程数据：共 ' + summary.total + ' 节，已上 ' + summary.completed + ' 节，教学时长 ' + summary.totalHoursText + '。请展示本周统计卡片。'),
    structuredContent: {
      weekStart: week.start,
      weekEnd: week.end,
      rangeLabel,
      summary: Object.assign({}, summary, { diffText }),
      courseTypes: stats.courseTypes
    }
  }
}

module.exports = getWeekStats
```

- [ ] **Step 3: Run the harness**

Run:

```bash
node tests/agent-schedule-skill/run.js
```

Expected: FAIL when importing `previewImportSchedule`, because query and stats APIs now exist but import APIs do not.

- [ ] **Step 4: Commit query and stats APIs**

Run:

```bash
git add miniprogram/agent-packages/schedule-skill/apis/getWeekSchedule.js miniprogram/agent-packages/schedule-skill/apis/getWeekStats.js
git commit -m "feat: add schedule query and stats apis"
```

---

## Task 4: Implement Bulk Import APIs

**Files:**

- Create: `miniprogram/agent-packages/schedule-skill/apis/previewImportSchedule.js`
- Create: `miniprogram/agent-packages/schedule-skill/apis/commitImportSchedule.js`

- [ ] **Step 1: Implement `previewImportSchedule`**

Create `miniprogram/agent-packages/schedule-skill/apis/previewImportSchedule.js`:

```js
const parser = require('../lib/importParser')
const storage = require('../lib/storage')
const presenters = require('../lib/presenters')
const { generatePreviewToken } = require('../lib/ids')

async function previewImportSchedule(args = {}) {
  const text = String(args.text || '').trim()
  if (!text) {
    return {
      isError: true,
      content: presenters.text('没有收到课表文本。请让用户粘贴课表，每行一节课，例如：6.11 10:00 普拉提 张三 A教室。')
    }
  }

  const parsed = parser.parseTextToSessions(text)
  if (parsed.sessions.length === 0) {
    const firstError = parsed.errors[0]
    const reason = firstError ? firstError.message : '未识别到包含日期的课程行'
    return {
      isError: true,
      content: presenters.text('课表解析失败：' + reason + '。请让用户按“6.11 10:00 普拉提 张三 A教室”的格式重新发送。'),
      structuredContent: {
        importableCount: 0,
        skipped: parsed.skipped,
        errors: parsed.errors
      }
    }
  }

  const token = generatePreviewToken()
  const preview = {
    token,
    createdAt: Date.now(),
    consumed: false,
    clearExisting: !!args.clearExisting,
    sessions: parsed.sessions,
    memberDrafts: parsed.memberDrafts
  }
  storage.saveImportPreview(preview)

  return {
    isError: false,
    content: presenters.text('已解析出 ' + parsed.sessions.length + ' 节课程，其中跳过 ' + parsed.skipped.length + ' 行、错误 ' + parsed.errors.length + ' 行。请展示导入预览卡片，等待用户确认后再写入。'),
    structuredContent: {
      previewToken: token,
      importableCount: parsed.sessions.length,
      skippedCount: parsed.skipped.length,
      errorCount: parsed.errors.length,
      clearExisting: !!args.clearExisting,
      sessions: parsed.sessions.map(item => ({
        id: item.id,
        date: item.date,
        startTime: item.startTime,
        courseType: item.courseType,
        memberName: item._memberName,
        location: item.location,
        status: item.status
      })),
      skipped: parsed.skipped,
      errors: parsed.errors,
      memberDrafts: parsed.memberDrafts.map(member => ({ id: member.id, name: member.name }))
    }
  }
}

module.exports = previewImportSchedule
```

- [ ] **Step 2: Implement `commitImportSchedule`**

Create `miniprogram/agent-packages/schedule-skill/apis/commitImportSchedule.js`:

```js
const storage = require('../lib/storage')
const presenters = require('../lib/presenters')

const PREVIEW_TTL_MS = 30 * 60 * 1000

async function commitImportSchedule(args = {}) {
  const token = args.previewToken
  const preview = storage.getImportPreview(token)
  if (!preview) {
    return {
      isError: true,
      content: presenters.text('未找到这次导入预览，无法写入。请让用户重新发送课表文本生成新的预览。')
    }
  }
  if (preview.consumed) {
    return {
      isError: true,
      content: presenters.text('这次导入预览已被使用，不能重复导入。请告诉用户课程没有重复写入。')
    }
  }
  if (Date.now() - preview.createdAt > PREVIEW_TTL_MS) {
    return {
      isError: true,
      content: presenters.text('这次导入预览已过期，不能写入。请让用户重新发送课表文本生成新的预览。')
    }
  }

  const affectedDates = {}
  preview.sessions.forEach(session => { affectedDates[session.date] = true })
  if (preview.clearExisting) {
    Object.keys(affectedDates).forEach(date => storage.deleteSessionsByDate(date))
  }

  preview.memberDrafts.forEach(member => {
    if (!storage.getMemberByName(member.name)) storage.saveMember(member)
  })

  const savedSessions = preview.sessions.map(session => {
    return storage.saveSession(presenters.cleanSessionForStorage(session))
  })
  storage.markImportPreviewConsumed(token)

  return {
    isError: false,
    content: presenters.text('已成功导入 ' + savedSessions.length + ' 节课程。请告知用户导入完成，并建议查看本周课表核对。'),
    structuredContent: {
      importedCount: savedSessions.length,
      affectedDates: Object.keys(affectedDates).sort(),
      sessions: savedSessions.map(session => ({
        id: session.id,
        date: session.date,
        startTime: session.startTime,
        courseType: session.courseType,
        status: session.status
      }))
    }
  }
}

module.exports = commitImportSchedule
```

- [ ] **Step 3: Run the harness**

Run:

```bash
node tests/agent-schedule-skill/run.js
```

Expected: FAIL in `testUpdateStatus` with a module-not-found error for `updateSessionStatus`.

- [ ] **Step 4: Commit import APIs**

Run:

```bash
git add miniprogram/agent-packages/schedule-skill/apis/previewImportSchedule.js miniprogram/agent-packages/schedule-skill/apis/commitImportSchedule.js
git commit -m "feat: add schedule import apis"
```

---

## Task 5: Implement Status Update API

**Files:**

- Create: `miniprogram/agent-packages/schedule-skill/apis/updateSessionStatus.js`

- [ ] **Step 1: Implement `updateSessionStatus`**

Create `miniprogram/agent-packages/schedule-skill/apis/updateSessionStatus.js`:

```js
const storage = require('../lib/storage')
const dateUtil = require('../lib/date')
const presenters = require('../lib/presenters')

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'noshow']

function sameMember(session, memberName, memberMap) {
  if (!memberName) return true
  if (session.memberId && memberMap[session.memberId] && memberMap[session.memberId].name === memberName) return true
  return false
}

function findCandidates(args) {
  const members = storage.getMembers()
  const memberMap = presenters.makeMemberMap(members)
  const sessions = storage.getSessions()
  let candidates = sessions
  if (args.sessionId) candidates = candidates.filter(session => session.id === args.sessionId)
  if (args.date) candidates = candidates.filter(session => session.date === args.date)
  if (args.startTime) candidates = candidates.filter(session => session.startTime === args.startTime)
  if (args.memberName) candidates = candidates.filter(session => sameMember(session, args.memberName, memberMap))
  return candidates
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
    .map(session => presenters.shapeSession(session, memberMap))
}

async function updateSessionStatus(args = {}) {
  const status = args.status
  if (!VALID_STATUSES.includes(status)) {
    return {
      isError: true,
      content: presenters.text('状态值无效。只允许 scheduled、completed、cancelled、noshow。请让用户明确要标记为已约、已上、取消或爽约。')
    }
  }

  const candidates = findCandidates(args)
  if (candidates.length === 0) {
    return {
      isError: false,
      content: presenters.text('没有找到匹配的课程。请让用户补充日期、时间或会员姓名。'),
      structuredContent: {
        action: 'missing',
        targetStatus: status,
        targetStatusLabel: presenters.statusLabel(status),
        candidates: []
      }
    }
  }

  if (candidates.length > 1) {
    return {
      isError: false,
      content: presenters.text('未能唯一确定课程，已返回 ' + candidates.length + ' 个候选。请展示候选卡片，让用户选择要修改的课程。'),
      structuredContent: {
        action: 'choose',
        targetStatus: status,
        targetStatusLabel: presenters.statusLabel(status),
        candidates: candidates.slice(0, 5)
      }
    }
  }

  const target = candidates[0]
  const updated = storage.updateSessionStatus(target.id, status)
  if (!updated) {
    return {
      isError: true,
      content: presenters.text('课程匹配成功但写入失败。请让用户稍后重试，或回到小程序课程页手动修改。')
    }
  }

  const shaped = presenters.shapeSession(updated, presenters.makeMemberMap(storage.getMembers()))
  const label = shaped.dateLabel + ' ' + shaped.startTime + ' ' + shaped.memberName
  return {
    isError: false,
    content: presenters.text('已把 ' + label + ' 标记为' + presenters.statusLabel(status) + '。请展示状态修改结果卡片。'),
    structuredContent: {
      action: 'updated',
      updatedSession: shaped,
      targetStatus: status,
      targetStatusLabel: presenters.statusLabel(status)
    }
  }
}

module.exports = updateSessionStatus
```

- [ ] **Step 2: Run the harness**

Run:

```bash
node tests/agent-schedule-skill/run.js
```

Expected: PASS and output:

```text
agent schedule skill tests passed
```

- [ ] **Step 3: Commit status API**

Run:

```bash
git add miniprogram/agent-packages/schedule-skill/apis/updateSessionStatus.js
git commit -m "feat: add schedule status update api"
```

---

## Task 6: Add SKILL Registration and MCP Declarations

**Files:**

- Create: `miniprogram/agent-packages/schedule-skill/index.js`
- Create: `miniprogram/agent-packages/schedule-skill/mcp.json`
- Create: `miniprogram/agent-packages/schedule-skill/SKILL.md`

- [ ] **Step 1: Add API registration**

Create `miniprogram/agent-packages/schedule-skill/index.js`:

```js
const getWeekSchedule = require('./apis/getWeekSchedule')
const previewImportSchedule = require('./apis/previewImportSchedule')
const commitImportSchedule = require('./apis/commitImportSchedule')
const updateSessionStatus = require('./apis/updateSessionStatus')
const getWeekStats = require('./apis/getWeekStats')

const skill = wx.modelContext.createSkill('agent-packages/schedule-skill')

skill.use(async (ctx, next) => {
  const start = Date.now()
  try {
    await next()
  } catch (err) {
    console.error('[schedule-skill]', ctx.name, err, Date.now() - start)
    throw err
  }
})

skill.registerAPI('getWeekSchedule', getWeekSchedule)
skill.registerAPI('previewImportSchedule', previewImportSchedule)
skill.registerAPI('commitImportSchedule', commitImportSchedule)
skill.registerAPI('updateSessionStatus', updateSessionStatus)
skill.registerAPI('getWeekStats', getWeekStats)
```

- [ ] **Step 2: Add `mcp.json`**

Create `miniprogram/agent-packages/schedule-skill/mcp.json` with the five API declarations and four component declarations. Keep field descriptions concise and explicit:

```json
{
  "apis": [
    {
      "name": "getWeekSchedule",
      "description": "查询排课助手中的周课表或某一天课表。适用于用户想查看本周、下周、某周或某天课程安排。不用于写入或修改课程。",
      "_meta": { "ui": { "componentPath": "components/week-schedule-card/index" } },
      "inputSchema": {
        "type": "object",
        "properties": {
          "weekStart": {
            "type": "string",
            "description": "周起始日期，格式 YYYY-MM-DD。用户未指定日期时不要填写，本接口会默认当前周。"
          },
          "date": {
            "type": "string",
            "description": "指定查询某一天，格式 YYYY-MM-DD。仅当用户明确问某一天课程时填写。"
          }
        }
      },
      "outputSchema": { "type": "object" }
    },
    {
      "name": "previewImportSchedule",
      "description": "把用户粘贴的多行课表文本解析成待导入课程预览。只生成预览，不写入课程。用户明确确认预览后才能调用 commitImportSchedule。",
      "_meta": { "ui": { "componentPath": "components/import-preview-card/index" } },
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "用户提供的课表文本，通常每行一节课，例如 6.11 10:00 普拉提 张三 A教室。禁止自行编造课表文本。"
          },
          "clearExisting": {
            "type": "boolean",
            "description": "是否在正式导入时清理受影响日期的已有课程。用户没有明确要求覆盖、替换或清空时填写 false。"
          }
        },
        "required": ["text"]
      },
      "outputSchema": { "type": "object" }
    },
    {
      "name": "commitImportSchedule",
      "description": "确认写入上一轮 previewImportSchedule 生成的课表预览。只有用户确认导入时调用。不要凭空生成 previewToken。",
      "inputSchema": {
        "type": "object",
        "properties": {
          "previewToken": {
            "type": "string",
            "description": "来自 previewImportSchedule 返回的 previewToken 原值。上下文没有真实 token 时，应先调用 previewImportSchedule。"
          }
        },
        "required": ["previewToken"]
      },
      "outputSchema": { "type": "object" }
    },
    {
      "name": "updateSessionStatus",
      "description": "修改一节课程的状态。适用于用户要求标记已上、取消、爽约或恢复待上。信息不足或匹配多节课时，本接口返回候选而不写入。",
      "_meta": { "ui": { "componentPath": "components/status-result-card/index" } },
      "inputSchema": {
        "type": "object",
        "properties": {
          "sessionId": {
            "type": "string",
            "description": "课程唯一 id，优先取自 getWeekSchedule 或候选卡片返回的真实 id。不要从自然语言推断或编造。"
          },
          "date": {
            "type": "string",
            "description": "课程日期，格式 YYYY-MM-DD。用户只说今天、明天、周几时，按当前日期推算后填写。"
          },
          "startTime": {
            "type": "string",
            "description": "课程开始时间，格式 HH:mm。用户明确说了时间时填写。"
          },
          "memberName": {
            "type": "string",
            "description": "会员姓名，取自用户原话或上游接口返回的会员名。"
          },
          "status": {
            "type": "string",
            "enum": ["scheduled", "completed", "cancelled", "noshow"],
            "description": "目标状态。已上、完成、上完用 completed；取消、请假用 cancelled；爽约、没来用 noshow；恢复、待上、已约用 scheduled。"
          }
        },
        "required": ["status"]
      },
      "outputSchema": { "type": "object" }
    },
    {
      "name": "getWeekStats",
      "description": "查询排课助手中的本周或指定周课程统计。适用于用户询问本周课数、完成数、教学时长、私教团课分布和活跃会员。",
      "_meta": { "ui": { "componentPath": "components/week-stats-card/index" } },
      "inputSchema": {
        "type": "object",
        "properties": {
          "weekStart": {
            "type": "string",
            "description": "周起始日期，格式 YYYY-MM-DD。用户未指定日期时不要填写，本接口会默认当前周。"
          }
        }
      },
      "outputSchema": { "type": "object" }
    }
  ],
  "components": [
    {
      "path": "components/week-schedule-card/index",
      "relatedPage": "/pages/week/week"
    },
    {
      "path": "components/import-preview-card/index",
      "relatedPage": "/pages/week/week",
      "expirable": true,
      "expiredText": "这次导入预览已过期"
    },
    {
      "path": "components/status-result-card/index",
      "relatedPage": "/pages/week/week"
    },
    {
      "path": "components/week-stats-card/index",
      "relatedPage": "/pages/stats/stats"
    }
  ]
}
```

- [ ] **Step 3: Add `SKILL.md`**

Create `miniprogram/agent-packages/schedule-skill/SKILL.md`:

```md
# 排课助手课表 SKILL

你是排课助手的课表执行助理。用户是兼职私人教练或小型瑜伽/普拉提工作室经营者。你的任务只有四类：查看课表、批量录入课表、修改课程状态、查看课程统计。

## 最高优先级规则

1. 课程、会员、统计、课程 id、previewToken 只能来自原子接口返回或用户明确输入。不要编造。
2. 写入动作必须以写入接口返回为准。没有成功调用 `commitImportSchedule` 或 `updateSessionStatus` 前，不要说“已导入”“已修改”“已完成”。
3. 批量录入必须两步走：先 `previewImportSchedule`，用户确认后才 `commitImportSchedule`。
4. 修改状态没有唯一命中时，不要替用户选择课程；展示候选或追问日期、时间、会员。
5. 如果接口返回的 `content` 与本文件描述不一致，以接口返回的 `content` 为当前事实和下一步动作。

## 意图路由

| 用户意图 | 必须调用 | 禁止动作 |
| --- | --- | --- |
| 看本周、下周、某周或某天课表 | `getWeekSchedule` | 不要直接根据聊天上下文回答课表 |
| 看本周统计、上课数量、教学时长、完成率 | `getWeekStats` | 不要自行计算或估计 |
| 粘贴多行课表、批量录入、导入课表 | `previewImportSchedule` | 不要直接写入，不要说已导入 |
| 用户确认导入上一张预览卡 | `commitImportSchedule` | 没有真实 `previewToken` 时不要调用 |
| 标记已上、取消、爽约、恢复待上 | `updateSessionStatus` | 不要使用 status 之外的状态值 |

## 写入流程

### 批量录入

1. 用户给课表文本时，调用 `previewImportSchedule`。
2. 预览返回后，只能说“已解析出待导入课程，请核对并确认”。
3. 用户明确确认导入，且上下文有真实 `previewToken`，调用 `commitImportSchedule`。
4. `commitImportSchedule` 成功后，才能告诉用户导入完成。
5. token 缺失、过期、已使用时，让用户重新发送课表生成新预览。

### 修改状态

1. 优先使用上游返回的真实 `sessionId`。
2. 没有 `sessionId` 时，尽量从用户话里提取 `date`、`startTime`、`memberName`。
3. `status` 只能是：
   - 已约、待上、恢复：`scheduled`
   - 已上、完成、上完：`completed`
   - 取消、请假：`cancelled`
   - 爽约、没来、未到：`noshow`
4. `updateSessionStatus` 返回候选时，展示候选并让用户选择，不要继续猜。

## 不确定时的出口

- 不知道是哪一节课：问“你要改哪天、几点、哪位会员的课？”
- 不知道目标状态：问“要标记为已上、取消、爽约，还是恢复待上？”
- 找不到课程：让用户补充日期、时间或会员，或先查看本周课表。
- 用户要求能力范围外的事情：简短说明当前只能处理课表查询、批量录入、状态修改和统计。

## 回复规范

- 简洁、明确，像一个可靠的排课助理。
- 查询结果：先说接口返回的事实，再提示可继续做什么。
- 预览结果：强调“待确认”，不要使用“已导入”。
- 写入结果：只有接口成功后才说完成。
- 失败结果：说明具体原因，并给出一个下一步动作。
```

- [ ] **Step 4: Validate JSON and run tests**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('miniprogram/agent-packages/schedule-skill/mcp.json','utf8')); console.log('mcp json ok')"
node tests/agent-schedule-skill/run.js
```

Expected:

```text
mcp json ok
agent schedule skill tests passed
```

- [ ] **Step 5: Commit SKILL declarations**

Run:

```bash
git add miniprogram/agent-packages/schedule-skill/index.js miniprogram/agent-packages/schedule-skill/mcp.json miniprogram/agent-packages/schedule-skill/SKILL.md
git commit -m "feat: declare schedule ai skill"
```

---

## Task 7: Add Atomic Components

**Files:**

- Create: `miniprogram/agent-packages/schedule-skill/components/week-schedule-card/index.{js,json,wxml,wxss}`
- Create: `miniprogram/agent-packages/schedule-skill/components/import-preview-card/index.{js,json,wxml,wxss}`
- Create: `miniprogram/agent-packages/schedule-skill/components/status-result-card/index.{js,json,wxml,wxss}`
- Create: `miniprogram/agent-packages/schedule-skill/components/week-stats-card/index.{js,json,wxml,wxss}`

- [ ] **Step 1: Add component JSON files**

Each component `index.json` should contain:

```json
{
  "component": true
}
```

- [ ] **Step 2: Add `week-schedule-card`**

Create `index.js`:

```js
Component({
  data: {
    rangeLabel: '',
    total: 0,
    days: []
  },
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      const NotificationType = wx.modelContext.NotificationType
      modelCtx.on(NotificationType.Result, data => {
        const result = data.result || data
        const content = result.structuredContent || {}
        this.setData({
          rangeLabel: content.rangeLabel || '',
          total: content.total || 0,
          days: (content.days || []).filter(day => day.count > 0).slice(0, 7)
        })
        this._viewCtx.setRelatedPage({ query: '' })
      })
    }
  }
})
```

Create `index.wxml`:

```xml
<view class="card">
  <view class="head">
    <text class="title">课表</text>
    <text class="range">{{rangeLabel}}</text>
  </view>
  <view class="metric">
    <text class="metric-num">{{total}}</text>
    <text class="metric-label">节课</text>
  </view>
  <view wx:if="{{days.length === 0}}" class="empty">这一周还没有课程</view>
  <view wx:for="{{days}}" wx:key="date" class="day">
    <view class="day-head">
      <text>{{item.weekday}}</text>
      <text>{{item.count}}节</text>
    </view>
    <view wx:for="{{item.sessions}}" wx:for-item="session" wx:key="id" class="session">
      <text>{{session.startTime}}</text>
      <text>{{session.memberName}}</text>
      <text>{{session.courseType}}</text>
    </view>
  </view>
</view>
```

Create `index.wxss`:

```css
.card { padding: 18rpx; background: #ffffff; border-radius: 16rpx; color: #1f1d1a; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 30rpx; font-weight: 700; }
.range { font-size: 22rpx; color: #7a746d; }
.metric { display: flex; align-items: baseline; margin-top: 12rpx; }
.metric-num { font-size: 48rpx; font-weight: 700; }
.metric-label { margin-left: 8rpx; font-size: 22rpx; color: #7a746d; }
.empty { margin-top: 18rpx; font-size: 24rpx; color: #7a746d; }
.day { margin-top: 14rpx; padding-top: 12rpx; border-top: 1px solid #eee9e2; }
.day-head { display: flex; justify-content: space-between; font-size: 24rpx; font-weight: 700; }
.session { display: flex; gap: 12rpx; margin-top: 8rpx; font-size: 22rpx; color: #3b352f; }
```

- [ ] **Step 3: Add `import-preview-card`**

Create `index.js`:

```js
Component({
  data: {
    previewToken: '',
    importableCount: 0,
    skippedCount: 0,
    errorCount: 0,
    sessions: []
  },
  lifetimes: {
    created() {
      this._modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      const NotificationType = wx.modelContext.NotificationType
      this._modelCtx.on(NotificationType.Result, data => {
        const result = data.result || data
        const content = result.structuredContent || {}
        this.setData({
          previewToken: content.previewToken || '',
          importableCount: content.importableCount || 0,
          skippedCount: content.skippedCount || 0,
          errorCount: content.errorCount || 0,
          sessions: (content.sessions || []).slice(0, 6)
        })
        this._viewCtx.setRelatedPage({ query: '' })
      })
    }
  },
  methods: {
    onConfirm() {
      if (!this.data.previewToken) return
      this._modelCtx.sendFollowUpMessage({
        content: [
          { type: 'text', text: '我确认导入这批课表' },
          {
            type: 'api/call',
            data: {
              name: 'commitImportSchedule',
              arguments: { previewToken: this.data.previewToken }
            }
          }
        ]
      })
    },
    onCancel() {
      this._modelCtx.sendFollowUpMessage({
        content: [{ type: 'text', text: '取消导入这批课表' }]
      })
    }
  }
})
```

Create `index.wxml`:

```xml
<view class="card">
  <view class="title">导入预览</view>
  <view class="summary">识别到 {{importableCount}} 节，跳过 {{skippedCount}} 行，错误 {{errorCount}} 行</view>
  <view wx:for="{{sessions}}" wx:key="id" class="session">
    <text>{{item.date}}</text>
    <text>{{item.startTime}}</text>
    <text>{{item.memberName}}</text>
    <text>{{item.courseType}}</text>
  </view>
  <view class="actions">
    <button class="btn btn-primary" bindtap="onConfirm">确认导入</button>
    <button class="btn" bindtap="onCancel">取消</button>
  </view>
</view>
```

Create `index.wxss`:

```css
.card { padding: 18rpx; background: #ffffff; border-radius: 16rpx; color: #1f1d1a; }
.title { font-size: 30rpx; font-weight: 700; }
.summary { margin-top: 8rpx; font-size: 24rpx; color: #7a746d; }
.session { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 10rpx; font-size: 22rpx; }
.actions { display: flex; gap: 12rpx; margin-top: 18rpx; }
.btn { flex: 1; height: 64rpx; line-height: 64rpx; font-size: 24rpx; border-radius: 12rpx; background: #f4f0ea; color: #1f1d1a; }
.btn-primary { background: #1f1d1a; color: #ffffff; }
```

- [ ] **Step 4: Add `status-result-card`**

Create `index.js`:

```js
Component({
  data: {
    action: '',
    targetStatus: '',
    targetStatusLabel: '',
    updatedSession: null,
    candidates: []
  },
  lifetimes: {
    created() {
      this._modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      const NotificationType = wx.modelContext.NotificationType
      this._modelCtx.on(NotificationType.Result, data => {
        const result = data.result || data
        const content = result.structuredContent || {}
        this.setData({
          action: content.action || '',
          targetStatus: content.targetStatus || '',
          targetStatusLabel: content.targetStatusLabel || '',
          updatedSession: content.updatedSession || null,
          candidates: content.candidates || []
        })
        this._viewCtx.setRelatedPage({ query: '' })
      })
    }
  },
  methods: {
    onCandidateTap(e) {
      const id = e.currentTarget.dataset.id
      if (!id || !this.data.targetStatus) return
      this._modelCtx.sendFollowUpMessage({
        content: [
          { type: 'text', text: '修改这节课状态' },
          {
            type: 'api/call',
            data: {
              name: 'updateSessionStatus',
              arguments: { sessionId: id, status: this.data.targetStatus }
            }
          }
        ]
      })
    }
  }
})
```

Create `index.wxml`:

```xml
<view class="card">
  <view class="title">状态修改</view>

  <view wx:if="{{action === 'updated' && updatedSession}}" class="result">
    <text class="result-main">已标记为 {{targetStatusLabel}}</text>
    <text class="result-sub">{{updatedSession.dateLabel}} {{updatedSession.startTime}} {{updatedSession.memberName}}</text>
  </view>

  <view wx:elif="{{action === 'choose'}}" class="result">
    <text class="result-main">请选择要修改的课程</text>
    <text class="result-sub">目标状态：{{targetStatusLabel}}</text>
    <button
      wx:for="{{candidates}}"
      wx:key="id"
      class="candidate"
      data-id="{{item.id}}"
      bindtap="onCandidateTap"
    >
      {{item.dateLabel}} {{item.startTime}} {{item.memberName}} · {{item.courseType}}
    </button>
  </view>

  <view wx:else class="result">
    <text class="result-main">没有找到匹配课程</text>
    <text class="result-sub">请补充日期、时间或会员姓名</text>
  </view>
</view>
```

Create `index.wxss`:

```css
.card { padding: 18rpx; background: #ffffff; border-radius: 16rpx; color: #1f1d1a; }
.title { font-size: 30rpx; font-weight: 700; }
.result { margin-top: 14rpx; display: flex; flex-direction: column; gap: 10rpx; }
.result-main { font-size: 26rpx; font-weight: 700; }
.result-sub { font-size: 22rpx; color: #7a746d; }
.candidate { margin-top: 10rpx; min-height: 60rpx; line-height: 36rpx; padding: 12rpx; text-align: left; font-size: 22rpx; border-radius: 12rpx; background: #f4f0ea; color: #1f1d1a; }
```

- [ ] **Step 5: Add `week-stats-card`**

Create `index.js`:

```js
Component({
  data: {
    rangeLabel: '',
    summary: {
      total: 0,
      completed: 0,
      cancelled: 0,
      noshow: 0,
      totalHoursText: '0分钟',
      privateCnt: 0,
      groupCnt: 0,
      activeMemberCount: 0,
      diffText: '0'
    },
    courseTypes: []
  },
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      this._viewCtx = wx.modelContext.getViewContext(this)
      const NotificationType = wx.modelContext.NotificationType
      modelCtx.on(NotificationType.Result, data => {
        const result = data.result || data
        const content = result.structuredContent || {}
        this.setData({
          rangeLabel: content.rangeLabel || '',
          summary: content.summary || this.data.summary,
          courseTypes: (content.courseTypes || []).slice(0, 4)
        })
        this._viewCtx.setRelatedPage({ query: '' })
      })
    }
  }
})
```

Create `index.wxml`:

```xml
<view class="card">
  <view class="head">
    <text class="title">本周统计</text>
    <text class="range">{{rangeLabel}}</text>
  </view>
  <view class="grid">
    <view class="metric">
      <text class="num">{{summary.total}}</text>
      <text class="label">总课数</text>
    </view>
    <view class="metric">
      <text class="num">{{summary.completed}}</text>
      <text class="label">已上</text>
    </view>
    <view class="metric">
      <text class="num">{{summary.cancelled}}</text>
      <text class="label">取消</text>
    </view>
    <view class="metric">
      <text class="num">{{summary.noshow}}</text>
      <text class="label">爽约</text>
    </view>
  </view>
  <view class="detail">
    <text>教学时长 {{summary.totalHoursText}}</text>
    <text>私教 {{summary.privateCnt}} · 团课 {{summary.groupCnt}}</text>
    <text>活跃会员 {{summary.activeMemberCount}} 人 · 较上周 {{summary.diffText}}</text>
  </view>
  <view wx:if="{{courseTypes.length}}" class="types">
    <text wx:for="{{courseTypes}}" wx:key="name" class="type">{{item.name}} {{item.count}}</text>
  </view>
</view>
```

Create `index.wxss`:

```css
.card { padding: 18rpx; background: #ffffff; border-radius: 16rpx; color: #1f1d1a; }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 30rpx; font-weight: 700; }
.range { font-size: 22rpx; color: #7a746d; }
.grid { display: flex; margin-top: 18rpx; gap: 10rpx; }
.metric { flex: 1; padding: 12rpx 8rpx; border-radius: 12rpx; background: #f7f3ed; display: flex; flex-direction: column; align-items: center; }
.num { font-size: 34rpx; font-weight: 700; }
.label { margin-top: 4rpx; font-size: 20rpx; color: #7a746d; }
.detail { margin-top: 14rpx; display: flex; flex-direction: column; gap: 6rpx; font-size: 22rpx; color: #3b352f; }
.types { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }
.type { padding: 6rpx 10rpx; border-radius: 999rpx; background: #f4f0ea; font-size: 20rpx; color: #3b352f; }
```

- [ ] **Step 6: Run local tests and JSON validation**

Run:

```bash
node tests/agent-schedule-skill/run.js
node -e "JSON.parse(require('fs').readFileSync('miniprogram/agent-packages/schedule-skill/mcp.json','utf8')); console.log('mcp json ok')"
```

Expected:

```text
agent schedule skill tests passed
mcp json ok
```

- [ ] **Step 7: Commit components**

Run:

```bash
git add miniprogram/agent-packages/schedule-skill/components
git commit -m "feat: add schedule ai cards"
```

---

## Task 8: Wire App Configuration and Base Library

**Files:**

- Create: `miniprogram/agent-packages/AGENTS.md`
- Create: `miniprogram/agent-packages/page-meta.json`
- Modify: `miniprogram/app.json`
- Modify: `project.config.json`

- [ ] **Step 1: Add global agent instruction**

Create `miniprogram/agent-packages/AGENTS.md`:

```md
# 排课助手 AI

你是排课助手的微信 AI 助理，服务对象是兼职私人教练和小型瑜伽/普拉提工作室。

你可以帮助用户查看课表、批量录入课表、修改课程状态、查看本周统计。

写入动作必须以原子接口返回结果为准。没有成功调用写入接口前，不要声称已经完成导入或修改。

当信息不足时，先让用户补充日期、时间或会员姓名。不要编造课程、会员、课程 id 或统计数据。
```

- [ ] **Step 2: Add page metadata**

Create `miniprogram/agent-packages/page-meta.json`:

```json
{
  "pages": [
    {
      "path": "pages/week/week",
      "name": "周课表",
      "description": "查看排课助手的完整周视图课表，支持进入日期和课程详情。"
    },
    {
      "path": "pages/stats/stats",
      "name": "课程统计",
      "description": "查看本周或本月课程数量、完成情况、教学时长和会员活跃度。"
    },
    {
      "path": "pages/session/session",
      "name": "课程表单",
      "description": "新建或编辑一节课程。",
      "query": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "课程 id。用于打开已有课程。"
          },
          "date": {
            "type": "string",
            "description": "课程日期，格式 YYYY-MM-DD。用于新建课程。"
          }
        }
      }
    }
  ]
}
```

- [ ] **Step 3: Modify `miniprogram/app.json`**

Add `subPackages` and `agent` while preserving existing pages, tabBar, and settings:

```json
{
  "subPackages": [
    {
      "root": "agent-packages",
      "independent": true,
      "pages": []
    }
  ],
  "agent": {
    "skills": [
      {
        "name": "schedule",
        "description": "查看课表、批量录入课表、修改课程状态、查看本周统计",
        "path": "agent-packages/schedule-skill"
      }
    ],
    "instruction": "agent-packages/AGENTS.md",
    "pageMetadata": "agent-packages/page-meta.json"
  }
}
```

The final file must still include existing `pages`, `window`, `tabBar`, `plugins`, `style`, `componentFramework`, `sitemapLocation`, and `lazyCodeLoading`.

- [ ] **Step 4: Modify `project.config.json`**

Set:

```json
{
  "libVersion": "3.16.1"
}
```

If the Nightly Developer Tools UI rewrites this to `trial`, confirm in the UI that the active debug base library is 3.16.1 or higher before keeping `trial`.

- [ ] **Step 5: Validate JSON and run tests**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('miniprogram/app.json','utf8')); JSON.parse(require('fs').readFileSync('project.config.json','utf8')); JSON.parse(require('fs').readFileSync('miniprogram/agent-packages/page-meta.json','utf8')); console.log('json ok')"
node tests/agent-schedule-skill/run.js
```

Expected:

```text
json ok
agent schedule skill tests passed
```

- [ ] **Step 6: Commit app wiring**

Run:

```bash
git add miniprogram/app.json project.config.json miniprogram/agent-packages/AGENTS.md miniprogram/agent-packages/page-meta.json
git commit -m "feat: wire schedule ai skill"
```

---

## Task 9: Manual Verification Checklist

**Files:**

- No new code files required.

- [ ] **Step 1: Verify local tests**

Run:

```bash
node tests/agent-schedule-skill/run.js
```

Expected:

```text
agent schedule skill tests passed
```

- [ ] **Step 2: Verify JSON files**

Run:

```bash
node -e "['miniprogram/app.json','project.config.json','miniprogram/agent-packages/page-meta.json','miniprogram/agent-packages/schedule-skill/mcp.json'].forEach(p=>JSON.parse(require('fs').readFileSync(p,'utf8'))); console.log('all json ok')"
```

Expected:

```text
all json ok
```

- [ ] **Step 3: Open WeChat Developer Tools when AI review passes**

In Developer Tools Nightly:

1. Open `/Users/jeff/WeChatProjects/paike-helper`.
2. Confirm debug base library is `3.16.1` or higher.
3. Switch compile mode to `小程序 AI 编译`.
4. Select the `schedule` SKILL.
5. Test `getWeekSchedule` with `{"weekStart":"2026-06-08"}`.
6. Test `previewImportSchedule` with `{"text":"6.11 10:00 普拉提 张三 A教室"}`.
7. Test `commitImportSchedule` using the preview token returned in step 6.
8. Test `updateSessionStatus` with `{"date":"2026-06-08","startTime":"10:00","status":"completed"}`.
9. Test `getWeekStats` with `{"weekStart":"2026-06-08"}`.

Expected: each API returns `isError: false` except intentionally invalid token/status cases; bound cards render without blank UI.

- [ ] **Step 4: Record known verification gap**

Until the AI 开发模式审核 passes, note in the final implementation summary:

```text
AI compile-mode verification is pending because the AppID AI 开发模式 is still under review. Local API/storage logic passed through the Node harness.
```

---

## Self-Review

Spec coverage:

- 查看周课表: Task 3 `getWeekSchedule`, Task 7 `week-schedule-card`, Task 8 app wiring.
- 批量录入课表: Task 2 parser/storage previews, Task 4 preview/commit APIs, Task 7 import card.
- 修改课表状态: Task 5 status API, Task 7 status card.
- 查看本周统计: Task 3 `getWeekStats`, Task 7 stats card.
- 本地优先: all APIs use `wx` storage helpers in Task 2.
- 调试限制: Task 9 records AI compile-mode verification gap while review is pending.

Placeholder scan:

- The plan contains no placeholder markers or unspecified tasks. Component steps include concrete `index.js`, `index.wxml`, and `index.wxss` snippets.

Type consistency:

- Status enum is consistently `scheduled | completed | cancelled | noshow`.
- Preview token is consistently `previewToken` in APIs, card, storage, and tests.
- Session identifiers are consistently `id` in storage and `sessionId` in API input.
