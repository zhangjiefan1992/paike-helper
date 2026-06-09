# 微信小程序 AI 排课能力接入设计

日期：2026-06-09

## 背景

微信小程序 AI 开发模式允许开发者把小程序能力封装成独立分包里的 SKILL。微信 AI 后台根据 `mcp.json` 和 `SKILL.md` 理解用户意图，再调度运行在微信客户端独立 JS 环境中的原子接口和原子组件。

排课助手当前小程序端以本地 storage 为主，课程、会员和配置分别存储在 `pk_sessions`、`pk_members`、`pk_config`。官方 API 支持列表确认原子接口可使用 `wx.getStorageSync`、`wx.setStorageSync`、`wx.cloud.callFunction` 和 `wx.request`。因此第一版接入采用本地优先方案，不引入服务端迁移。

## 目标

- 在小程序 AI 对话中支持查看周课表。
- 在小程序 AI 对话中支持批量录入课表，默认先预览确认再写入。
- 在小程序 AI 对话中支持修改课程状态，足够明确且唯一命中时可直接写入。
- 在小程序 AI 对话中支持查看本周统计信息。
- 复用现有本地数据模型和工具函数，优先最快跑通开发者工具和真机预览。

## 非目标

- 不迁移 H5 或小程序数据到服务端。
- 不实现跨设备同步。
- 不复刻完整周视图 UI 到原子组件。
- 不在第一版接入课后总结、AI 备课、语音解析或专业训练建议。
- 不把 beta AI 模式代码直接合入正式审核版本。

## 方案选择

采用单一 `schedule` SKILL，本地优先读写小程序 storage。

备选方案包括本地加服务端混合、仅用页面元数据和短链引导。第一版不采用这些方案，因为当前需求可以通过本地数据闭环完成，且官方建议核心流程尽量在小程序 AI 内闭环，文字链只作为兜底。

## 文件结构

新增独立分包：

```text
miniprogram/agent-packages/schedule-skill/
├── SKILL.md
├── mcp.json
├── index.js
├── apis/
│   ├── getWeekSchedule.js
│   ├── previewImportSchedule.js
│   ├── commitImportSchedule.js
│   ├── updateSessionStatus.js
│   └── getWeekStats.js
└── components/
    ├── week-schedule-card/
    ├── import-preview-card/
    ├── status-result-card/
    └── week-stats-card/
```

`miniprogram/app.json` 增加：

- `subPackages`：声明 `agent-packages` 独立分包。
- `agent.skills`：声明 `schedule` SKILL。
- `agent.instruction`：可选，指向小程序 AI 专用全局提示词文件。
- `agent.pageMetadata`：可选，用于让 AI 在兜底场景生成进入周视图、统计页、课程详情页的文字链。

当前 `lazyCodeLoading: "requiredComponents"` 已存在，满足官方 SKILL 分包要求。

## 原子接口

### getWeekSchedule

用途：响应“看本周课表”“下周有哪些课”“周三有什么课”等查询。

入参：

```json
{
  "weekStart": "YYYY-MM-DD，可选；不传默认当前周周一",
  "date": "YYYY-MM-DD，可选；用户只问某一天时填写"
}
```

行为：

- 读取指定周范围内课程。
- 合并会员名称、课程类型、地点、状态。
- 按日期和开始时间排序。
- 返回轻量结构化数据，并绑定 `week-schedule-card`。

无课程时返回空状态，不报错。

### previewImportSchedule

用途：响应用户粘贴整周或多行课表文本。

入参：

```json
{
  "text": "用户提供的课表文本",
  "clearExisting": false
}
```

行为：

- 复用现有文本解析逻辑。
- 只解析和生成预览，不写入课程。
- 返回成功项、跳过行、错误行、新会员提示和冲突提示。
- 把预览数据写入临时 storage key `pk_ai_import_previews`，生成 `previewToken`。

`previewToken` 有效期 30 分钟。预览数据包含 token、createdAt、sessions、memberDrafts、clearExisting、consumed。

### commitImportSchedule

用途：用户确认上一张导入预览卡后，正式写入课程。

入参：

```json
{
  "previewToken": "previewImportSchedule 返回的 token"
}
```

行为：

- 校验 token 存在、未过期、未消费。
- 可选清理受影响日期的现有课程。
- 写入课程和必要的新会员。
- 标记 token consumed，避免重复导入。
- 返回导入数量、影响日期和失败项。

token 无效、过期或已消费时返回 `isError: true`，不写入。

### updateSessionStatus

用途：响应“把今天 10 点张三标记已上”“周五团课取消”等状态修改。

入参：

```json
{
  "sessionId": "优先使用 getWeekSchedule 返回的真实课程 id",
  "date": "YYYY-MM-DD，可选",
  "startTime": "HH:mm，可选",
  "memberName": "可选",
  "status": "scheduled | completed | cancelled | noshow"
}
```

状态映射固定：

- 已上、完成、上完：`completed`
- 取消、请假：`cancelled`
- 爽约、没来、未到：`noshow`
- 恢复、待上、已约：`scheduled`

直接写入条件：

- 传入真实 `sessionId` 且课程存在。
- 或 `date + startTime` 唯一命中。
- 或 `date + memberName` 唯一命中，且当天该会员只有一节课。

其他情况不写入，返回候选列表，交给 `status-result-card` 引导用户选择。

### getWeekStats

用途：响应“本周统计”“这周上了几节课”“本周完成率”等查询。

入参：

```json
{
  "weekStart": "YYYY-MM-DD，可选；不传默认当前周周一"
}
```

返回：

