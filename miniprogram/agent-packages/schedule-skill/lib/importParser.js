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
  const status = checked ? 'completed' : 'scheduled'

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
