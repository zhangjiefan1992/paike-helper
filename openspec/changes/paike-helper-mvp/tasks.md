## 1. 项目骨架搭建

- [x] 1.1 重写 `app.json`：配置 7 个业务页面路由 + 3 Tab 导航栏（排课/会员/我的），删除模板页面引用
- [x] 1.2 重写 `app.wxss`：定义全局 CSS 变量（颜色、背景、文字、圆角、阴影、间距、字号），设置 page 默认样式
- [x] 1.3 创建所有页面目录和空文件（week、day、session、members、member-detail、member-edit、settings）
- [x] 1.4 创建 TabBar 图标占位文件（`assets/images/` 下 6 个 tab 图标 png）
- [x] 1.5 每个页面写最简占位内容（"Hello from [页面名]"），验证 TabBar 切换和页面路由正常
- [x] 1.6 删除模板页面 `pages/index/` 和 `pages/logs/` 目录

## 2. 数据层实现

- [x] 2.1 创建 `data/defaultConfig.js`：导出默认预设配置对象
- [x] 2.2 创建 `utils/idGenerator.js`：实现 `generateMemberId()` 和 `generateSessionId()` 函数
- [x] 2.3 创建 `utils/dateUtil.js`：实现 `getWeekRange`、`formatDate`、`getWeekday`、`addDays`、`isToday`、`getMonthLabel` 函数
- [x] 2.4 创建 `utils/storage.js`：实现 Member CRUD（getMembers、getMemberById、saveMember、deleteMember）
- [x] 2.5 `utils/storage.js`：实现 Session CRUD（getSessions、getSessionById、getSessionsByDate、getSessionsByDateRange、getSessionsByMemberId、saveSession、deleteSession、updateSessionStatus）
- [x] 2.6 `utils/storage.js`：实现 Config 操作（getConfig、saveConfig）和数据导入导出（exportAllData、importData）
- [x] 2.7 重写 `app.js`：onLaunch 中初始化默认配置（pk_config 不存在时写入），移除模板的 logs 和 login 逻辑

## 3. 主题系统

- [x] 3.1 创建 `utils/theme.js`：导出 anime-warm 主题配置，预留主题切换架构
- [x] 3.2 在 `app.json` 的 window 配置中设置导航栏主题色（背景 #F28B82，白字）和 TabBar 颜色

## 4. 共享组件

- [x] 4.1 实现 `components/session-card/` 组件：接收 session、memberName、compact 属性，根据 compact 切换紧凑/完整模式，左边框颜色随状态变化
- [x] 4.2 为 session-card 组件实现左滑操作（movable-view），触发 complete 和 cancel 事件
- [x] 4.3 实现 `components/empty-state/` 组件：接收 image、title、subtitle 属性，居中展示
- [x] 4.4 实现 `components/tag/` 组件：接收 text、selected、closable 属性，触发 tap 和 close 事件
- [x] 4.5 实现 `components/member-avatar/` 组件：接收 src、size 属性，空 src 时显示默认头像

## 5. 周视图

- [x] 5.1 实现周视图页面 `pages/week/week`：7 列 flex 等宽布局，顶部日期范围显示，今天列高亮
- [x] 5.2 实现周视图左右滑动手势切换上/下周（bindtouchstart/bindtouchend 计算偏移）和顶部箭头按钮
- [x] 5.3 集成 session-card 组件（compact 模式），按日分组显示课程，超过 3 条折叠显示 "+N"
- [x] 5.4 实现周统计摘要（已排/已完成/取消数量）
- [x] 5.5 集成 empty-state 组件（整周无课时展示）
- [x] 5.6 实现导航：点击列头→日视图、点击卡片→编辑、FAB→新增课程
- [x] 5.7 在 onShow 中实现数据刷新

## 6. 日视图

