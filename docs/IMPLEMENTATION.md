# 排课助手 — 研发实施计划

> 关联文档：[PRD](./PRD.md)  
> 技术栈：微信小程序原生（JS）  
> 项目目录：`/Users/jeff/WeChatProjects/paike-helper`  
> AppID（测试号）：`wxec7783fbf92910fd`  
> 日期：2026-04-24

---

## 一、项目结构规划

```
paike-helper/
├── app.js                    # 应用入口，初始化数据层
├── app.json                  # 全局配置（页面路由、TabBar、窗口）
├── app.wxss                  # 全局样式 + 主题变量
├── docs/
│   ├── PRD.md                # 产品需求文档
│   └── IMPLEMENTATION.md     # 本文件
├── utils/
│   ├── storage.js            # 本地存储封装（CRUD 操作）
│   ├── dateUtil.js           # 日期工具函数
│   ├── idGenerator.js        # 唯一 ID 生成
│   └── theme.js              # 主题配置管理
├── data/
│   └── defaultConfig.js      # 默认预设配置（课程类型、地点等）
├── pages/
│   ├── week/                 # 周视图（首页 Tab）
│   │   ├── week.js
│   │   ├── week.wxml
│   │   ├── week.wxss
│   │   └── week.json
│   ├── day/                  # 日视图
│   │   ├── day.js
│   │   ├── day.wxml
│   │   ├── day.wxss
│   │   └── day.json
│   ├── session/              # 课程录入/编辑
│   │   ├── session.js
│   │   ├── session.wxml
│   │   ├── session.wxss
│   │   └── session.json
│   ├── members/              # 会员列表（Tab）
│   │   ├── members.js
│   │   ├── members.wxml
│   │   ├── members.wxss
│   │   └── members.json
│   ├── member-detail/        # 会员详情 + 时间轴
│   │   ├── member-detail.js
│   │   ├── member-detail.wxml
│   │   ├── member-detail.wxss
│   │   └── member-detail.json
│   ├── member-edit/          # 新增/编辑会员
│   │   ├── member-edit.js
│   │   ├── member-edit.wxml
│   │   ├── member-edit.wxss
│   │   └── member-edit.json
│   └── settings/             # 设置页（Tab）
│       ├── settings.js
│       ├── settings.wxml
│       ├── settings.wxss
│       └── settings.json
├── components/               # 可复用组件
│   ├── session-card/         # 课程卡片组件
│   │   ├── session-card.js
│   │   ├── session-card.wxml
│   │   ├── session-card.wxss
│   │   └── session-card.json
│   ├── member-avatar/        # 会员头像组件
│   │   ├── member-avatar.js
│   │   ├── member-avatar.wxml
│   │   ├── member-avatar.wxss
│   │   └── member-avatar.json
│   ├── empty-state/          # 空状态组件
│   │   ├── empty-state.js
│   │   ├── empty-state.wxml
│   │   ├── empty-state.wxss
│   │   └── empty-state.json
│   └── tag/                  # 标签组件
│       ├── tag.js
│       ├── tag.wxml
│       ├── tag.wxss
│       └── tag.json
└── assets/
    └── images/               # 图标、插画等静态资源
        ├── tab-schedule.png
        ├── tab-schedule-active.png
        ├── tab-members.png
        ├── tab-members-active.png
        ├── tab-settings.png
        ├── tab-settings-active.png
        └── empty-*.png       # 各页面空状态插画
```

---

## 二、全局配置 app.json

