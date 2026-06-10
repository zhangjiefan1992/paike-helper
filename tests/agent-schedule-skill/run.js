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
  assert.strictEqual(res.structuredContent.days.length, 7)
  assert.strictEqual(res.structuredContent.days[0].sessions[0].memberName, '张三')
  assert.match(res.content[0].text, /已找到/)

  const both = await getWeekSchedule({ weekStart: '2026-06-08', date: '2026-06-08' })
  assert.strictEqual(both.isError, false)
  assert.strictEqual(both.structuredContent.total, 2)
  assert.strictEqual(both.structuredContent.days.length, 7)

  const day = await getWeekSchedule({ date: '2026-06-08' })
  assert.strictEqual(day.isError, false)
  assert.strictEqual(day.structuredContent.total, 2)
  assert.strictEqual(day.structuredContent.days.length, 7)
  assert.strictEqual(day.structuredContent.weekStart, '2026-06-08')

  const midweek = await getWeekSchedule({ date: '2026-06-10' })
  assert.strictEqual(midweek.isError, false)
  assert.strictEqual(midweek.structuredContent.total, 2)
  assert.strictEqual(midweek.structuredContent.days.length, 7)
  assert.strictEqual(midweek.structuredContent.weekStart, '2026-06-08')
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

function reloadSkillIndex() {
  const path = require.resolve('../../miniprogram/agent-packages/schedule-skill/index')
  delete require.cache[path]
  return require(path)
}

async function testIndexRegistrationFallback() {
  resetStorage()
  const registered = {}
  wx.modelContext = {
    registerAPI(name, handler) {
      registered[name] = handler
    }
  }
  reloadSkillIndex()
  assert.strictEqual(typeof registered.getWeekSchedule, 'function')
  assert.strictEqual(typeof registered.previewImportSchedule, 'function')
  assert.strictEqual(typeof registered.commitImportSchedule, 'function')
  assert.strictEqual(typeof registered.updateSessionStatus, 'function')
  assert.strictEqual(typeof registered.getWeekStats, 'function')

  const res = await registered.getWeekSchedule({ weekStart: '2026-06-08' })
  assert.strictEqual(res.isError, false)
  assert.strictEqual(res.structuredContent.total, 2)
}

async function testIndexRegistrationWithCreateSkill() {
  resetStorage()
  const registered = {}
  let middleware = null
  wx.modelContext = {
    createSkill(skillPath) {
      assert.strictEqual(skillPath, 'agent-packages/schedule-skill')
      return {
        use(fn) {
          middleware = fn
        },
        registerAPI(name, handler) {
          registered[name] = handler
        }
      }
    }
  }
  reloadSkillIndex()
  assert.strictEqual(typeof middleware, 'function')
  assert.strictEqual(typeof registered.getWeekSchedule, 'function')
  assert.strictEqual(typeof registered.updateSessionStatus, 'function')
}

async function main() {
  await testWeekSchedule()
  await testPreviewAndCommitImport()
  await testUpdateStatus()
  await testWeekStats()
  await testIndexRegistrationFallback()
  await testIndexRegistrationWithCreateSkill()
  console.log('agent schedule skill tests passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
