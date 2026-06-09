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