```json
{
  "pages": [
    "pages/week/week",
    "pages/day/day",
    "pages/session/session",
    "pages/members/members",
    "pages/member-detail/member-detail",
    "pages/member-edit/member-edit",
    "pages/settings/settings"
  ],
  "window": {
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "排课助手",
    "navigationBarBackgroundColor": "#F28B82",
    "backgroundColor": "#FFF5F3"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#F28B82",
    "backgroundColor": "#ffffff",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/week/week",
        "text": "排课",
        "iconPath": "assets/images/tab-schedule.png",
        "selectedIconPath": "assets/images/tab-schedule-active.png"
      },
      {
        "pagePath": "pages/members/members",
        "text": "会员",
        "iconPath": "assets/images/tab-members.png",
        "selectedIconPath": "assets/images/tab-members-active.png"
      },
      {
        "pagePath": "pages/settings/settings",
        "text": "我的",
        "iconPath": "assets/images/tab-settings.png",
        "selectedIconPath": "assets/images/tab-settings-active.png"
      }
    ]
  },
  "style": "v2",
  "componentFramework": "glass-easel",
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents"
}
```

---

## 三、数据层设计

### 3.1 存储 Key 规划

| Storage Key | 数据类型 | 说明 |
|---|---|---|
| `pk_members` | `Member[]` | 所有会员数据 |
| `pk_sessions` | `Session[]` | 所有课程记录 |
| `pk_config` | `Config` | 预设配置 |

### 3.2 数据结构定义

#### Member

```javascript
{
  id: string,           // 'm_' + timestamp + random
  name: string,         // 会员昵称，必填
  phone: string,        // 联系方式
  avatar: string,       // 头像路径，默认 ''
  tags: string[],       // 标签列表，如 ['腰伤注意', 'VIP']
  notes: string,        // 备注
  createdAt: number,    // 创建时间戳（ms）
  updatedAt: number     // 更新时间戳（ms）
}
```

#### Session

```javascript
{
  id: string,           // 's_' + timestamp + random
  memberId: string,     // 私教关联的会员 ID
  memberIds: string[],  // 团课关联的会员 ID 列表
  date: string,         // 'YYYY-MM-DD'
  startTime: string,    // 'HH:mm'
  duration: number,     // 时长（分钟），默认 60
  courseType: string,    // 课程类型（从预设选）
  classMode: string,    // 'private' | 'group'
  location: string,     // 上课地点
  status: string,       // 'scheduled' | 'completed' | 'cancelled' | 'noshow'
  notes: string,        // 课后备注
  focusAreas: string[], // 训练重点
  photos: string[],     // 照片临时路径列表（最多9张）
  createdAt: number,
  updatedAt: number
}
```

#### Config

```javascript
{
  courseTypes: ['瑜伽', '普拉提', '体能训练', '拉伸放松'],
  locations: [],
  focusAreaOptions: ['核心', '髋关节', '肩颈', '下肢', '上肢', '全身', '平衡', '柔韧'],
  defaultDuration: 60,
  theme: 'anime-warm',
  workingHours: { start: '08:00', end: '21:00' }
}
```

### 3.3 storage.js 接口设计

```javascript
// === 会员操作 ===
getMembers()                    // 返回 Member[]
getMemberById(id)               // 返回 Member | null
saveMember(member)              // 新增或更新（根据 id 是否存在）
deleteMember(id)                // 删除会员

// === 课程操作 ===
getSessions()                   // 返回 Session[]
getSessionById(id)              // 返回 Session | null
getSessionsByDate(date)         // 按日期筛选，返回按 startTime 排序的 Session[]
getSessionsByDateRange(start, end) // 按日期范围筛选
getSessionsByMemberId(memberId) // 按会员筛选，返回按日期倒序的 Session[]
saveSession(session)            // 新增或更新
deleteSession(id)               // 删除课程
updateSessionStatus(id, status) // 快速更新状态

// === 配置操作 ===
getConfig()                     // 返回 Config（不存在则返回默认值）
saveConfig(config)              // 保存配置

// === 导入导出 ===
exportAllData()                 // 返回 { members, sessions, config, exportTime, version }
importData(jsonData)            // 解析并覆盖/合并数据，返回 { success, message }
```

### 3.4 dateUtil.js 接口设计

