const storage = require('../lib/storage')
const presenters = require('../lib/presenters')

const PREVIEW_TTL_MS = 30 * 60 * 1000

async function commitImportSchedule(args = {}) {
  const token = args.previewToken
  const preview = storage.getImportPreview(token)
  if (!preview) {
    return {
      isError: true,
      content: presenters.text('未找到这次导入预览，无法写入。请让用户重新发送课表文本生成新的预览。')
    }
  }
  if (preview.consumed) {
    return {
      isError: true,
      content: presenters.text('这次导入预览已被使用，不能重复导入。请告诉用户课程没有重复写入。')
    }
  }
  if (Date.now() - preview.createdAt > PREVIEW_TTL_MS) {
    return {
      isError: true,
      content: presenters.text('这次导入预览已过期，不能写入。请让用户重新发送课表文本生成新的预览。')
    }
  }

  const affectedDates = {}
  preview.sessions.forEach(session => { affectedDates[session.date] = true })
  if (preview.clearExisting) {
    Object.keys(affectedDates).forEach(date => storage.deleteSessionsByDate(date))
  }

  preview.memberDrafts.forEach(member => {
    if (!storage.getMemberByName(member.name)) storage.saveMember(member)
  })

  const savedSessions = preview.sessions.map(session => {
    return storage.saveSession(presenters.cleanSessionForStorage(session))
  })
  storage.markImportPreviewConsumed(token)

  return {
    isError: false,
    content: presenters.text('已成功导入 ' + savedSessions.length + ' 节课程。请告知用户导入完成，并建议查看本周课表核对。'),
    structuredContent: {
      importedCount: savedSessions.length,
      affectedDates: Object.keys(affectedDates).sort(),
      sessions: savedSessions.map(session => ({
        id: session.id,
        date: session.date,
        startTime: session.startTime,
        courseType: session.courseType,
        status: session.status
      }))
    }
  }
}

module.exports = commitImportSchedule
