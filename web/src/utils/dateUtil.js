const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getWeekRange(date) {
  const d = new Date(date)
  const dayOfWeek = d.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)

  const todayStr = toDateStr(new Date())
  const days = []
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday)
    current.setDate(monday.getDate() + i)
    const dateStr = toDateStr(current)
    days.push({
      date: dateStr,
      weekday: WEEKDAYS[current.getDay()],
      dayNum: current.getDate(),
      isToday: dateStr === todayStr
    })
  }

  return { start: days[0].date, end: days[6].date, days }
}

export function getWeekday(dateStr) {
  return WEEKDAYS[parseDate(dateStr).getDay()]
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function isToday(dateStr) {
  return dateStr === toDateStr(new Date())
}

export function getMonthLabel(dateStr) {
  const [y, m] = dateStr.split('-')
  return `${y}年${parseInt(m)}月`
}

export function formatDate(date, format) {
  const d = typeof date === 'string' ? parseDate(date) : date
  const map = {
    'YYYY': d.getFullYear(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'M': d.getMonth() + 1,
    'D': d.getDate()
  }
  let result = format
  for (const [key, val] of Object.entries(map)) {
    result = result.replace(key, val)
  }
  return result
}