```javascript
getWeekRange(date)              // 返回 { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', days: [{date, weekday, isToday}] }
formatDate(date, format)        // 日期格式化
getWeekday(dateStr)             // 返回中文星期几
addDays(dateStr, n)             // 日期加减
isToday(dateStr)                // 是否是今天
getMonthLabel(dateStr)          // 返回 '2026年4月'
```

---

## 四、页面实现规格

### 4.1 周视图 `pages/week/week`

**路由**：TabBar 首页

**数据依赖**：`storage.getSessionsByDateRange(weekStart, weekEnd)`, `storage.getMembers()`

**页面状态**：
```javascript
{
  currentWeek: { start, end, days: [{date, weekday, isToday}] },
  weekSessions: { 'YYYY-MM-DD': Session[] },  // 按日期分组
  memberMap: { id: Member },                   // 快速查名字
  stats: { total, completed, cancelled }       // 周统计
}
```

**交互**：
- 左右滑动 `bindtouchstart` / `bindtouchend` 计算偏移切换周
- 点击列头 → `wx.navigateTo({ url: '/pages/day/day?date=YYYY-MM-DD' })`
- 点击课程卡片 → `wx.navigateTo({ url: '/pages/session/session?id=xxx' })`
- 右下角 FAB 按钮 → `wx.navigateTo({ url: '/pages/session/session' })`
- `onShow` 生命周期重新加载数据（从其他页面返回时刷新）

**UI 要点**：
- 7 列等宽布局，`display: flex`
- 今天的列有高亮底色
- 课程卡片高度按时长比例缩放（可选，第一版可固定高度）
- 空状态组件在整周无课时展示

### 4.2 日视图 `pages/day/day`

**路由**：`/pages/day/day?date=YYYY-MM-DD`

**数据依赖**：`storage.getSessionsByDate(date)`, `storage.getMembers()`

**页面状态**：
```javascript
{
  currentDate: 'YYYY-MM-DD',
  dateLabel: '4月24日 周四',
  sessions: Session[],        // 当天课程，按 startTime 排序
  memberMap: { id: Member },
  workingHours: { start, end },
  timeSlots: ['08:00', '09:00', ...]  // 时间刻度列表
}
```

**交互**：
- 左右滑动切换前后天
- 课程卡片左滑 → 露出"已上完" / "取消" 按钮（`movable-view` 或 `scroll-view` 实现）
- 点击课程卡片 → 进入编辑
- 点击空白时段 → `wx.navigateTo({ url: '/pages/session/session?date=YYYY-MM-DD&time=HH:mm' })`

**UI 要点**：
- 左侧时间刻度 80rpx 宽，右侧课程区域自适应
- 每小时高度 120rpx，课程卡片绝对定位在对应时间位置
- 当前时间线红色水平线（仅当天显示）

### 4.3 课程录入/编辑 `pages/session/session`

**路由**：
- 新增：`/pages/session/session` 或 `?date=YYYY-MM-DD&time=HH:mm`
- 编辑：`/pages/session/session?id=xxx`

**数据依赖**：`storage.getSessionById(id)`, `storage.getMembers()`, `storage.getConfig()`

**页面状态**：
```javascript
{
  isEdit: boolean,
  form: {
    date, startTime, duration, classMode, courseType,
    location, memberId, memberIds, status, notes,
    focusAreas, photos
  },
  members: Member[],           // 会员列表（供选择）
  config: Config,              // 预设选项
  showTimePicker: boolean,
  showDatePicker: boolean
}
```

**交互**：
- 日期选择：`picker mode="date"`
- 时间选择：`picker mode="time"`
- 时长快捷按钮：45 / 60 / 90 分钟，点击切换高亮
- 授课模式：切换 private / group，私教模式显示单选会员，团课显示多选
- 课程类型：从 `config.courseTypes` 渲染标签列表，点选
- 地点：从 `config.locations` 渲染 + 末尾"自定义"输入
- 训练重点：多选标签
- 照片：`wx.chooseMedia` 选择图片，`scroll-view` 横向展示缩略图
- 保存按钮：校验必填项 → `storage.saveSession(form)` → `wx.navigateBack()`
- 删除按钮（编辑模式）：二次确认弹窗 → `storage.deleteSession(id)` → `wx.navigateBack()`

