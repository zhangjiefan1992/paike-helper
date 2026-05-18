import { buildPrompt, callLLM } from '../services/llm.js'
import { recognizeSpeech } from '../services/asr.js'
import { parseVoiceText } from '../services/voiceParser.js'

const summarySchema = {
  body: {
    type: 'object',
    required: ['session'],
    properties: {
      session: {
        type: 'object',
        properties: {
          courseType: { type: 'string' },
          duration: { type: 'number' },
          focusAreas: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          notes: { type: 'string' }
        }
      },
      member: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      },
      history: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            courseType: { type: 'string' },
            focusAreas: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' }
          }
        }
      }
    }
  }
}

export default async function aiRoutes(app) {
  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.url === '/summary') {
      routeOptions.config = { rateLimit: { max: 10, timeWindow: '1 minute' } }
    }
    if (routeOptions.url === '/voice-session') {
      routeOptions.config = { rateLimit: { max: 5, timeWindow: '1 minute' } }
    }
    if (routeOptions.url === '/parse-text') {
      routeOptions.config = { rateLimit: { max: 15, timeWindow: '1 minute' } }
    }
  })

  app.post('/summary', { schema: summarySchema }, async (req, reply) => {
    const { session, member, history } = req.body

    try {
      const prompt = buildPrompt(session, member || {}, history || [])
      const text = await callLLM(prompt)
      return { code: 0, data: { text } }
    } catch (err) {
      req.log.error(err)
      const status = err.statusCode || 500
      const code = status === 502 ? 50201 : 50000
      reply.status(status)
      return { code, message: err.message }
    }
  })

  app.post('/parse-text', async (req, reply) => {
    const { text, context = {} } = req.body || {}

    if (!text || !text.trim()) {
      reply.status(400)
      return { code: 40001, message: '请输入排课内容' }
    }

    try {
      const data = await parseVoiceText(text.trim(), context)
      return { code: 0, data: { ...data, rawText: text.trim() } }
    } catch (err) {
      req.log.error(err)
      const status = err.statusCode || 500
      reply.status(status)
      return { code: status === 400 ? 40000 : 50203, message: err.message }
    }
  })

  app.post('/voice-session', async (req, reply) => {
    let audioBuffer
    let context = {}

    const parts = req.parts()
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'audio') {
        audioBuffer = await part.toBuffer()
      } else if (part.type === 'field' && part.fieldname === 'context') {
        try { context = JSON.parse(part.value) } catch {}
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      reply.status(400)
      return { code: 40001, message: '未收到音频文件' }
    }

    try {
      const rawText = await recognizeSpeech(audioBuffer, 'wav', 16000)
      if (!rawText) {
        reply.status(400)
        return { code: 40002, message: '语音识别结果为空，请重试' }
      }

      const data = await parseVoiceText(rawText, context)
      return { code: 0, data: { ...data, rawText } }
    } catch (err) {
      req.log.error(err)
      const status = err.statusCode || 500
      reply.status(status)
      return { code: status === 400 ? 40000 : 50202, message: err.message }
    }
  })
}
