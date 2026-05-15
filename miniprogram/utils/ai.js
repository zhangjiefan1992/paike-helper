const storage = require('./storage')
const dateUtil = require('./dateUtil')

function buildPrompt(session, member, history) {
  const courseInfo = [
    `课程类型：${session.courseType || '未知'}`,
    `时长：${session.duration || 60}分钟`,
    session.focusAreas && session.focusAreas.length ? `训练重点：${session.focusAreas.join('、')}` : '',
    session.location ? `地点：${session.location}` : ''
  ].filter(Boolean).join('\n')

  const memberInfo = member ? `学员：${member.name}` : '学员信息缺失'

  let historyBlock = ''
  if (history && history.length > 1) {
    const recent = history.slice(1, 6)
    historyBlock = '该学员近期课程记录：\n' + recent.map((s, i) => {
      const date = s.date || ''
      const type = s.courseType || ''
      const focus = (s.focusAreas || []).join('、')
      const notes = s.notes || ''
      return `${i + 1}. ${date} — ${type}${focus ? '（重点：' + focus + '）' : ''}${notes ? ' — 备注：' + notes : ''}`
    }).join('\n')
  }

  const coachNotes = session.notes ? `教练备注：${session.notes}` : ''

  return [
    '你是一位资深瑜伽/普拉提/健身教练，请根据以下信息为学员生成一份专业的课后评估总结。',
    '',
    '要求：',
    '- 语气专业但温暖，像教练写给学员的话',
    '- 包含本次课程的核心内容和训练重点',
    history && history.length > 1 ? '- 结合学员历史记录，体现纵向对比和进步观察' : '',
    '- 给出1-2条课后练习建议',
    '- 控制在150-250字',
    '- 分段落，易读',
    '',
    '【本次课程信息】',
    courseInfo,
    '',
    memberInfo,
    '',
    historyBlock || '无历史课程记录，这是该学员的第一节课。',
    '',
    coachNotes || '教练未填写额外备注。'
  ].filter(Boolean).join('\n')
}

function generateSummary(session, member, sessionId) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error('云开发未初始化'))
      return
    }

    const history = session.memberId ? storage.getSessionsByMemberId(session.memberId) : []
    const prompt = buildPrompt(session, member, history)

    wx.cloud.callFunction({
      name: 'generateSummary',
      data: {
        prompt,
        sessionId
      },
      success: (res) => {
        if (res.result && res.result.text) {
          resolve(res.result.text)
        } else {
          reject(new Error(res.result?.error || '云函数返回格式异常'))
        }
      },
      fail: (err) => {
        console.error('cloud.callFunction failed:', err)
        reject(err)
      }
    })
  })
}

module.exports = { generateSummary, buildPrompt }
