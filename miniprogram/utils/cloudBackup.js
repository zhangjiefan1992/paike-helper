const storage = require('./storage')

const BACKUP_KEY = 'pk_backup_fileid'
const BACKUP_TIME_KEY = 'pk_backup_time'
const BACKUP_PATH = 'backups/latest.json'

/**
 * 上传当前数据到云存储
 * 成功后记录 fileID 和备份时间
 * @returns {Promise<{success, fileID?, time?, error?, sessionCount?, memberCount?}>}
 */
function uploadBackup() {
  const data = storage.exportAllData()
  const memberCount = (data.members || []).length
  const sessionCount = (data.sessions || []).length
  const jsonStr = JSON.stringify({
    ...data,
    _meta: {
      backupTime: Date.now(),
      memberCount,
      sessionCount,
      version: 1
    }
  })

  return new Promise((resolve) => {
    const fs = wx.getFileSystemManager()
    const tmpPath = `${wx.env.USER_DATA_PATH}/backup_tmp.json`

    fs.writeFile({
      filePath: tmpPath,
      data: jsonStr,
      encoding: 'utf8',
      success: () => {
        wx.cloud.uploadFile({
          cloudPath: BACKUP_PATH,
          filePath: tmpPath,
          success: (res) => {
            fs.unlink({ filePath: tmpPath })
            const time = Date.now()
            wx.setStorageSync(BACKUP_KEY, res.fileID)
            wx.setStorageSync(BACKUP_TIME_KEY, time)
            resolve({ success: true, fileID: res.fileID, time, memberCount, sessionCount })
          },
          fail: (err) => {
            fs.unlink({ filePath: tmpPath })
            resolve({ success: false, error: err.errMsg || '上传失败' })
          }
        })
      },
      fail: (err) => resolve({ success: false, error: err.errMsg || '写入临时文件失败' })
    })
  })
}

/**
 * 从云端恢复（覆盖本地）
 * @returns {Promise<{success, error?, summary?}>}
 */
function restoreBackup() {
  return new Promise((resolve) => {
    const fileID = wx.getStorageSync(BACKUP_KEY)
    if (!fileID) {
      // 兜底：尝试通过固定 cloudPath 拉取
      pullByCloudPath().then(resolve)
      return
    }
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        const fs = wx.getFileSystemManager()
        try {
          const data = fs.readFileSync(res.tempFilePath, 'utf8')
          const json = JSON.parse(data)
          const result = storage.importData(json)
          resolve({ success: true, summary: result })
        } catch (e) {
          resolve({ success: false, error: '备份数据解析失败' })
        }
      },
      fail: (err) => resolve({ success: false, error: err.errMsg || '下载失败' })
    })
  })
}

/**
 * 通过固定 cloudPath 拉取（用于切换设备恢复）
 */
function pullByCloudPath() {
  return new Promise((resolve) => {
    if (!wx.cloud) return resolve({ success: false, error: '云开发未初始化' })

    // 直接构造 fileID 失败率高，先用 getTempFileURL with cloudPath 是不行的
    // 必须先列出云存储文件，找到 BACKUP_PATH 对应的 fileID
    // 简化：用约定的 fileID 拼接（旧版小程序云存储 fileID 是 cloud://${env}.${envId}-${path}）
    // 但稳妥做法是让用户知道无 fileID 时无法跨设备恢复
    resolve({ success: false, error: '本设备未找到备份记录，请先在原设备备份' })
  })
}

function getLastBackupTime() {
  return wx.getStorageSync(BACKUP_TIME_KEY) || 0
}

function getLastBackupFileID() {
  return wx.getStorageSync(BACKUP_KEY) || ''
}

module.exports = {
  uploadBackup,
  restoreBackup,
  getLastBackupTime,
  getLastBackupFileID
}
