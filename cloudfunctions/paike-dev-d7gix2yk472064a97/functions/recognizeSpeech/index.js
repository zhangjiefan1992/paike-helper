// 代理转发：小程序上传 base64 音频 → Cloudflare ASR
const API_BASE = process.env.API_BASE || 'https://keleya.org'

exports.main = async (event) => {
  const { audio, format = 'pcm', model } = event

  if (!audio) {
    return { success: false, error: '未收到音频数据' }
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/recognize-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, format, model })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `服务端 ${response.status}: ${body.slice(0, 100)}` }
    }

    const result = await response.json()
    if (result.code !== 0) {
      return { success: false, error: result.message || '识别失败' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    console.error('recognizeSpeech proxy error:', err)
    return { success: false, error: err.message || '网络异常' }
  }
}
