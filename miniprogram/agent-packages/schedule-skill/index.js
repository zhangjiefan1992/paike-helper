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
