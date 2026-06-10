const getWeekSchedule = require('./apis/getWeekSchedule')
const previewImportSchedule = require('./apis/previewImportSchedule')
const commitImportSchedule = require('./apis/commitImportSchedule')
const updateSessionStatus = require('./apis/updateSessionStatus')
const getWeekStats = require('./apis/getWeekStats')

const SKILL_PATH = 'agent-packages/schedule-skill'
const apis = {
  getWeekSchedule,
  previewImportSchedule,
  commitImportSchedule,
  updateSessionStatus,
  getWeekStats
}

async function logAround(ctx, next) {
  const start = Date.now()
  try {
    await next()
  } catch (err) {
    console.error('[schedule-skill]', ctx.name, err, Date.now() - start)
    throw err
  }
}

function wrapHandler(name, handler) {
  return async function wrappedHandler(args) {
    let result
    await logAround({ name, args }, async () => {
      result = await handler(args)
    })
    return result
  }
}

function registerWithSkill(modelContext) {
  const skill = modelContext.createSkill(SKILL_PATH)
  skill.use(logAround)
  Object.keys(apis).forEach(name => {
    skill.registerAPI(name, apis[name])
  })
}

function registerDirectly(modelContext) {
  Object.keys(apis).forEach(name => {
    modelContext.registerAPI(name, wrapHandler(name, apis[name]))
  })
}

if (!wx.modelContext) {
  throw new Error('wx.modelContext is unavailable')
}

if (typeof wx.modelContext.createSkill === 'function') {
  registerWithSkill(wx.modelContext)
} else if (typeof wx.modelContext.registerAPI === 'function') {
  registerDirectly(wx.modelContext)
} else {
  throw new Error('wx.modelContext.registerAPI is unavailable')
}
