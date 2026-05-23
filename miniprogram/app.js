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

    // 加载衬线字体（编辑式标题用）
    if (wx.loadFontFace) {
      const tryLoad = (weight) => {
        wx.loadFontFace({
          global: true,
          family: 'EditorialSerif',
          source: `url("https://fonts.gstatic.com/s/fraunces/v37/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.woff2")`,
          desc: { style: 'normal', weight: weight || 400 },
          scopes: ['webview', 'native'],
          success: () => {},
          fail: () => {}
        })
      }
      tryLoad(400)
      tryLoad(300)
      tryLoad(500)
    }
  },

  onHide() {
    if (wx.cloud) {
      cloudBackup.uploadBackup().catch(() => {})
    }
  },

  globalData: {}
})