**校验规则**：
- 日期、时间、课程类型为必填
- 私教模式下 memberId 必填
- 保存时自动检测同一时段是否已有课程，如有则 Toast 提醒（不阻断）

### 4.4 会员列表 `pages/members/members`

**路由**：TabBar 页

**数据依赖**：`storage.getMembers()`, `storage.getSessions()`

**页面状态**：
```javascript
{
  members: [{
    ...Member,
    lastSessionDate: 'YYYY-MM-DD' | null,
    totalSessions: number
  }],
  searchKeyword: string,
  filteredMembers: []  // 搜索后的结果
}
```

**交互**：
- 搜索框 `bindinput` 实时过滤
- 列表按最近上课时间倒序
- 点击会员 → `wx.navigateTo({ url: '/pages/member-detail/member-detail?id=xxx' })`
- 右上角 "+" → `wx.navigateTo({ url: '/pages/member-edit/member-edit' })`
- `onShow` 重新加载

### 4.5 会员详情 `pages/member-detail/member-detail`

**路由**：`/pages/member-detail/member-detail?id=xxx`

**数据依赖**：`storage.getMemberById(id)`, `storage.getSessionsByMemberId(id)`

**页面状态**：
```javascript
{
  member: Member,
  stats: {
    total: number,
    thisMonth: number,
    lastSessionDate: string,
    topCourseType: string
  },
  timeline: [{
    month: '2026年4月',
    sessions: Session[]
  }],                          // 按月分组的时间轴
  expandedMonths: string[]     // 展开的月份
}
```

**交互**：
- 顶部编辑按钮 → `wx.navigateTo({ url: '/pages/member-edit/member-edit?id=xxx' })`
- 月份折叠/展开
- 点击时间轴中的课程记录展开完整备注和照片
- `onShow` 重新加载

### 4.6 会员编辑 `pages/member-edit/member-edit`

**路由**：
- 新增：`/pages/member-edit/member-edit`
- 编辑：`/pages/member-edit/member-edit?id=xxx`

**表单字段**：name（必填）、phone、tags（输入后回车添加标签）、notes

**保存逻辑**：`storage.saveMember(form)` → `wx.navigateBack()`

### 4.7 设置页 `pages/settings/settings`

**路由**：TabBar 页

**功能分区**：
1. **预设管理**：课程类型列表（可增删）、地点列表（可增删）、训练重点列表（可增删）、默认时长、可排课时间段
2. **数据管理**：导出数据按钮、导入数据按钮
3. **主题**：预留入口（灰显"更多主题即将上线"）
4. **关于**：版本号 v1.0.0

**导出逻辑**：
```javascript
const data = storage.exportAllData()
const filePath = `${wx.env.USER_DATA_PATH}/paike-backup-${date}.json`
fs.writeFileSync(filePath, JSON.stringify(data), 'utf8')
wx.shareFileMessage({ filePath })
```

**导入逻辑**：
```javascript
wx.chooseMessageFile({ count: 1, type: 'file', extension: ['json'] })
// → 读取文件 → JSON.parse → 校验格式 → storage.importData(data)
// → 弹窗确认"导入将覆盖现有数据"
```

---

## 五、主题系统

### 5.1 CSS 变量定义（app.wxss）

