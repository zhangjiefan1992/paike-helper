import * as storage from '../services/storage'
import { parseDate, getWeekday } from './dateUtil'
import { generateSessionId, generateMemberId } from './idGenerator'

const WEEKDAY_MAP = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 0 }
const BUILTIN_COURSE_TYPES = ['微私教', '私教', '团课']

export function exportSessionsToText(sessions, members) {
  const memberMap = {}
  members.forEach(m => { memberMap[m.id] = m })

  const lines = []
  const sorted = sessions.slice().sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
  )

  sorted.forEach(s => {
    if (s.status === 'cancelled') return
    const d = parseDate(s.date)
    const monthDay = (d.getMonth() + 1) + '.' + d.getDate()
    const courseType = s.courseType || '私教'
    const time = s.startTime
    const weekday = getWeekday(s.date)
    const member = memberMap[s.memberId]
    const memberName = member ? member.name : ''
    const location = s.location || ''

    const parts = [monthDay, courseType, time, weekday]
    if (memberName) parts.push(memberName)
    if (location) parts.push(location)
    lines.push(parts.join(' '))
  })

  return lines.join('\n')
}

export function parseTextToSessions(text) {
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0)
  const members = storage.getMembers()
  const memberByName = {}
  members.forEach(m => { memberByName[m.name] = m })

  const config = storage.getConfig()
  const knownCourseTypes = new Set(config.courseTypes || [])
  const knownLocations = new Set(config.locations || [])

  const results = []
  const skipped = []
  const errors = []
  const currentYear = new Date().getFullYear()

  lines.forEach((line, idx) => {
    const stripped = line.replace(/[✅✓√☑✔]/g, '').replace(/^[◦●•○▪▸►‣※·\-–—]\s*/g, '').trim()
    if (!/\d{1,2}[\.\/]\d{1,2}/.test(stripped)) {
      skipped.push({ line: idx + 1, text: line })
      return
    }

    try {
      const parsed = parseLine(line, currentYear, knownCourseTypes, knownLocations, memberByName, config)
      if (parsed) {
        parsed._lineNum = idx + 1
        results.push(parsed)
      } else {
        skipped.push({ line: idx + 1, text: line })
      }
    } catch (e) {
      errors.push({ line: idx + 1, text: line, message: e.message })
    }
  })

  return { results, skipped, errors }
}

function parseLine(line, currentYear, knownCourseTypes, knownLocations, memberByName, config) {
  let remaining = line
  let status = 'scheduled'

  if (/[✅✓√☑✔]/.test(remaining)) {
    status = 'completed'
    remaining = remaining.replace(/[✅✓√☑✔]/g, '')
  }
  remaining = remaining.replace(/^[◦●•○▪▸►‣※·\-–—]\s*/g, '').trim()

  if (!/\d{1,2}[\.\/]\d{1,2}/.test(remaining)) return null

  let dateStr = null
  const dateMatch = remaining.match(/(\d{1,2})[\.\/](\d{1,2})/)
  if (dateMatch) {
    const mon = parseInt(dateMatch[1])
    const day = parseInt(dateMatch[2])
    dateStr = currentYear + '-' + String(mon).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    remaining = remaining.replace(dateMatch[0], ' ')
  }

  let startTime = null
  const timeMatch = remaining.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    startTime = timeMatch[1].padStart(2, '0') + ':' + timeMatch[2]
    remaining = remaining.replace(timeMatch[0], ' ')
  }

  let weekday = null
  const wdMatch = remaining.match(/周[一二三四五六日]/)
  if (wdMatch) {
    weekday = wdMatch[0]
    remaining = remaining.replace(wdMatch[0], ' ')
  }

  let location = null
  const bracketMatch = remaining.match(/[（(]([^）)]+)[）)]/)
  if (bracketMatch) {
    location = bracketMatch[1]
    remaining = remaining.replace(bracketMatch[0], ' ')
  }

  let courseType = null
  const allTypes = BUILTIN_COURSE_TYPES.slice()
  knownCourseTypes.forEach(t => {
    if (allTypes.indexOf(t) === -1) allTypes.push(t)
  })
  allTypes.sort((a, b) => b.length - a.length)

  for (const t of allTypes) {
    if (remaining.indexOf(t) !== -1) {
      courseType = t
      remaining = remaining.replace(t, ' ')
      break
    }
  }

  const tokens = remaining.split(/\s+/).filter(t => t.length > 0)
  let memberName = null
  let memberId = ''

  for (const tk of tokens) {
    if (memberByName[tk]) {
      memberName = tk
      memberId = memberByName[tk].id
    } else if (knownLocations.has(tk)) {
      if (!location) location = tk
    } else if (!memberName) {
      memberName = tk
      const newId = generateMemberId()
      const newMember = {
        id: newId, name: tk, phone: '', avatar: '', notes: '',
        createdAt: Date.now(), updatedAt: Date.now()
      }
      storage.saveMember(newMember)
      memberByName[tk] = newMember
      memberId = newId
    } else if (!location) {
      location = tk
    }
  }

  if (!dateStr) return null
  if (!startTime) throw new Error('缺少时间(如 10:30)')
  if (!courseType) courseType = '私教'

  const classMode = (courseType === '团课') ? 'group' : 'private'

  return {
    id: generateSessionId(),
    date: dateStr,
    startTime,
    duration: config.defaultDuration || 60,
    classMode,
    courseType,
    location: location || '',
    memberId,
    memberIds: [],
    status,
    notes: '',
    focusAreas: [],
    photos: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    _raw: line,
    _lineNum: 0,
    _memberName: memberName || '',
    _weekday: weekday || ''
  }
}
