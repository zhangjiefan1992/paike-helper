## ADDED Requirements

### Requirement: Week view displays 7-day overview
周视图页面（`pages/week/week`）SHALL 以 7 列等宽 flex 布局展示周一到周日的排课概览。顶部显示当前周日期范围（如"4月21日 - 4月27日"）。每列列头显示星期和日期，今天所在列 SHALL 有高亮底色。

#### Scenario: Display current week
- **WHEN** 用户打开排课 Tab（首页）
- **THEN** 显示包含当天的自然周，7 列布局中每天的课程卡片纵向排列

#### Scenario: Highlight today
- **WHEN** 周视图显示包含今天的周
- **THEN** 今天对应的列头和列区域有区别于其他列的高亮背景色

### Requirement: Week view supports week navigation
周视图 SHALL 支持左右滑动手势切换上/下周，同时顶部提供左右箭头按钮。

#### Scenario: Swipe to next week
- **WHEN** 用户在周视图上向左滑动
- **THEN** 视图切换到下一周，顶部日期范围更新

#### Scenario: Swipe to previous week
- **WHEN** 用户在周视图上向右滑动
- **THEN** 视图切换到上一周，顶部日期范围更新

### Requirement: Week view shows session cards in compact mode
每天的列中 SHALL 纵向排列该天的课程卡片（compact 模式），显示时间、会员名、课程类型。卡片颜色 SHALL 根据状态区分：已约=主色调、已上=灰调+打勾、取消=删除线。每列课程超过 3 条时折叠显示 "+N"。

#### Scenario: Display compact session cards
- **WHEN** 某天有课程记录
- **THEN** 该列显示紧凑模式的课程卡片，每张显示时间、会员名、课程类型

#### Scenario: Fold excess cards
- **WHEN** 某天课程超过 3 条
- **THEN** 显示前 3 条卡片 + "+N" 折叠提示（N 为剩余数量）

### Requirement: Week view shows statistics summary
顶部区域 SHALL 显示本周统计摘要：已排 X 节 / 已完成 X 节 / 取消 X 节。

#### Scenario: Display weekly stats
- **WHEN** 周视图加载完成
- **THEN** 顶部显示本周课程的统计数字（总数、已完成数、取消数）

### Requirement: Week view navigation to other pages
点击列头 SHALL 导航到日视图，点击课程卡片 SHALL 导航到课程编辑页，右下角 FAB 按钮 SHALL 导航到新增课程页。

#### Scenario: Navigate to day view
- **WHEN** 用户点击某天的列头
- **THEN** 跳转到日视图页面，传入该天日期

#### Scenario: Navigate to session edit
- **WHEN** 用户点击某张课程卡片
- **THEN** 跳转到课程编辑页面，传入该课程 ID

#### Scenario: Navigate to new session
- **WHEN** 用户点击右下角 FAB "+" 按钮
- **THEN** 跳转到课程录入页面（新增模式）

### Requirement: Week view empty state
当整周无课程时 SHALL 展示空状态组件，包含动漫风格插画和引导文案"这周还没有排课哦～点击下方 + 开始排课吧"。

#### Scenario: Show empty state
- **WHEN** 当前周没有任何课程记录
- **THEN** 显示空状态组件替代 7 列布局

### Requirement: Week view data refresh
周视图 SHALL 在 `onShow` 生命周期中重新加载数据，确保从其他页面返回时数据最新。

#### Scenario: Refresh on return
- **WHEN** 用户从课程编辑页返回周视图
- **THEN** 周视图重新从 Storage 加载数据并刷新显示
