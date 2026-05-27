// 代理转发：AI 备课追问 → CF Worker → Agent
const API_BASE = process.env.API_BASE || 'https://keleya.org'

exports.main = async (event) => {
  const { conversationId, question } = event

  if (!conversationId || !question) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/agent/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: question,
      })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `服务端 ${response.status}: ${body.slice(0, 200)}` }
    }

    const result = await response.json()
    if (result.code !== 0) {
      return { success: false, error: result.message || '追问失败' }
    }

    return {
      success: true,
      data: {
        answer: result.data.answer || '',
        conversationId: result.data.conversation_id || conversationId,
      }
    }
  } catch (err) {
    console.error('aiFollowup proxy error:', err)
    return { success: false, error: err.message || '网络异常' }
  }
}
