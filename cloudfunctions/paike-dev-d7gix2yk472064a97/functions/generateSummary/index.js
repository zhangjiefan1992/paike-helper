// 云函数瘦身版：仅作为代理转发到 Cloudflare Worker
// 真实 LLM 逻辑维护在 server/src/worker.js
const API_BASE = process.env.API_BASE || 'https://keleya.org'

exports.main = async (event) => {
  const { prompt, sessionId, systemPrompt, temperature, maxTokens } = event

  if (!prompt) {
    return { error: 'missing prompt', text: '' }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemPrompt: systemPrompt || '你是一位资深瑜伽/普拉提/健身私人教练，专门为学员撰写课后评估总结。你的文字专业、温暖、有洞察力。',
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        maxTokens: typeof maxTokens === 'number' ? maxTokens : 800
      })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { error: `服务端 ${response.status}: ${body.slice(0, 100)}`, text: '' }
    }

    const result = await response.json()
    if (result.code !== 0) {
      return { error: result.message || 'LLM 调用失败', text: '' }
    }

    return {
      text: result.data.text || '',
      sessionId
    }
  } catch (err) {
    console.error('generateSummary proxy error:', err)
    return { error: err.message || '网络异常', text: '' }
  }
}
