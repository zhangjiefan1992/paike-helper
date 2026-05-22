// 代理转发：多段语音原文 → Cloudflare AI 收敛档案 + 结构化字段
const API_BASE = process.env.API_BASE || 'https://keleya.org'

exports.main = async (event) => {
  const {
    segments = [],
    memberNames = [],
    courseTypes = [],
    locations = [],
    focusAreaOptions = [],
    today
  } = event

  if (!Array.isArray(segments) || segments.length === 0) {
    return { success: false, error: '至少需要一段录音' }
  }

  const validSegments = segments
    .filter(s => s && s.rawText && s.rawText.trim())
    .map(s => ({ rawText: s.rawText.trim(), asrModel: s.asrModel || '' }))

  if (validSegments.length === 0) {
    return { success: false, error: '所有片段都是空的' }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/parse-segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segments: validSegments,
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
    console.error('parseSegments proxy error:', err)
    return { success: false, error: err.message || '网络异常' }
  }
}
