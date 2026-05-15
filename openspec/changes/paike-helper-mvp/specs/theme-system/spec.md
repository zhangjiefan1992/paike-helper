## ADDED Requirements

### Requirement: Global CSS variables define theme
`app.wxss` 的 `page` 选择器 SHALL 定义完整的 CSS 变量集，覆盖颜色（主色、状态色）、背景、文字、圆角、阴影、间距、字号。所有页面和组件 SHALL 通过 `var()` 引用这些变量，不硬编码颜色值。

#### Scenario: Theme variables available globally
- **WHEN** 任意页面或组件的 WXSS 使用 `var(--color-primary)`
- **THEN** 渲染为 `app.wxss` 中定义的主色调值 `#F28B82`

#### Scenario: Status colors differentiated
- **WHEN** 课程状态分别为 scheduled、completed、cancelled、noshow
- **THEN** 对应使用 `--color-scheduled`(#F28B82)、`--color-completed`(#81C995)、`--color-cancelled`(#CCCCCC)、`--color-noshow`(#FFB74D)

### Requirement: Anime-warm default theme
第一版默认主题"动漫暖系"SHALL 体现柔和、温暖、圆润的视觉风格。主色调为珊瑚粉 `#F28B82`，页面背景为暖白 `#FFF5F3`，大圆角（12-16px / 24-32rpx），轻盈投影。

#### Scenario: Visual warmth
- **WHEN** 用户打开小程序
- **THEN** 整体视觉为暖色系，背景柔和，卡片圆角明显，阴影轻盈

### Requirement: Theme module supports future extension
`utils/theme.js` SHALL 导出主题配置管理功能。第一版仅实现 `anime-warm` 一套主题。架构 SHALL 预留通过 `app.js` 的 `onLaunch` 动态注入 CSS 变量覆盖来切换主题的能力。

#### Scenario: Get current theme
- **WHEN** 调用 theme 模块获取当前主题
- **THEN** 返回 `'anime-warm'` 主题标识

### Requirement: Navigation bar and tab bar themed
导航栏背景色 SHALL 为 `#F28B82`，文字色为白色。TabBar 选中色 SHALL 为 `#F28B82`，未选中色为 `#999999`。

#### Scenario: Themed navigation
- **WHEN** 用户查看小程序导航栏和底部 TabBar
- **THEN** 导航栏为珊瑚粉背景白字，TabBar 选中项为珊瑚粉色
