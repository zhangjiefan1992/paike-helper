const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

exports.main = async (event) => {
  const { prompt, sessionId } = event

  if (!prompt) {
    return { error: 'missing prompt', text: '' }
  }

  if (!DEEPSEEK_API_KEY) {
    return { error: 'DeepSeek API Key 未配置', text: '' }
  }

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
            content: '你是一位资深瑜伽/普拉提/健身私人教练，专门为学员撰写课后评估总结。你的文字专业、温暖、有洞察力。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    })

    const result = await response.json()

    if (result.choices && result.choices.length > 0) {
      return {
        text: result.choices[0].message.content.trim(),
        sessionId
      }
    }

    return {
      error: 'DeepSeek API 返回格式异常',
      text: '',
      raw: result
    }
  } catch (err) {
    console.error('generateSummary error:', err)
    return {
      error: err.message || '未知错误',
      text: ''
    }
  }
}
