const storage = require('../lib/storage')
const presenters = require('../lib/presenters')

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'noshow']

function sameMember(session, memberName, memberMap) {
  if (!memberName) return true
  if (session.memberId && memberMap[session.memberId] && memberMap[session.memberId].name === memberName) return true
  return false
}

function canWriteDirectly(args, candidates) {
  if (candidates.length !== 1) return false
  if (args.sessionId) return true
  if (args.date && args.startTime) return true
  if (args.date && args.memberName) return true
  return false
}

function findCandidates(args) {
  const members = storage.getMembers()
  const memberMap = presenters.makeMemberMap(members)
  const sessions = storage.getSessions()
  let candidates = sessions
  if (args.sessionId) candidates = candidates.filter(session => session.id === args.sessionId)
  if (args.date) candidates = candidates.filter(session => session.date === args.date)
  if (args.startTime) candidates = candidates.filter(session => session.startTime === args.startTime)
  if (args.memberName) candidates = candidates.filter(session => sameMember(session, args.memberName, memberMap))
  return candidates
    .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))
    .map(session => presenters.shapeSession(session, memberMap))
}

async function updateSessionStatus(args = {}) {
  const status = args.status
  if (!VALID_STATUSES.includes(status)) {
    return {
      isError: true,
      content: presenters.text('状态值无效。只允许 scheduled、completed、cancelled、noshow。请让用户明确要标记为已约、已上、取消或爽约。')
    }
  }

  const candidates = findCandidates(args)
  if (candidates.length === 0) {
    return {
      isError: false,
      content: presenters.text('没有找到匹配的课程。请让用户补充日期、时间或会员姓名。'),
      structuredContent: {
        action: 'missing',
        targetStatus: status,
        targetStatusLabel: presenters.statusLabel(status),
        candidates: []
      }
    }
  }

  if (!canWriteDirectly(args, candidates)) {
    return {
      isError: false,
      content: presenters.text('未能唯一确定课程，已返回 ' + candidates.length + ' 个候选。请展示候选卡片，让用户选择要修改的课程。'),
      structuredContent: {
        action: 'choose',
        targetStatus: status,
        targetStatusLabel: presenters.statusLabel(status),
        candidates: candidates.slice(0, 5)
      }
    }
  }

  const target = candidates[0]
  const updated = storage.updateSessionStatus(target.id, status)
  if (!updated) {
    return {
      isError: true,
      content: presenters.text('课程匹配成功但写入失败。请让用户稍后重试，或回到小程序课程页手动修改。')
    }
  }

  const shaped = presenters.shapeSession(updated, presenters.makeMemberMap(storage.getMembers()))
  const label = shaped.dateLabel + ' ' + shaped.startTime + ' ' + shaped.memberName
  return {
    isError: false,
    content: presenters.text('已把 ' + label + ' 标记为' + presenters.statusLabel(status) + '。请展示状态修改结果卡片。'),
    structuredContent: {
      action: 'updated',
      updatedSession: shaped,
      targetStatus: status,
      targetStatusLabel: presenters.statusLabel(status)
    }
  }
}

module.exports = updateSessionStatus
