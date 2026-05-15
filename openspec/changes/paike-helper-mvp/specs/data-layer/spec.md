## ADDED Requirements

### Requirement: Storage module provides Member CRUD operations
`utils/storage.js` SHALL export `getMembers()`、`getMemberById(id)`、`saveMember(member)`、`deleteMember(id)` 四个函数，操作 Storage Key `pk_members`。`saveMember` 根据是否已存在相同 `id` 的记录自动决定新增或更新，更新时 SHALL 设置 `updatedAt` 为当前时间戳。

#### Scenario: Get all members
- **WHEN** 调用 `getMembers()`
- **THEN** 返回 `pk_members` 中存储的完整 `Member[]` 数组，若不存在则返回空数组

#### Scenario: Save new member
- **WHEN** 调用 `saveMember(member)` 且 `member.id` 在 `pk_members` 中不存在
- **THEN** 将该 member 追加到数组末尾并写入 Storage

#### Scenario: Update existing member
- **WHEN** 调用 `saveMember(member)` 且 `member.id` 在 `pk_members` 中已存在
- **THEN** 替换对应记录，`updatedAt` 设置为当前时间戳

#### Scenario: Delete member
- **WHEN** 调用 `deleteMember(id)`
- **THEN** 从 `pk_members` 中移除该 `id` 对应的记录

### Requirement: Storage module provides Session CRUD operations
`utils/storage.js` SHALL export `getSessions()`、`getSessionById(id)`、`getSessionsByDate(date)`、`getSessionsByDateRange(start, end)`、`getSessionsByMemberId(memberId)`、`saveSession(session)`、`deleteSession(id)`、`updateSessionStatus(id, status)` 函数，操作 Storage Key `pk_sessions`。

#### Scenario: Get sessions by date
- **WHEN** 调用 `getSessionsByDate('2026-04-24')`
- **THEN** 返回 `date` 字段等于 `'2026-04-24'` 的所有 Session，按 `startTime` 升序排列

#### Scenario: Get sessions by date range
- **WHEN** 调用 `getSessionsByDateRange('2026-04-21', '2026-04-27')`
- **THEN** 返回 `date` 在该范围内（含起止日）的所有 Session

#### Scenario: Get sessions by member
- **WHEN** 调用 `getSessionsByMemberId(memberId)`
- **THEN** 返回 `memberId` 字段匹配或 `memberIds` 数组包含该 ID 的所有 Session，按 `date` 倒序排列

#### Scenario: Quick status update
- **WHEN** 调用 `updateSessionStatus(id, 'completed')`
- **THEN** 仅更新该 Session 的 `status` 字段为 `'completed'`，同时更新 `updatedAt`

### Requirement: Storage module provides Config operations
`utils/storage.js` SHALL export `getConfig()` 和 `saveConfig(config)` 函数，操作 Storage Key `pk_config`。`getConfig()` 在无存储数据时 SHALL 返回 `data/defaultConfig.js` 中定义的默认配置。

#### Scenario: Get config with defaults
- **WHEN** `pk_config` 不存在于 Storage 中时调用 `getConfig()`
- **THEN** 返回默认配置对象，包含 `courseTypes`、`locations`、`focusAreaOptions`、`defaultDuration`、`theme`、`workingHours`

#### Scenario: Save config
- **WHEN** 调用 `saveConfig(config)`
- **THEN** 将完整配置对象写入 `pk_config`

### Requirement: Storage module provides data export and import
`utils/storage.js` SHALL export `exportAllData()` 和 `importData(jsonData)` 函数。导出 SHALL 包含 `{ members, sessions, config, exportTime, version }` 结构。导入 SHALL 校验 JSON 结构的必要字段后覆盖本地数据。

#### Scenario: Export all data
- **WHEN** 调用 `exportAllData()`
- **THEN** 返回包含所有 members、sessions、config 以及 `exportTime`（当前时间戳）和 `version`（'1.0.0'）的对象

#### Scenario: Import valid data
- **WHEN** 调用 `importData(jsonData)` 且 jsonData 包含有效的 `members` 和 `sessions` 数组
- **THEN** 覆盖本地 `pk_members`、`pk_sessions`、`pk_config`，返回 `{ success: true, message: '导入成功' }`

#### Scenario: Import invalid data
- **WHEN** 调用 `importData(jsonData)` 且 jsonData 缺少 `members` 或 `sessions` 字段
- **THEN** 不修改本地数据，返回 `{ success: false, message: '数据格式无效' }`

### Requirement: Date utility module
`utils/dateUtil.js` SHALL export `getWeekRange(date)`、`formatDate(date, format)`、`getWeekday(dateStr)`、`addDays(dateStr, n)`、`isToday(dateStr)`、`getMonthLabel(dateStr)` 函数。

#### Scenario: Get week range
- **WHEN** 调用 `getWeekRange(new Date('2026-04-24'))`
- **THEN** 返回包含该周周一到周日的 `{ start, end, days: [{date, weekday, isToday}] }` 对象

#### Scenario: Format date
- **WHEN** 调用 `formatDate(new Date('2026-04-24'), 'MM月DD日')`
- **THEN** 返回 `'04月24日'`

### Requirement: ID generator module
`utils/idGenerator.js` SHALL export生成唯一 ID 的函数。会员 ID 格式为 `'m_' + timestamp + random`，课程 ID 格式为 `'s_' + timestamp + random`。

#### Scenario: Generate member ID
- **WHEN** 调用生成会员 ID 的函数
- **THEN** 返回以 `'m_'` 开头的唯一字符串

#### Scenario: Generate session ID
- **WHEN** 调用生成课程 ID 的函数
- **THEN** 返回以 `'s_'` 开头的唯一字符串

### Requirement: Default config module
`data/defaultConfig.js` SHALL 导出默认预设配置对象，包含 `courseTypes: ['瑜伽', '普拉提', '体能训练', '拉伸放松']`、`locations: []`、`focusAreaOptions: ['核心', '髋关节', '肩颈', '下肢', '上肢', '全身', '平衡', '柔韧']`、`defaultDuration: 60`、`theme: 'anime-warm'`、`workingHours: { start: '08:00', end: '21:00' }`。

#### Scenario: Default config values
- **WHEN** 导入 `data/defaultConfig.js`
- **THEN** 获得包含上述所有字段和默认值的配置对象

### Requirement: App initialization
`app.js` 的 `onLaunch` SHALL 检查 `pk_config` 是否存在，若不存在则写入默认配置。SHALL 移除模板代码中的 logs 存储和 `wx.login` 逻辑。

#### Scenario: First launch initialization
- **WHEN** 用户首次打开小程序，`pk_config` 不存在
- **THEN** `onLaunch` 将默认配置写入 `pk_config`
