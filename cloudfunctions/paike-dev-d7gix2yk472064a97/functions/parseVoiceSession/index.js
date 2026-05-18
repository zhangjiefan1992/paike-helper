const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

function buildPrompt(text, memberNames, courseTypes, locations, focusAreaOptions, today) {
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

exports.main = async (event) => {
  const { text, memberNames = [], courseTypes = [], locations = [], focusAreaOptions = [], today } = event

  if (!text || !text.trim()) {
    return { success: false, error: '语音文本为空' }
  }

  if (!DEEPSEEK_API_KEY) {
    return { success: false, error: 'DeepSeek API Key 未配置' }
  }

  const prompt = buildPrompt(text, memberNames, courseTypes, locations, focusAreaOptions, today)

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是课程信息提取助手，只输出 JSON，不输出其他内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    const result = await response.json()

    if (!result.choices || !result.choices.length) {
      return { success: false, error: 'LLM 返回格式异常' }
    }

    const content = result.choices[0].message.content.trim()

    // 尝试解析 JSON（兼容 LLM 可能包裹的 ```json ``` 块）
    let jsonStr = content
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    const data = JSON.parse(jsonStr)

    return { success: true, data }
  } catch (err) {
    console.error('parseVoiceSession error:', err)

    if (err instanceof SyntaxError) {
      return { success: false, error: '解析结果格式异常，请重试' }
    }

    return { success: false, error: err.message || '未知错误' }
  }
}
