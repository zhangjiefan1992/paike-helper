# 周视图重设计 — 设计规格

## 概述

重新设计小程序周视图（首页），目标：一屏展示完整周课表、信息清晰可读、视觉美观、交互友好。

## 核心设计决策

### 1. 视图策略

- **周视图是唯一主视图**，占据首页全部空间
- **日视图为低频入口**：点击列头（日期/星期）进入，不设顶部 Tab 切换
- 移除原有的视图切换控件，减少界面噪声

### 2. 布局

- 7 列等宽 CSS Grid（左侧 28px 时间轴 + 7 列课程区）
- 全屏填满，无需纵向滚动（时间轴仅显示工作时段）
- 顶部：周导航（← 本周日期范围 →）+ 右上角"今天"按钮

### 3. 颜色方案：按会员着色（Color-by-Member）

每个会员分配固定颜色，同一人在一周内的所有课程使用同一颜色。解决专项教练（80%+ 同课程类型）按课程着色导致的视觉单调问题。

**实现**：会员 ID 哈希 → 取模映射到 8 色调色板。

**三套主题各有独立 8 色调色板**：

| 主题 | 风格 | 卡片背景 | 文字 |
|------|------|----------|------|
| 轻盈 airy-tint | 浅色系 | 半透明色块 + 3px 左边框 | 深色文字 |
| 柔彩 soft-color | 中饱和 | 柔和色块 + 3px 左边框 | 深色文字 |
| 渐变 candy-gradient | 渐变色 | 微渐变色块 + 3px 左边框 | 深色文字 |

**可读性保证**：所有主题使用 light tinted background（浅底）+ 深色文字，WCAG AA 对比度达标。

### 4. 信息密度：三档可选

用户在设置页选择密度级别，控制卡片展示的信息量。

| 密度 | 标签 | 卡片内容 | 示例 |
|------|------|----------|------|
| 极简 | 极简 | 时间 + 会员名 | `10:30` `周文娟` |
| 标准 | 标准 | 时间 + 会员名 + 课程简写 | `10:30` `周文娟` `普私` |
| 详尽 | 详尽 | 时间 + 会员名 + 课程简写·地点首字 | `10:30` `周文娟` `普私·旺` |

**关键原则**：会员名在所有密度下始终可见——对私教而言"谁来上课"是最核心信息。

### 5. 简写规则

**课程类型简写**（2 字符）：
- 取课程名前 1-2 个汉字 + 课程性质（私/团）
- 示例：普拉提私教 → `普私`，瑜伽团课 → `瑜团`，舞蹈私教 → `舞私`

**地点简写**（1 字符）：
- 取地点名首字
- 示例：旺君馆 → `旺`，星光店 → `星`，万达馆 → `万`

### 6. 交互

| 操作 | 行为 |
|------|------|
| 点击课程卡片 | 进入课程详情/编辑页 |
| 点击列头日期 | 进入日视图 |
| 左右滑动 | 切换周 |
| 点击"今天" | 回到当前周 |
| 长按空白时段 | 快速新建课程（预填日期时间） |
| 点击右下 FAB "+" | 新建课程 |

### 7. 设置页新增

在设置页「周视图主题」区块之后，新增「课表密度」选项：

```
课表密度
  ○ 极简    时间 + 会员
  ● 标准    时间 + 会员 + 课程
  ○ 详尽    时间 + 会员 + 课程·地点
```

使用 radio 选择器，三选一，默认「标准」。

同时保留现有三套主题选择（轻盈/柔彩/渐变），两者独立配置。

## 数据模型变更

### Config 新增字段

```js
{
  weekDensity: 'standard'  // 'minimal' | 'standard' | 'detailed'
}
```

默认值 `'standard'`，存储在 `pk_config`。

### 卡片颜色计算

