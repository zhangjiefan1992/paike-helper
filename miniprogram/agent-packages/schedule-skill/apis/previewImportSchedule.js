const parser = require('../lib/importParser')
const storage = require('../lib/storage')
const presenters = require('../lib/presenters')
const { generatePreviewToken } = require('../lib/ids')

async function previewImportSchedule(args = {}) {
  const text = String(args.text || '').trim()
  if (!text) {
    return {
      isError: true,
      content: presenters.text('没有收到课表文本。请让用户粘贴课表，每行一节课，例如：6.11 10:00 普拉提 张三 A教室。')
    }
  }

  const parsed = parser.parseTextToSessions(text)
  if (parsed.sessions.length === 0) {
    const firstError = parsed.errors[0]
    const reason = firstError ? firstError.message : '未识别到包含日期的课程行'
    return {
      isError: true,
      content: presenters.text('课表解析失败：' + reason + '。请让用户按“6.11 10:00 普拉提 张三 A教室”的格式重新发送。'),
      structuredContent: {
        importableCount: 0,
        skipped: parsed.skipped,
        errors: parsed.errors
      }
    }
  }

  const token = generatePreviewToken()
  const preview = {
    token,
    createdAt: Date.now(),
    consumed: false,
    clearExisting: !!args.clearExisting,
    sessions: parsed.sessions,
    memberDrafts: parsed.memberDrafts
  }
  storage.saveImportPreview(preview)

  return {
    isError: false,
    content: presenters.text('已解析出 ' + parsed.sessions.length + ' 节课程，其中跳过 ' + parsed.skipped.length + ' 行、错误 ' + parsed.errors.length + ' 行。请展示导入预览卡片，等待用户确认后再写入。'),
    structuredContent: {
      previewToken: token,
      importableCount: parsed.sessions.length,
      skippedCount: parsed.skipped.length,
      errorCount: parsed.errors.length,
      clearExisting: !!args.clearExisting,
      sessions: parsed.sessions.map(item => ({
        id: item.id,
        date: item.date,
        startTime: item.startTime,
        courseType: item.courseType,
        memberName: item._memberName,
        location: item.location,
        status: item.status
      })),
      skipped: parsed.skipped,
      errors: parsed.errors,
      memberDrafts: parsed.memberDrafts.map(member => ({ id: member.id, name: member.name }))
    }
  }
}

module.exports = previewImportSchedule
