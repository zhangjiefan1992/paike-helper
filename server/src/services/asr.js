const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY
const ASR_MODEL = process.env.ASR_MODEL || 'paraformer-v2'
const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1'

export async function recognizeSpeech(audioBuffer, format = 'wav', sampleRate = 16000) {
  if (!DASHSCOPE_API_KEY) {
    throw Object.assign(new Error('DASHSCOPE_API_KEY 未配置'), { statusCode: 500 })
  }

  const base64Audio = Buffer.from(audioBuffer).toString('base64')
  const dataUri = `data:audio/${format === 'pcm' ? 'pcm' : 'wav'};base64,${base64Audio}`

  const taskId = await submitTranscription(dataUri)
  const result = await pollResult(taskId)

  let text = ''
  if (result.transcripts?.length > 0) {
    text = result.transcripts
      .map(t => t.text || '')
      .join('')
      .replace(/<\|[^|]*\|>/g, '')
      .trim()
  }

  if (!text) {
    throw Object.assign(new Error('语音识别结果为空'), { statusCode: 400 })
  }

  return text
}

async function submitTranscription(fileUrl) {
  const res = await fetch(`${DASHSCOPE_BASE}/services/audio/asr/transcription`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model: ASR_MODEL,
      input: { file_urls: [fileUrl] },
      parameters: { language_hints: ['zh'] }
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw Object.assign(new Error(`ASR 提交失败: ${res.status} ${body.slice(0, 200)}`), { statusCode: 502 })
  }

  const data = await res.json()
  const taskId = data.output?.task_id
  if (!taskId) {
    throw Object.assign(new Error(`ASR 响应异常: ${JSON.stringify(data).slice(0, 200)}`), { statusCode: 502 })
  }

  return taskId
}

async function pollResult(taskId, maxWaitMs = 30000) {
  const startTime = Date.now()
  const pollInterval = 500
  const maxInterval = 2000
  let interval = pollInterval

  while (Date.now() - startTime < maxWaitMs) {
    await sleep(interval)

    const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` }
    })

    if (!res.ok) {
      throw Object.assign(new Error(`ASR 查询失败: ${res.status}`), { statusCode: 502 })
    }

    const data = await res.json()
    const status = data.output?.task_status

    if (status === 'SUCCEEDED') {
      const transcriptionUrl = data.output.results?.[0]?.transcription_url
      if (!transcriptionUrl) {
        throw Object.assign(new Error('ASR 结果 URL 缺失'), { statusCode: 502 })
      }
      return await fetchTranscriptionResult(transcriptionUrl)
    }

    if (status === 'FAILED') {
      const errMsg = data.output.message || data.output.results?.[0]?.message || '识别失败'
      throw Object.assign(new Error(`ASR 失败: ${errMsg}`), { statusCode: 502 })
    }

    interval = Math.min(interval * 1.5, maxInterval)
  }

  throw Object.assign(new Error('ASR 超时'), { statusCode: 504 })
}

async function fetchTranscriptionResult(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw Object.assign(new Error(`获取转写结果失败: ${res.status}`), { statusCode: 502 })
  }
  return await res.json()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
