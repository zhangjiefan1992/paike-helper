## ADDED Requirements

### Requirement: Settings page layout
设置页面（`pages/settings/settings`）SHALL 分为四个区域：预设管理、数据管理、主题（预留）、关于。

#### Scenario: Display settings sections
- **WHEN** 用户点击"我的" Tab
- **THEN** 页面显示预设管理、数据管理、主题、关于四个分区

### Requirement: Preset management
预设管理区域 SHALL 允许用户编辑课程类型列表、地点列表、训练重点列表。每个列表支持添加新项和删除已有项。还 SHALL 支持修改默认课程时长和可排课时间段。

#### Scenario: Add course type
- **WHEN** 用户在课程类型列表中输入"康复训练"并确认
- **THEN** "康复训练"被添加到 `config.courseTypes` 列表并保存

#### Scenario: Delete location
- **WHEN** 用户点击某地点旁的删除按钮
- **THEN** 该地点从 `config.locations` 中移除并保存

#### Scenario: Change default duration
- **WHEN** 用户将默认时长从 60 改为 90
- **THEN** `config.defaultDuration` 更新为 90

#### Scenario: Change working hours
- **WHEN** 用户将可排课时间段修改为 09:00-20:00
- **THEN** `config.workingHours` 更新为 `{ start: '09:00', end: '20:00' }`

### Requirement: Data export
数据导出 SHALL 将全量数据导出为 JSON 文件，通过 `wx.shareFileMessage` 发送到微信聊天。文件名格式为 `paike-backup-YYYY-MM-DD.json`。

#### Scenario: Export data
- **WHEN** 用户点击"导出数据"按钮
- **THEN** 系统生成 JSON 备份文件并调用微信分享文件接口，用户可选择发送给好友或保存到文件

### Requirement: Data import
数据导入 SHALL 允许用户通过 `wx.chooseMessageFile` 选择 JSON 文件。选择后 SHALL 先弹出确认弹窗"导入将覆盖现有数据，是否继续？"，用户确认后解析并覆盖本地数据。

#### Scenario: Import data with confirmation
- **WHEN** 用户点击"导入数据"并选择了一个 JSON 文件
- **THEN** 弹出确认弹窗，用户确认后解析文件并覆盖本地数据，显示 Toast "导入成功"

#### Scenario: Import invalid file
- **WHEN** 用户选择的文件不是有效的排课助手备份文件
- **THEN** 显示 Toast "数据格式无效，请选择正确的备份文件"

### Requirement: Theme entry placeholder
主题区域 SHALL 显示预留入口，灰显文字"更多主题即将上线"，不可点击。

#### Scenario: Theme placeholder
- **WHEN** 用户查看设置页的主题区域
- **THEN** 看到灰色的"更多主题即将上线"提示

### Requirement: About section
关于区域 SHALL 显示版本号 v1.0.0。

#### Scenario: Display version
- **WHEN** 用户查看设置页的关于区域
- **THEN** 显示版本号 "v1.0.0"
