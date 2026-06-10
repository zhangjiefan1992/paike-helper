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

function makeSessions(count, date, weekday) {
  return Array.from({ length: count }, (_, index) => ({
    id: date + '_' + index,
    date,
    weekday,
    dayNum: Number(date.slice(-2)),
    startTime: String(8 + index).padStart(2, '0') + ':00',
    memberId: 'm_' + index,
    memberName: '会员' + index,
    courseType: '私教',
    status: 'scheduled',
    statusLabel: '已约'
  }))
}

function reloadWeekScheduleCard() {
  const path = require.resolve('../../miniprogram/agent-packages/schedule-skill/components/week-schedule-card/index')
  delete require.cache[path]
  let componentDef = null
  global.Component = def => {
    componentDef = def
  }
  require(path)
  delete global.Component
  return componentDef
}

async function testWeekScheduleCardShowsDenseWeek() {
  let resultHandler = null
  wx.modelContext = {
    NotificationType: { Result: 'result' },
    getContext() {
      return {
        on(type, handler) {
          assert.strictEqual(type, 'result')
          resultHandler = handler
        }
      }
    },
    getViewContext() {
      return { setRelatedPage() {} }
    }
  }
  const componentDef = reloadWeekScheduleCard()
  assert.ok(componentDef)
  const instance = {
    data: componentDef.data,
    setData(data) {
      this.data = Object.assign({}, this.data, data)
    }
  }
  componentDef.lifetimes.attached.call(instance)
  assert.strictEqual(typeof resultHandler, 'function')

  const days = [
    { date: '2026-04-20', weekday: '周一', dayNum: 20, count: 8, sessions: makeSessions(8, '2026-04-20', '周一') },
    { date: '2026-04-21', weekday: '周二', dayNum: 21, count: 6, sessions: makeSessions(6, '2026-04-21', '周二') },
    { date: '2026-04-22', weekday: '周三', dayNum: 22, count: 0, sessions: [] },
    { date: '2026-04-23', weekday: '周四', dayNum: 23, count: 4, sessions: makeSessions(4, '2026-04-23', '周四') },
    { date: '2026-04-24', weekday: '周五', dayNum: 24, count: 3, sessions: makeSessions(3, '2026-04-24', '周五') },
    { date: '2026-04-25', weekday: '周六', dayNum: 25, count: 5, sessions: makeSessions(5, '2026-04-25', '周六') },
    { date: '2026-04-26', weekday: '周日', dayNum: 26, count: 0, sessions: [] }
  ]
  resultHandler({
    result: {
      structuredContent: {
        rangeLabel: '4月20日 - 4月26日',
        total: 26,
        days
      }
    }
  })

  assert.strictEqual(instance.data.days.length, 7)
  assert.strictEqual(instance.data.days[0].cards.length, 7)
  assert.strictEqual(instance.data.days[0].moreCount, 1)
  assert.strictEqual(instance.data.days[1].cards.length, 6)
  assert.strictEqual(instance.data.hiddenCount, 1)
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
  await testWeekScheduleCardShowsDenseWeek()
  await testIndexRegistrationFallback()
  await testIndexRegistrationWithCreateSkill()
  console.log('agent schedule skill tests passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
