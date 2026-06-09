const storage = require('./utils/storage')
const cloudBackup = require('./utils/cloudBackup')

App({
  onLaunch() {
    const config = wx.getStorageSync('pk_config')
    if (!config) {
      const defaultConfig = require('./data/defaultConfig')
      storage.saveConfig(Object.assign({}, defaultConfig))
    }

    if (wx.cloud) {
      wx.cloud.init({
        env: 'paike-dev-d7gix2yk472064a97',
        traceUser: true
      })
    }

    // 衬线字体：使用系统自带衬线体，不远程加载
  },

  onHide() {
    if (wx.cloud) {
      cloudBackup.uploadBackup().catch(() => {})
    }
  },

  globalData: {}
})
