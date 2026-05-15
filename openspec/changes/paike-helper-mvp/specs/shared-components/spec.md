## ADDED Requirements

### Requirement: Session card component
`components/session-card/` SHALL 为可复用自定义组件，接收 `session`（Object）、`memberName`（String）、`compact`（Boolean）三个 properties。compact=true 时仅显示时间+会员名+课程类型（周视图用），compact=false 时显示完整信息（日视图用）。

#### Scenario: Compact mode display
- **WHEN** session-card 的 compact 属性为 true
- **THEN** 卡片仅显示课程时间、会员名称、课程类型，视觉紧凑

#### Scenario: Full mode display
- **WHEN** session-card 的 compact 属性为 false
- **THEN** 卡片显示时间、时长、会员名、课程类型、地点、状态

#### Scenario: Status visual differentiation
- **WHEN** session 的 status 分别为 scheduled、completed、cancelled
- **THEN** 卡片左边框颜色对应 `--color-scheduled`、`--color-completed`、`--color-cancelled`；completed 状态整体降低不透明度并显示打勾图标

### Requirement: Session card emits events
session-card SHALL 通过 `triggerEvent` 触发 `tap`、`complete`、`cancel` 三个事件。

#### Scenario: Tap event
- **WHEN** 用户点击课程卡片
- **THEN** 触发 `tap` 事件，携带 session id

#### Scenario: Complete and cancel events
- **WHEN** 用户通过左滑操作点击"已上完"或"取消"按钮
- **THEN** 分别触发 `complete` 或 `cancel` 事件，携带 session id

### Requirement: Empty state component
`components/empty-state/` SHALL 为可复用组件，接收 `image`（String，插画路径）、`title`（String）、`subtitle`（String）三个 properties。居中显示插画图片、主标题和副标题。

#### Scenario: Display empty state
- **WHEN** 页面使用 empty-state 组件并传入 image、title、subtitle
- **THEN** 居中显示插画、标题和副标题文字

### Requirement: Tag component
`components/tag/` SHALL 为可复用组件，接收 `text`（String）、`selected`（Boolean）、`closable`（Boolean）三个 properties。通过 `triggerEvent` 触发 `tap` 和 `close` 事件。

#### Scenario: Selected state
- **WHEN** tag 的 selected 为 true
- **THEN** 标签显示选中态（主色调背景 + 白字）

#### Scenario: Unselected state
- **WHEN** tag 的 selected 为 false
- **THEN** 标签显示默认态（浅色背景 + 深色字）

#### Scenario: Closable mode
- **WHEN** tag 的 closable 为 true
- **THEN** 标签右侧显示 "×" 关闭按钮，点击触发 `close` 事件

### Requirement: Member avatar component
`components/member-avatar/` SHALL 为可复用组件，接收 `src`（String，头像路径）和 `size`（String，如 'small'/'medium'/'large'）。当 src 为空时显示默认头像。

#### Scenario: Display avatar
- **WHEN** member-avatar 传入有效 src
- **THEN** 显示该图片，大小由 size 决定

#### Scenario: Default avatar
- **WHEN** member-avatar 的 src 为空或不传
- **THEN** 显示默认占位头像
