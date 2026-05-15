const CLOUD_PREFIX = 'photos'

function buildPath(sessionId, type, filename) {
  return `${CLOUD_PREFIX}/${sessionId}/${type}/${filename}`
}

function uploadPhoto(filePath, sessionId, type) {
  return new Promise((resolve, reject) => {
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    const cloudPath = buildPath(sessionId, type, filename)

    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => resolve(res.fileID),
      fail: (err) => reject(err)
    })
  })
}

function uploadPhotos(filePaths, sessionId, type) {
  const tasks = filePaths.map(fp => uploadPhoto(fp, sessionId, type))
  return Promise.all(tasks)
}

function getTempUrl(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        const item = res.fileList[0]
        if (item.tempFileURL) resolve(item.tempFileURL)
        else reject(new Error(item.errMsg || '获取链接失败'))
      },
      fail: reject
    })
  })
}

function getTempUrls(fileIDs) {
  if (!fileIDs.length) return Promise.resolve([])
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: (res) => {
        resolve(res.fileList.map(f => f.tempFileURL || ''))
      },
      fail: reject
    })
  })
}

function deletePhoto(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.deleteFile({
      fileList: [fileID],
      success: resolve,
      fail: reject
    })
  })
}

module.exports = { uploadPhoto, uploadPhotos, getTempUrl, getTempUrls, deletePhoto }
