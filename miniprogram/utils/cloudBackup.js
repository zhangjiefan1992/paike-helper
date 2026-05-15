const storage = require('./storage')

const BACKUP_KEY = 'pk_backup_fileid'
const BACKUP_PATH = 'backups/latest.json'

function uploadBackup() {
  const data = storage.exportAllData()
  const jsonStr = JSON.stringify(data)

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
            wx.setStorageSync(BACKUP_KEY, res.fileID)
            resolve(res.fileID)
          },
          fail: () => {
            fs.unlink({ filePath: tmpPath })
            resolve(null)
          }
        })
      },
      fail: () => resolve(null)
    })
  })
}

function restoreBackup() {
  return new Promise((resolve, reject) => {
    const fileID = wx.getStorageSync(BACKUP_KEY)
    if (!fileID) {
      reject(new Error('没有可恢复的备份'))
      return
    }
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        const fs = wx.getFileSystemManager()
        const data = fs.readFileSync(res.tempFilePath, 'utf8')
        try {
          const json = JSON.parse(data)
          const result = storage.importData(json)
          resolve(result)
        } catch (e) {
          reject(new Error('备份数据解析失败'))
        }
      },
      fail: reject
    })
  })
}

module.exports = { uploadBackup, restoreBackup }
