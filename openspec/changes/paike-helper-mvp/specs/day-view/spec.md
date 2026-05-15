## ADDED Requirements

### Requirement: Day view displays time-axis layout
日视图页面（`pages/day/day`）SHALL 以时间轴形式展示当天排课。左侧为时间刻度（按可排课时间段，如 08:00-21:00），右侧对应时间位置显示课程卡片。每小时高度 120rpx，课程卡片绝对定位在对应时间位置。

#### Scenario: Display day schedule
- **WHEN** 用户从周视图点击某天进入日视图
- **THEN** 页面显示该天的时间轴，左侧时间刻度 80rpx 宽，已有课程在对应时间位置显示完整信息卡片

#### Scenario: Show current time line
- **WHEN** 日视图显示的是今天
- **THEN** 在当前时间位置显示红色水平线

### Requirement: Day view session card shows full info
日视图中的课程卡片 SHALL 展示完整信息：时间、时长、会员名、课程类型、地点、状态。

#### Scenario: Full info card display
- **WHEN** 当天有一节课程
- **THEN** 卡片显示该课程的时间段、会员名称、课程类型、地点和当前状态

### Requirement: Day view supports swipe actions on cards
课程卡片 SHALL 支持向左滑动露出快捷操作按钮："已上完"和"取消"。点击后 SHALL 调用 `updateSessionStatus` 更新状态并提供 Toast + 振动反馈。

#### Scenario: Swipe to mark completed
- **WHEN** 用户向左滑动课程卡片并点击"已上完"按钮
- **THEN** 该课程状态更新为 `completed`，卡片视觉变为完成态，显示 Toast 提示并触发微振动

#### Scenario: Swipe to cancel
- **WHEN** 用户向左滑动课程卡片并点击"取消"按钮
- **THEN** 该课程状态更新为 `cancelled`，卡片视觉变为取消态

### Requirement: Day view supports day navigation
日视图 SHALL 支持左右滑动手势切换前/后一天。顶部显示当前日期和星期。

#### Scenario: Swipe to next day
- **WHEN** 用户向左滑动
- **THEN** 切换到后一天的日视图

#### Scenario: Swipe to previous day
- **WHEN** 用户向右滑动
- **THEN** 切换到前一天的日视图

### Requirement: Day view quick add from empty slot
点击空白时间段 SHALL 导航到课程录入页，自动填入对应日期和时间。

#### Scenario: Tap empty time slot
- **WHEN** 用户点击日视图中未排课的时间段（如 10:00）
- **THEN** 跳转到课程录入页面，日期预填为当天，时间预填为 10:00

### Requirement: Day view tap card to edit
点击课程卡片 SHALL 导航到课程编辑页。

#### Scenario: Tap card to edit
- **WHEN** 用户点击一张课程卡片
- **THEN** 跳转到课程编辑页面，传入该课程 ID
