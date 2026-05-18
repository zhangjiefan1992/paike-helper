import { callLLM } from './llm.js'

function buildVoiceParsePrompt(text, { memberNames = [], courseTypes = [], locations = [], focusAreaOptions = [], today }) {
  const parts = [
    '你是一个课程信息提取助手。从用户口述内容中提取排课信息，输出纯 JSON。',
    '',
    '字段说明：',
    `- date: YYYY-MM-DD 格式（支持"明天"、"后天"、"下周一"等相对日期，今天是 ${today}）`,
    '- startTime: HH:mm（24小时制，如"上午十点"→"10:00"，"下午两点半"→"14:30"）',
    '- duration: 数字（分钟，默认60）',
    '- classMode: "private"（私教）或 "group"（团课）',
    '- memberName: 学员姓名',
    '- courseType: 课程类型',
    '- location: 上课地点',
    '- focusAreas: 训练重点数组',
    '- notes: 其他信息',
    ''
  ]

  if (memberNames.length > 0) {
    parts.push(`已有会员列表（模糊匹配）：${memberNames.join('、')}`)
  }
  if (courseTypes.length > 0) {
    parts.push(`可选课程类型：${courseTypes.join('、')}`)
  }
  if (locations.length > 0) {
    parts.push(`可选地点：${locations.join('、')}`)
  }
  if (focusAreaOptions.length > 0) {
    parts.push(`可选训练重点：${focusAreaOptions.join('、')}`)
  }

  parts.push('')
  parts.push('规则：')
  parts.push('- 未提及的字段输出 null')
  parts.push('- 只输出 JSON 对象，不要 markdown 代码块，不要其他解释文字')
  parts.push('- 会员名称尽量从已有列表中匹配（支持简称/昵称）')
  parts.push('- 课程类型尽量从可选列表中匹配')
  parts.push('')
  parts.push('用户口述内容：')
  parts.push(text)

  return parts.join('\n')
}

export async function parseVoiceText(text, context = {}) {
  if (!text || !text.trim()) {
    throw Object.assign(new Error('语音文本为空'), { statusCode: 400 })
  }

  const prompt = buildVoiceParsePrompt(text, context)

  const content = await callLLM(prompt, {
    systemPrompt: '你是课程信息提取助手，只输出 JSON，不输出其他内容。',
    temperature: 0.3,
    maxTokens: 500
  })

  let jsonStr = content
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  try {
    return JSON.parse(jsonStr)
  } catch {
    throw Object.assign(new Error('解析结果格式异常，请重试'), { statusCode: 502 })
  }
}
