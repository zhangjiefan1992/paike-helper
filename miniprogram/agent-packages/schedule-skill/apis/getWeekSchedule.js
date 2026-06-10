const storage = require('../lib/storage')
const dateUtil = require('../lib/date')
const presenters = require('../lib/presenters')

async function getWeekSchedule(args = {}) {
  const baseDate = args.weekStart || args.date || dateUtil.toDateStr(new Date())
  const week = dateUtil.getWeekRange(baseDate)
  const rangeStart = week.start
  const rangeEnd = week.end
  const sessions = storage.getSessionsByDateRange(rangeStart, rangeEnd)
  const members = storage.getMembers()
  const days = presenters.groupWeekSessions(week, sessions, members)
  const rangeLabel = dateUtil.formatMonthDay(week.start) + ' - ' + dateUtil.formatMonthDay(week.end)
  const total = days.reduce((sum, day) => sum + day.count, 0)

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
      days
    }
  }
}

module.exports = getWeekSchedule
