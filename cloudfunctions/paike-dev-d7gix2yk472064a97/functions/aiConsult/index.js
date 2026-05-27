// 代理转发：AI 备课咨询 → CF Worker → Agent（非流式）
const API_BASE = process.env.API_BASE || 'https://keleya.org'

exports.main = async (event) => {
  const { memberId, memberProfile, recentSessions, coachQuestion } = event

  if (!memberId) {
    return { success: false, error: '缺少会员 ID' }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/agent/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        member_profile: memberProfile || null,
        recent_sessions: recentSessions || [],
        coach_question: coachQuestion || '',
        stream: false,
      })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `服务端 ${response.status}: ${body.slice(0, 200)}` }
    }

    const result = await response.json()
    if (result.code !== 0) {
      return { success: false, error: result.message || 'AI 分析失败' }
    }

    const { schools, synthesis, conversation_id } = result.data
    const schoolTexts = {}
    if (schools) {
      Object.keys(schools).forEach(k => {
        schoolTexts[k] = schools[k].opinion || schools[k] || ''
      })
    }

    return {
      success: true,
      data: {
        schools: schoolTexts,
        judgeText: synthesis || '',
        conversationId: conversation_id || '',
      }
    }
  } catch (err) {
    console.error('aiConsult proxy error:', err)
    return { success: false, error: err.message || '网络异常' }
  }
}
