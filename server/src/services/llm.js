const LLM_API_KEY = process.env.LLM_API_KEY
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat'
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '800', 10)

export function buildPrompt(session, member, history) {
  const courseInfo = [
    `课程类型：${session.courseType || '未知'}`,
    `时长：${session.duration || 60}分钟`,
    session.focusAreas?.length ? `训练重点：${session.focusAreas.join('、')}` : '',
    session.location ? `地点：${session.location}` : ''
  ].filter(Boolean).join('\n')

  const memberInfo = member?.name ? `学员：${member.name}` : '学员信息缺失'

  let historyBlock = ''
  if (history?.length > 0) {
    const recent = history.slice(0, 5)
    historyBlock = '该学员近期课程记录：\n' + recent.map((s, i) => {
      const date = s.date || ''
      const type = s.courseType || ''
      const focus = (s.focusAreas || []).join('、')
      const notes = s.notes || ''
      return `${i + 1}. ${date} — ${type}${focus ? '（重点：' + focus + '）' : ''}${notes ? ' — 备注：' + notes : ''}`
    }).join('\n')
  }

  const coachNotes = session.notes ? `教练备注：${session.notes}` : ''

  return [
    '请根据以下信息为学员生成一份专业的课后评估总结。',
    '',
    '要求：',
    '- 语气专业但温暖，像教练写给学员的话',
    '- 包含本次课程的核心内容和训练重点',
    history?.length > 0 ? '- 结合学员历史记录，体现纵向对比和进步观察' : '',
    '- 给出1-2条课后练习建议',
    '- 控制在150-250字',
    '- 分段落，易读',
    '',
    '【本次课程信息】',
    courseInfo,
    '',
    memberInfo,
    '',
    historyBlock || '无历史课程记录，这是该学员的第一节课。',
    '',
    coachNotes || '教练未填写额外备注。'
  ].filter(Boolean).join('\n')
}

export async function callLLM(prompt, options = {}) {
  if (!LLM_API_KEY) {
    throw Object.assign(new Error('LLM API Key 未配置，请在 .env 中设置 LLM_API_KEY'), { statusCode: 500 })
  }

  const {
    systemPrompt = '你是一位资深瑜伽/普拉提/健身私人教练，专门为学员撰写课后评估总结。你的文字专业、温暖、有洞察力。',
    temperature = 0.7,
    maxTokens = LLM_MAX_TOKENS
  } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw Object.assign(
        new Error(`LLM API 返回 ${res.status}: ${body.slice(0, 200)}`),
        { statusCode: 502 }
      )
    }

    const data = await res.json()

    if (!data.choices?.[0]?.message?.content) {
      throw Object.assign(new Error('LLM 返回格式异常'), { statusCode: 502 })
    }

    return data.choices[0].message.content.trim()
  } finally {
    clearTimeout(timeout)
  }
}
