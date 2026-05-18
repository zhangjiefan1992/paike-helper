const BASE_URL = import.meta.env.VITE_API_BASE || ''

async function request(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `请求失败 (${res.status})`)
  }

  const data = await res.json()
  if (data.code !== 0) {
    throw new Error(data.message || '服务端返回错误')
  }
  return data.data
}

export function generateSummary(session, member, history) {
  return request('/api/v1/ai/summary', { session, member, history })
}

export function parseTextSession(text, context) {
  return request('/api/v1/ai/parse-text', { text, context })
}

export async function parseVoiceSession(audioBlob, context, model) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.wav')
  formData.append('context', JSON.stringify(context))
  if (model) formData.append('model', model)

  const res = await fetch(`${BASE_URL}/api/v1/ai/voice-session`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `请求失败 (${res.status})`)
  }

  const data = await res.json()
  if (data.code !== 0) {
    throw new Error(data.message || '语音解析失败')
  }
  return data.data
}
