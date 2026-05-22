// 云函数瘦身版：仅作为代理转发到 Cloudflare Worker
// 真实 AI 逻辑维护在 server/src/worker.js，统一管理 prompt / 模型
const API_BASE = process.env.API_BASE || 'https://keleya.org'

exports.main = async (event) => {
  const {
    text,
    memberNames = [],
    courseTypes = [],
    locations = [],
    focusAreaOptions = [],
    today
  } = event

  if (!text || !text.trim()) {
    return { success: false, error: '语音文本为空' }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/parse-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        context: {
          memberNames,
          courseTypes,
          locations,
          focusAreaOptions,
          today: today || new Date().toISOString().slice(0, 10)
        }
      })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `服务端 ${response.status}: ${body.slice(0, 100)}` }
    }

    const result = await response.json()
    if (result.code !== 0) {
      return { success: false, error: result.message || '解析失败' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    console.error('parseVoiceSession proxy error:', err)
    return { success: false, error: err.message || '网络异常' }
  }
}
