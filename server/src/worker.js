import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 600,
  credentials: false
}))

app.options('*', (c) => c.body(null, 204))

app.get('/health', (c) => c.json({ status: 'ok' }))

// POST /api/v1/ai/summary
app.post('/api/v1/ai/summary', async (c) => {
  const { session, member, history } = await c.req.json()
  try {
    const prompt = buildSummaryPrompt(session, member || {}, history || [])
    const text = await callLLM(c.env, prompt, {})
    return c.json({ code: 0, data: { text } })
  } catch (err) {
    const status = err.statusCode || 500
    return c.json({ code: status === 502 ? 50201 : 50000, message: err.message }, status)
  }
})

// POST /api/v1/ai/parse-text
app.post('/api/v1/ai/parse-text', async (c) => {
  const { text, context = {} } = await c.req.json()
  if (!text || !text.trim()) {
    return c.json({ code: 40001, message: '请输入排课内容' }, 400)
  }
  try {
    const data = await parseVoiceText(c.env, text.trim(), context)
    return c.json({ code: 0, data: { ...data, rawText: text.trim() } })
  } catch (err) {
    const status = err.statusCode || 500
    return c.json({ code: status === 400 ? 40000 : 50203, message: err.message }, status)
  }
})

const ALLOWED_MODELS = new Set([
  'paraformer-v2',
  'paraformer-v1',
  'paraformer-mtl-v1',
  'paraformer-8k-v1',
  'sensevoice-v1',
  'fun-asr'
])

// POST /api/v1/ai/voice-session
app.post('/api/v1/ai/voice-session', async (c) => {
  const formData = await c.req.formData()
  const audioFile = formData.get('audio')
  const contextStr = formData.get('context')
  const modelInput = formData.get('model')

  if (!audioFile || audioFile.size === 0) {
    return c.json({ code: 40001, message: '未收到音频文件' }, 400)
  }

  let context = {}
  if (contextStr) {
    try { context = JSON.parse(contextStr) } catch {}
  }

  const model = ALLOWED_MODELS.has(modelInput) ? modelInput : (c.env.ASR_MODEL || 'paraformer-v2')

  try {
    const audioBuffer = await audioFile.arrayBuffer()
    const rawText = await recognizeSpeech(c.env, audioBuffer, 'wav', model)
    if (!rawText) {
      return c.json({ code: 40002, message: '语音识别结果为空，请重试' }, 400)
    }
    const data = await parseVoiceText(c.env, rawText, context)
    return c.json({ code: 0, data: { ...data, rawText, asrModel: model } })
  } catch (err) {
    const status = err.statusCode || 500
    return c.json({ code: status === 400 ? 40000 : 50202, message: err.message }, status)
  }
})

// --- ASR Service ---

async function recognizeSpeech(env, audioBuffer, format = 'wav', overrideModel) {
  const apiKey = env.DASHSCOPE_API_KEY
  if (!apiKey) throw Object.assign(new Error('DASHSCOPE_API_KEY 未配置'), { statusCode: 500 })

  const base64Audio = Buffer.from(audioBuffer).toString('base64')
  const dataUri = `data:audio/${format === 'pcm' ? 'pcm' : 'wav'};base64,${base64Audio}`

  const model = overrideModel || env.ASR_MODEL || 'paraformer-v2'
  const taskId = await submitTranscription(apiKey, model, dataUri)
  const result = await pollResult(apiKey, taskId)

  let text = ''
  if (result.transcripts?.length > 0) {
    text = result.transcripts
      .map(t => t.text || '')
      .join('')
      .replace(/<\|[^|]*\|>/g, '')
      .trim()
  }

  if (!text) throw Object.assign(new Error('语音识别结果为空'), { statusCode: 400 })
  return text
}

async function submitTranscription(apiKey, model, fileUrl) {
  const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model,
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
  if (!taskId) throw Object.assign(new Error(`ASR 响应异常`), { statusCode: 502 })
  return taskId
}

async function pollResult(apiKey, taskId) {
  const startTime = Date.now()
  let interval = 500

  while (Date.now() - startTime < 25000) {
    await new Promise(r => setTimeout(r, interval))

    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    if (!res.ok) throw Object.assign(new Error(`ASR 查询失败: ${res.status}`), { statusCode: 502 })

    const data = await res.json()
    const status = data.output?.task_status

    if (status === 'SUCCEEDED') {
      const url = data.output.results?.[0]?.transcription_url
      if (!url) throw Object.assign(new Error('ASR 结果 URL 缺失'), { statusCode: 502 })
      const r = await fetch(url)
      if (!r.ok) throw Object.assign(new Error('获取转写结果失败'), { statusCode: 502 })
      return await r.json()
    }

    if (status === 'FAILED') {
      throw Object.assign(new Error(`ASR 失败: ${data.output.message || '识别失败'}`), { statusCode: 502 })
    }

    interval = Math.min(interval * 1.5, 2000)
  }

  throw Object.assign(new Error('ASR 超时'), { statusCode: 504 })
}

