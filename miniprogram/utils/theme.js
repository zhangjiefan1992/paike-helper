const themes = {
  'anime-warm': {
    'color-primary': '#F28B82',
    'color-primary-light': '#FDDDE6',
    'color-primary-dark': '#E06B6B',
    'color-scheduled': '#F28B82',
    'color-completed': '#81C995',
    'color-cancelled': '#CCCCCC',
    'color-noshow': '#FFB74D',
    'bg-page': '#FFF5F3',
    'bg-card': '#FFFFFF',
    'bg-input': '#FFF0EE',
    'text-primary': '#333333',
    'text-secondary': '#888888',
    'text-light': '#BBBBBB'
  },
  'studio-calm': {
    'color-primary': '#4A7C59',
    'color-primary-light': '#E8F0EA',
    'color-primary-dark': '#3A6347',
    'color-accent': '#C2855C',
    'color-scheduled': '#E8C98E',
    'color-completed': '#7BAF8A',
    'color-cancelled': '#D4CEC8',
    'color-noshow': '#E0A89E',
    'bg-page': '#FAF8F5',
    'bg-card': '#FFFFFF',
    'bg-input': '#F5F3EF',
    'bg-hairline': '#E8E4DF',
    'text-primary': '#1C1C1C',
    'text-secondary': '#6B6560',
    'text-muted': '#9E9892'
  }
}

const appThemeTokens = {
  'soft-color': {
    backgroundColor: '#F5F1EA',
    tabBarBackground: '#FFFDF8',
    tabBarColor: '#9A8E82',
    tabBarSelectedColor: '#211B17',
    tabBarBorderStyle: 'white'
  },
  'class-plan': {
    backgroundColor: '#F7F8FC',
    tabBarBackground: '#FBFCFF',
    tabBarColor: '#A8B0C7',
    tabBarSelectedColor: '#182044',
    tabBarBorderStyle: 'white'
  }
}

function getTheme(name) {
  return themes[name] || themes['studio-calm']
}

function getCurrentThemeName() {
  return 'studio-calm'
}

function getWeekThemeName(config) {
  const name = config && (config.weekTheme || config.theme)
  return appThemeTokens[name] ? name : 'soft-color'
}

function getAppThemeTokens(name) {
  return appThemeTokens[name] || appThemeTokens['soft-color']
}

function applyAppTheme(config) {
  const name = getWeekThemeName(config)
  const t = getAppThemeTokens(name)

  wx.setBackgroundColor && wx.setBackgroundColor({
    backgroundColor: t.backgroundColor,
    backgroundColorTop: t.backgroundColor,
    backgroundColorBottom: t.backgroundColor
  })

  wx.setTabBarStyle({
    color: t.tabBarColor,
    selectedColor: t.tabBarSelectedColor,
    backgroundColor: t.tabBarBackground,
    borderStyle: t.tabBarBorderStyle
  })

  return name
}

module.exports = {
  getTheme,
  getCurrentThemeName,
  getWeekThemeName,
  getAppThemeTokens,
  applyAppTheme,
  themes,
  appThemeTokens
}