- 总课程数。
- 已上、取消、爽约、待上数量。
- 私教和团课数量。
- 教学时长。
- 活跃会员数。
- 课程类型分布。
- 与上周课程数差值。

绑定 `week-stats-card`。

## 原子组件

### week-schedule-card

轻量展示指定周的课程摘要：周范围、每日课程数、前几节课程明细。课程条目携带 `sessionId`，便于后续状态修改。卡片关联页面为 `/pages/week/week`。

### import-preview-card

展示批量解析结果：识别成功数量、跳过行、错误行、新会员提示、冲突提示和课程预览。确认按钮使用 `sendFollowUpMessage` 触发 `commitImportSchedule`，并带上 `previewToken`。取消按钮只上行取消意图，不写入。

该组件声明可过期。提交成功后过期旧预览卡，防止重复点击。

### status-result-card

展示状态修改结果或候选课程列表。

- 唯一命中写入成功：显示已修改的课程和新状态。
- 多候选：列出候选按钮，按钮上行 `sessionId + status`。
- 无命中：提示用户补充日期、时间或会员。

### week-stats-card

展示总课数、已上、取消、爽约、教学时长、私教/团课、活跃会员和课程类型分布。卡片关联页面为 `/pages/stats/stats`。

## 数据流

查询课表：

```text
用户自然语言
→ getWeekSchedule
→ 读取 pk_sessions / pk_members
→ 返回 structuredContent
→ 渲染 week-schedule-card
```

批量录入：

```text
用户粘贴课表
→ previewImportSchedule
→ 解析文本并保存临时 previewToken
→ 渲染 import-preview-card
→ 用户确认
→ commitImportSchedule
→ 写入 pk_sessions / pk_members
→ 返回导入结果
```

修改状态：

```text
用户自然语言
→ updateSessionStatus
→ 代码层匹配课程并校验状态
→ 唯一命中则写入；否则返回候选
→ 渲染 status-result-card
```

查看统计：

```text
用户自然语言
→ getWeekStats
→ 读取本周和上周课程
→ 计算统计
→ 渲染 week-stats-card
```

## SKILL.md 规则

`SKILL.md` 描述业务流程和跨接口约束，避免重复接口级描述。

核心规则：

- 用户查询课表时优先调用 `getWeekSchedule`。
- 用户查询统计时调用 `getWeekStats`。
- 用户提供多行课表文本时先调用 `previewImportSchedule`，不得直接声明已导入。
- 只有用户确认预览卡后才能调用 `commitImportSchedule`。
- 用户修改状态时优先使用上下文中的真实 `sessionId`。
- 状态修改未唯一命中时不得写入，应返回候选或追问。
- 写入动作必须以原子接口执行结果为准，未执行成功不得回复“已完成”。

## mcp.json 写法

接口 `description` 用于说明调用时机和不适用场景。字段 `description` 明确取值来源、缺省处理和禁止编造规则。

`content` 返回遵循“事实 + 下一步动作”：

- 成功查询：“已找到 2026-06-08 至 2026-06-14 的 8 节课程。请展示周课表卡片，并用一句话概括本周安排。”
- 预览成功：“已解析出 6 节课程，其中 1 行跳过。请展示导入预览卡片，等待用户确认后再写入。”
- 写入成功：“已成功导入 6 节课程。请告知用户导入完成，并建议查看本周课表核对。”
- 候选状态：“未能唯一确定课程，已返回 3 个候选。请展示候选卡片，让用户选择要修改的课程。”

## 风控与错误处理

- 所有写入接口在代码层校验参数类型和状态枚举。
- 批量导入使用 token 二阶段提交，避免用户粘贴后立即误写入。
- token 过期、已消费或不存在时拒绝写入。
- 状态修改只在唯一命中时直接写入。
- storage 异常返回 `isError: true`，提示用户稍后重试或回小程序页面操作。
- 查询无数据返回空状态卡。
- 解析失败返回错误行和可接受格式示例。
- 冲突课程第一版允许导入，但必须在预览卡显著提示。

## 调试与评测

开发调试使用微信开发者工具 Nightly Electron Build，切换到“小程序 AI 编译”，基础库使用 3.16.1。真机预览使用微信 8.0.74 及以上，并优先在 iOS 测试。

手测用例：

1. 看本周课表。
2. 看下周课表。
3. 周三有什么课。
4. 本周统计。
5. 这周上了几节。
6. 粘贴 3 行课表并确认导入。
7. 粘贴含错误行的课表。
8. 把今天 10 点张三标记已上。
9. 把周五团课取消。
10. 把明天的课标记已上，应返回候选或追问。
11. 恢复刚才那节课为待上。
12. 重复点击旧导入确认卡，应拒绝。

后续可接入官方 `wxa-skills-validate` 和 `wxa-skills-eval`，补充自定义评测集。

## 发布策略

当前官方文档标注小程序 AI 开发模式仍为 beta，且暂未开放代码提审。第一版应放在独立开发分支中，用于开发者工具和真机预览验证。正式发布版本保留无 AI 分包构建方式，避免影响小程序审核。

## 参考资料

- 微信小程序 AI 能力介绍：https://developers.weixin.qq.com/miniprogram/dev/ai/guide.html
- 微信小程序 AI 接入方式：https://developers.weixin.qq.com/miniprogram/dev/ai/integration.html
- 微信小程序 AI 运行机制：https://developers.weixin.qq.com/miniprogram/dev/ai/operating-mechanism.html
- 微信小程序 AI API 支持列表：https://developers.weixin.qq.com/miniprogram/dev/ai/reference/api.html
- 既有调研产物：`/Users/jeff/.qoderwork/workspace/mq584giv7ozdby0l/outputs/wechat-miniprogram-ai-analysis.md`