```css
page {
  /* 主题色 */
  --color-primary: #F28B82;
  --color-primary-light: #FDDDE6;
  --color-primary-dark: #E06B6B;

  /* 状态色 */
  --color-scheduled: #F28B82;
  --color-completed: #81C995;
  --color-cancelled: #CCCCCC;
  --color-noshow: #FFB74D;

  /* 背景 */
  --bg-page: #FFF5F3;
  --bg-card: #FFFFFF;
  --bg-input: #FFF0EE;

  /* 文字 */
  --text-primary: #333333;
  --text-secondary: #888888;
  --text-light: #BBBBBB;

  /* 圆角 */
  --radius-sm: 8rpx;
  --radius-md: 16rpx;
  --radius-lg: 24rpx;
  --radius-xl: 32rpx;

  /* 阴影 */
  --shadow-card: 0 4rpx 16rpx rgba(242, 139, 130, 0.1);
  --shadow-float: 0 8rpx 32rpx rgba(242, 139, 130, 0.2);

  /* 间距 */
  --spacing-xs: 8rpx;
  --spacing-sm: 16rpx;
  --spacing-md: 24rpx;
  --spacing-lg: 32rpx;
  --spacing-xl: 48rpx;

  /* 字号 */
  --font-xs: 22rpx;
  --font-sm: 26rpx;
  --font-md: 30rpx;
  --font-lg: 34rpx;
  --font-xl: 40rpx;
  --font-title: 48rpx;

  /* 布局 */
  background-color: var(--bg-page);
  color: var(--text-primary);
  font-size: var(--font-md);
}
```

### 5.2 主题扩展预留

`utils/theme.js` 导出不同主题的变量覆盖对象。第一版只实现 `anime-warm`。后续添加新主题只需增加一个变量集，在 `app.js` 的 `onLaunch` 中动态注入对应 CSS 变量。

---

## 六、组件规格

### 6.1 session-card 课程卡片

**Props**：
| 属性 | 类型 | 说明 |
|---|---|---|
| session | Object | Session 数据 |
| memberName | String | 会员名称 |
| compact | Boolean | 紧凑模式（周视图用） |

**事件**：
| 事件 | 说明 |
|---|---|
| bind:tap | 点击卡片 |
| bind:complete | 左滑标记完成 |
| bind:cancel | 左滑标记取消 |

**展示逻辑**：
- compact=true：只显示时间 + 会员名 + 课程类型（用于周视图）
- compact=false：显示完整信息（用于日视图）
- 状态不同 → 左边框颜色不同（scheduled=主色, completed=绿, cancelled=灰）
- completed 状态整体降低不透明度 + 打勾图标

### 6.2 empty-state 空状态

**Props**：
| 属性 | 类型 | 说明 |
|---|---|---|
| image | String | 插画图片路径 |
| title | String | 主标题 |
| subtitle | String | 副标题 |

### 6.3 tag 标签

**Props**：
| 属性 | 类型 | 说明 |
|---|---|---|
| text | String | 标签文本 |
| selected | Boolean | 是否选中 |
| closable | Boolean | 是否显示删除 X |

**事件**：`bind:tap`, `bind:close`

---

## 七、实施阶段划分

### Phase 1：基础骨架（预计 1-2 小时）

**目标**：跑通项目框架，三个 Tab 能切换，页面间能跳转。

**任务**：
1. 重写 `app.json`（页面路由 + TabBar 配置）
2. 重写 `app.wxss`（全局主题变量 + 基础样式）
3. 重写 `app.js`（初始化数据层，去掉模板的 login 逻辑）
4. 创建所有页面目录和空文件
5. 创建 TabBar 图标占位文件（可用纯色圆形占位）
6. 每个页面写一个最简的 "Hello from [页面名]" 占位

**验收标准**：小程序启动后能看到 TabBar，三个 Tab 正常切换，所有页面路由不报错。

### Phase 2：数据层（预计 1-2 小时）

**目标**：完整的本地数据 CRUD 能力。

**任务**：
1. 实现 `utils/storage.js` 全部接口
2. 实现 `utils/dateUtil.js` 全部接口
3. 实现 `utils/idGenerator.js`
4. 实现 `data/defaultConfig.js`
5. 在 `app.js` 的 `onLaunch` 中初始化默认配置（如果 config 不存在）

