const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { content } = event
  if (!content || !content.trim()) {
    return { success: false, error: '内容为空' }
  }

  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  try {
    await db.collection('feedback').add({
      data: {
        content: content.trim(),
        openid: OPENID,
        createdAt: db.serverDate(),
        systemInfo: event.systemInfo || {}
      }
    })
    return { success: true }
  } catch (err) {
    if (err.errCode === -502005) {
      await db.createCollection('feedback')
      await db.collection('feedback').add({
        data: {
          content: content.trim(),
          openid: OPENID,
          createdAt: db.serverDate(),
          systemInfo: event.systemInfo || {}
        }
      })
      return { success: true }
    }
    return { success: false, error: err.message }
  }
}