```js
// 8 色调色板（每个主题一套）
const MEMBER_COLORS = {
  'airy-tint': [
    { bg: '#F0F4FF', border: '#6366F1' },
    { bg: '#ECFDF5', border: '#10B981' },
    { bg: '#FFF7ED', border: '#F59E0B' },
    { bg: '#FCE4EC', border: '#E91E63' },
    { bg: '#E0F7FA', border: '#00ACC1' },
    { bg: '#FAF5FF', border: '#A855F7' },
    { bg: '#FFF9C4', border: '#F9A825' },
    { bg: '#E8EAF6', border: '#3F51B5' }
  ],
  'soft-color': [
    { bg: '#BBDEFB', border: '#1976D2' },
    { bg: '#C8E6C9', border: '#388E3C' },
    { bg: '#FFE0B2', border: '#F57C00' },
    { bg: '#F8BBD0', border: '#C2185B' },
    { bg: '#B2EBF2', border: '#0097A7' },
    { bg: '#E1BEE7', border: '#7B1FA2' },
    { bg: '#FFF59D', border: '#FBC02D' },
    { bg: '#C5CAE9', border: '#303F9F' }
  ],
  'candy-gradient': [
    { bg: 'linear-gradient(135deg, #667EEA, #764BA2)', border: '#764BA2' },
    { bg: 'linear-gradient(135deg, #43E97B, #38F9D7)', border: '#38F9D7' },
    { bg: 'linear-gradient(135deg, #F093FB, #F5576C)', border: '#F5576C' },
    { bg: 'linear-gradient(135deg, #4FACFE, #00F2FE)', border: '#00F2FE' },
    { bg: 'linear-gradient(135deg, #FA709A, #FEE140)', border: '#FA709A' },
    { bg: 'linear-gradient(135deg, #A18CD1, #FBC2EB)', border: '#A18CD1' },
    { bg: 'linear-gradient(135deg, #FDDB92, #D1FDFF)', border: '#FDDB92' },
    { bg: 'linear-gradient(135deg, #96FBC4, #F9F586)', border: '#96FBC4' }
  ]
}

// 颜色分配：会员 ID → hash → 取模 8
function getMemberColor(memberId, theme) {
  const hash = simpleHash(memberId)
  const palette = MEMBER_COLORS[theme] || MEMBER_COLORS['airy-tint']
  return palette[hash % 8]  // { bg, border }
}
```

左边框颜色为背景色的加深版本（saturation +20%, lightness -30%）。

## 组件结构

### week 页面内部拆分

```
pages/week/
├── week.wxml          — 主布局（grid 容器 + 顶部导航）
├── week.js            — 数据加载、周切换、密度/主题读取
├── week.wxss          — 7 列网格、时间轴、响应式
└── components/
    └── week-card/     — 课程卡片组件（独立 component）
        ├── week-card.wxml
        ├── week-card.js
        ├── week-card.wxss
        └── week-card.json
```

### week-card 组件

**Properties**:
- `session`: Object — 课程数据
- `member`: Object — 会员数据
- `density`: String — 当前密度级别
- `theme`: String — 当前主题
- `color`: String — 卡片背景色
- `borderColor`: String — 左边框色

**显示逻辑**：
```
极简:  第1行=startTime  第2行=memberName
标准:  第1行=startTime  第2行=memberName  第3行=courseAbbr
详尽:  第1行=startTime  第2行=memberName  第3行=courseAbbr·locationInitial
```

## 文字排版

**轻盈 / 柔彩主题**（浅底深字）：
- 时间：12px, font-weight 500, `#64748B`
- 会员名：13px, font-weight 600, `#1E293B`（最醒目）
- 课程·地点：11px, font-weight 400, `#475569`

**渐变主题**（彩底白字）：
- 时间：12px, font-weight 500, `rgba(255,255,255,0.85)`
- 会员名：13px, font-weight 600, `#FFFFFF`
- 课程·地点：11px, font-weight 400, `rgba(255,255,255,0.75)`

## 不做的事

- 不做月视图
- 不做顶部 Tab 切换（日视图通过列头进入）
- 不做拖拽排课
- 不做课程状态色（已有状态通过其他视觉手段标识，非重设计范围）

## 兼容性

- 最低基础库 2.25.0+
- 适配 iPhone SE（320px）到 iPhone 15 Pro Max（430px）
- 7 列最窄 (320-28)/7 ≈ 41px/列，可容纳 4 个汉字（11px）
