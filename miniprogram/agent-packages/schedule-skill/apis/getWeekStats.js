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