- [x] 6.1 实现日视图页面 `pages/day/day`：左侧时间刻度 + 右侧课程区域，每小时 120rpx 高度
- [x] 6.2 实现课程卡片在时间轴中的绝对定位（按 startTime 计算 top 值）
- [x] 6.3 实现当天的红色当前时间线
- [x] 6.4 实现左右滑动切换前/后一天
- [x] 6.5 集成 session-card 组件（完整模式）的左滑快捷操作，处理 complete/cancel 事件调用 updateSessionStatus
- [x] 6.6 实现点击空白时段导航到新增课程页（预填日期和时间）
- [x] 6.7 实现点击课程卡片导航到编辑页

## 7. 课程录入/编辑

- [x] 7.1 实现课程表单页面 `pages/session/session`：区分新增/编辑模式（通过 URL 参数 id 判断）
- [x] 7.2 实现日期选择器（picker mode="date"）和时间选择器（picker mode="time"）
- [x] 7.3 实现时长快捷按钮（45/60/90 分钟），点击切换高亮
- [x] 7.4 实现授课模式切换（私教/团课），私教单选会员，团课多选会员
- [x] 7.5 实现课程类型选择（从 config.courseTypes 渲染标签列表 + 自定义输入）
- [x] 7.6 实现地点选择（从 config.locations 渲染 + 手动输入）和训练重点多选标签
- [x] 7.7 实现照片选择功能（wx.chooseMedia，最多 9 张，横向展示缩略图）
- [x] 7.8 实现表单必填校验（日期、时间、课程类型、私教模式下的会员）
- [x] 7.9 实现课程时间冲突检测（同日同时段，Toast 提醒不阻断）
- [x] 7.10 实现保存逻辑（storage.saveSession + Toast + 振动 + navigateBack）
- [x] 7.11 实现删除逻辑（二次确认弹窗 + storage.deleteSession + navigateBack）

## 8. 会员管理

- [x] 8.1 实现会员列表页面 `pages/members/members`：按最近上课时间倒序排列，每行显示头像、昵称、标签、最近上课日期、累计课程数
- [x] 8.2 实现搜索栏（bindinput 实时过滤按昵称模糊匹配）
- [x] 8.3 集成 empty-state 组件（无会员时展示）
- [x] 8.4 实现导航：点击会员→详情、右上角"+"→新增
- [x] 8.5 实现会员编辑页面 `pages/member-edit/member-edit`：表单（昵称必填、联系方式、标签输入+回车添加、备注）
- [x] 8.6 实现会员详情页面 `pages/member-detail/member-detail`：顶部基本信息 + 统计卡片（累计/本月/最近上课/最常课程类型）
- [x] 8.7 实现会员上课时间轴：按月分组、点击展开备注和照片、月份折叠/展开

## 9. 设置与数据管理

- [x] 9.1 实现设置页面 `pages/settings/settings` 布局：预设管理、数据管理、主题预留、关于 四个分区
- [x] 9.2 实现预设列表增删操作（课程类型、地点、训练重点列表的添加和删除）
- [x] 9.3 实现默认时长和可排课时间段的修改
- [x] 9.4 实现数据导出（生成 JSON 文件 + wx.shareFileMessage）
- [x] 9.5 实现数据导入（wx.chooseMessageFile + 确认弹窗 + 解析覆盖）
- [x] 9.6 实现主题预留入口（灰显"更多主题即将上线"）和关于区域（版本号 v1.0.0）

## 10. 视觉打磨与适配

- [x] 10.1 精调全局主题变量（颜色、圆角、阴影），确保"动漫暖系"风格统一
- [x] 10.2 制作/替换 TabBar 图标（线性+填充风格，2-3px 线条）
- [x] 10.3 制作空状态插画（动漫风格，用于周视图、日视图、会员列表等）
- [x] 10.4 为所有写操作添加操作反馈（Toast + wx.vibrateShort）
- [x] 10.5 适配不同屏幕尺寸（iPhone SE ~ iPhone 16 Pro Max / 常见 Android 机型）
