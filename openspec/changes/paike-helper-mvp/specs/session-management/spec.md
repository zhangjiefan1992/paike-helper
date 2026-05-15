## ADDED Requirements

### Requirement: Session form supports create and edit modes
课程录入/编辑页面（`pages/session/session`）SHALL 支持两种模式：新增（无 `id` 参数）和编辑（URL 带 `id` 参数）。编辑模式 SHALL 预填现有数据。

#### Scenario: Create mode
- **WHEN** 用户导航到 `/pages/session/session`（无 id 参数）
- **THEN** 显示空白表单，日期默认今天，时长默认 60 分钟，状态默认"已约"

#### Scenario: Create mode with prefilled date and time
- **WHEN** 用户导航到 `/pages/session/session?date=2026-04-24&time=10:00`
- **THEN** 日期预填为 2026-04-24，时间预填为 10:00

#### Scenario: Edit mode
- **WHEN** 用户导航到 `/pages/session/session?id=s_xxx`
- **THEN** 从 Storage 加载该课程数据并预填所有字段

### Requirement: Session form includes all required fields
表单 SHALL 包含以下字段：日期选择器、时间选择器、时长选择（45/60/90 分钟快捷按钮）、授课模式切换（私教/团课）、课程类型选择、地点选择、状态选择、课后备注、训练重点多选、照片添加（最多 9 张）。

#### Scenario: Duration quick select
- **WHEN** 用户点击"60分钟"快捷按钮
- **THEN** 时长设置为 60，该按钮高亮显示

#### Scenario: Class mode switch
- **WHEN** 用户切换授课模式为"团课"
- **THEN** 会员选择从单选变为多选模式

#### Scenario: Course type from preset
- **WHEN** 表单加载
- **THEN** 课程类型从 Config 的 `courseTypes` 渲染为可选标签列表，末尾有"+ 自定义"入口

#### Scenario: Add photos
- **WHEN** 用户点击添加照片
- **THEN** 调用 `wx.chooseMedia` 选择图片，选中的图片缩略图横向展示，最多 9 张

### Requirement: Session form validates required fields
保存前 SHALL 校验：日期、时间、课程类型为必填；私教模式下 `memberId` 必填。校验不通过时显示 Toast 提示具体缺失字段。

#### Scenario: Missing required field
- **WHEN** 用户未选择课程类型就点击保存
- **THEN** 显示 Toast "请选择课程类型"，不执行保存

#### Scenario: Private mode missing member
- **WHEN** 授课模式为私教且未选择会员时点击保存
- **THEN** 显示 Toast "私教课程请选择会员"

### Requirement: Session form detects time conflicts
保存时 SHALL 检测同一日期、同一时间段是否已有其他课程（时间重叠）。如有冲突 SHALL 以 Toast 提醒用户，但不阻断保存。

#### Scenario: Time conflict detected
- **WHEN** 用户保存的课程与已有课程在同一天同一时段有重叠
- **THEN** 显示 Toast "该时段已有课程安排"，用户可选择继续保存

### Requirement: Session save and delete with feedback
保存 SHALL 调用 `storage.saveSession()` 后执行 `wx.navigateBack()`，并提供 Toast + `wx.vibrateShort()` 反馈。删除 SHALL 先弹出二次确认弹窗，确认后调用 `storage.deleteSession()` 并返回。

#### Scenario: Save session
- **WHEN** 用户填写完表单并点击保存
- **THEN** 数据写入 Storage，显示 Toast "保存成功"，触发微振动，自动返回上一页

#### Scenario: Delete session with confirmation
- **WHEN** 用户在编辑模式点击"删除此课程"
- **THEN** 弹出确认弹窗"确定删除此课程？"，用户确认后删除数据并返回上一页