// --- LLM Service ---

async function callLLM(env, prompt, options = {}) {
  const apiKey = env.LLM_API_KEY
  if (!apiKey) throw Object.assign(new Error('LLM_API_KEY 未配置'), { statusCode: 500 })

  const baseUrl = env.LLM_BASE_URL || 'https://api.deepseek.com/v1'
  const model = env.LLM_MODEL || 'deepseek-chat'
  const {
    systemPrompt = '你是一位资深瑜伽/普拉提/健身私人教练，专门为学员撰写课后评估总结。',
    temperature = 0.7,
    maxTokens = parseInt(env.LLM_MAX_TOKENS || '800', 10)
  } = options

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw Object.assign(new Error(`LLM API 返回 ${res.status}: ${body.slice(0, 200)}`), { statusCode: 502 })
  }

  const data = await res.json()
  if (!data.choices?.[0]?.message?.content) {
    throw Object.assign(new Error('LLM 返回格式异常'), { statusCode: 502 })
  }
  return data.choices[0].message.content.trim()
}

// --- Voice Parser ---

async function parseVoiceText(env, text, context = {}) {
  if (!text || !text.trim()) throw Object.assign(new Error('语音文本为空'), { statusCode: 400 })

  const prompt = buildVoiceParsePrompt(text, context)
  const content = await callLLM(env, prompt, {
    systemPrompt: '你是课程信息提取助手，只输出 JSON，不输出其他内容。',
    temperature: 0.3,
    maxTokens: 500
  })

  let jsonStr = content
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) jsonStr = match[1].trim()

  try {
    return JSON.parse(jsonStr)
  } catch {
    throw Object.assign(new Error('解析结果格式异常，请重试'), { statusCode: 502 })
  }
}

function buildVoiceParsePrompt(text, { memberNames = [], courseTypes = [], locations = [], focusAreaOptions = [], today } = {}) {
  const parts = [
    '你是一个课程信息提取助手。从用户口述内容中提取排课信息，输出纯 JSON。',
    '',
    '字段说明：',
    `- date: YYYY-MM-DD 格式（支持"明天"、"后天"、"下周一"等相对日期，今天是 ${today || new Date().toISOString().slice(0, 10)}）`,
    '- startTime: HH:mm（24小时制）',
    '- duration: 数字（分钟，默认60）',
    '- classMode: "private"（私教）或 "group"（团课）',
    '- memberName: 学员姓名',
    '- courseType: 课程类型',
    '- location: 上课地点',
    '- focusAreas: 训练重点数组',
    '- notes: 其他信息',
    ''
  ]
  if (memberNames.length) parts.push(`已有会员列表（模糊匹配）：${memberNames.join('、')}`)
  if (courseTypes.length) parts.push(`可选课程类型：${courseTypes.join('、')}`)
  if (locations.length) parts.push(`可选地点：${locations.join('、')}`)
  if (focusAreaOptions.length) parts.push(`可选训练重点：${focusAreaOptions.join('、')}`)
  parts.push('', '规则：', '- 未提及的字段输出 null', '- 只输出 JSON 对象，不要 markdown 代码块', '- 会员名称尽量从已有列表中匹配', '')
  parts.push('用户口述内容：', text)
  return parts.join('\n')
}

function buildSummaryPrompt(session, member, history) {
  const courseInfo = [
    `课程类型：${session.courseType || '未知'}`,
    `时长：${session.duration || 60}分钟`,
    session.focusAreas?.length ? `训练重点：${session.focusAreas.join('、')}` : '',
    session.location ? `地点：${session.location}` : ''
  ].filter(Boolean).join('\n')

  const memberInfo = member?.name ? `学员：${member.name}` : '学员信息缺失'

  let historyBlock = ''
  if (history?.length > 0) {
    historyBlock = '该学员近期课程记录：\n' + history.slice(0, 5).map((s, i) => {
      return `${i + 1}. ${s.date || ''} — ${s.courseType || ''}${s.focusAreas?.length ? '（重点：' + s.focusAreas.join('、') + '）' : ''}${s.notes ? ' — 备注：' + s.notes : ''}`
    }).join('\n')
  }

  return [
    '请根据以下信息为学员生成一份专业的课后评估总结。',
    '', '要求：', '- 语气专业但温暖', '- 包含核心内容和训练重点',
    history?.length ? '- 结合历史记录体现进步' : '',
    '- 给出1-2条课后练习建议', '- 150-250字', '- 分段落',
    '', '【本次课程信息】', courseInfo, '', memberInfo, '',
    historyBlock || '无历史课程记录。', '',
    session.notes ? `教练备注：${session.notes}` : ''
  ].filter(Boolean).join('\n')
}

export default app