**验收标准**：在控制台手动调用 storage 接口，能正确增删改查 members 和 sessions。

### Phase 3：周视图 + 日视图（预计 2-3 小时）

**目标**：核心排课视图可用。

**任务**：
1. 实现 `session-card` 组件
2. 实现 `empty-state` 组件
3. 实现周视图页面完整功能
4. 实现日视图页面完整功能
5. 添加模拟数据验证显示效果

**验收标准**：周视图能显示一周的课程卡片，左右滑动切换周；点击进入日视图，日视图能按时间轴展示课程。

### Phase 4：课程录入/编辑（预计 2-3 小时）

**目标**：能新增、编辑、删除课程。

**任务**：
1. 实现课程录入表单页面
2. 实现日期/时间选择器
3. 实现时长快捷选择
4. 实现课程类型/地点/训练重点标签选择
5. 实现照片选择功能
6. 实现保存/删除逻辑
7. 实现课程冲突检测提醒

**验收标准**：能完整走通"新增课程 → 周视图/日视图看到 → 编辑修改 → 标记完成/取消 → 删除"的全流程。

### Phase 5：会员管理（预计 2-3 小时）

**目标**：会员增删改查 + 上课时间轴。

**任务**：
1. 实现 `tag` 组件
2. 实现会员列表页面（搜索 + 排序）
3. 实现会员编辑页面
4. 实现会员详情页面（统计卡片 + 按月分组时间轴）
5. 课程录入页面关联会员选择

**验收标准**：能新增会员，在排课时选择会员，在会员详情看到完整上课时间轴。

### Phase 6：设置与数据管理（预计 1-2 小时）

**目标**：预设配置管理 + 数据导入导出。

**任务**：
1. 实现设置页面 UI
2. 实现预设列表的增删操作
3. 实现数据导出为 JSON 文件
4. 实现从 JSON 文件导入数据
5. 导入时的确认弹窗与覆盖逻辑

**验收标准**：能修改预设，导出数据文件通过微信发送，从文件导入后数据正确恢复。

### Phase 7：视觉打磨（预计 2-3 小时）

**目标**：落地"动漫暖系"视觉风格。

**任务**：
1. 精调全局主题色、圆角、阴影
2. 制作/替换 TabBar 图标（线性 + 填充风格）
3. 制作空状态插画（动漫风）
4. 优化课程卡片视觉
5. 添加页面切换动画
6. 添加操作反馈（Toast + 振动）
7. 适配不同屏幕尺寸

**验收标准**：整体视觉统一、温暖亲和，各尺寸手机上显示正常。

---

## 八、关键实现注意事项

### 8.1 性能优化
- 所有列表页使用 `onShow` 而非 `onLoad` 加载数据，确保返回时刷新
- 周视图避免一次性渲染过多 DOM，课程卡片超过 3 条时折叠显示 "+N"
- 照片存储为压缩后的缩略图路径，不存 base64

### 8.2 数据安全
- 导入数据前必须校验 JSON 结构（检查必要字段存在性和类型）
- 导入前弹窗明确告知"将覆盖现有数据"
- 删除操作（会员、课程）必须二次确认

### 8.3 已知限制
- 微信小程序 Storage 上限 10MB，照片不能存 base64，只存临时路径
- 测试号不支持某些高级 API，正式发布前需要注册正式小程序号
- `wx.shareFileMessage` 需要用户手动选择发送对象

### 8.4 开发约定
- 缩进 2 空格
- CSS 变量引用主题色，不硬编码颜色值
- 组件通过 properties 接收数据，通过 triggerEvent 向外通信
- 页面间传参优先用 URL query，复杂数据用 globalData 或 eventChannel

---

*文档结束 — 可直接作为 Claude Code / OpenSpec 的输入使用*
