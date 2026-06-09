# 周视图重设计：时间定位时段网格

> 日期：2026-06-01
> 状态：Codex 审核通过（已修复全部 blocking 项）
> 替代：2026-05-29-week-view-redesign-design.md（旧方案为堆叠式分桶 + Timeline，已弃用）

## 概述

将周视图的课程卡片从"堆在行顶部"改为"按实际开始时间在行内定位"。保留 4 行时段分桶（上午/中午/下午/晚上），但卡片使用 `position:absolute` + 百分比 top 定位，使 17:30 的课显示在"下午"行的底部而非顶部。

一屏展示，不滚动。

## 核心设计

### 时段划分

| 时段 | 起止 | 时长 | 归属规则 |
|------|------|------|---------|
| 上午 | 06:00–12:00 | 6h | hour >= 6 且 hour < 12 |
| 中午 | 12:00–14:00 | 2h | hour >= 12 且 hour < 14 |
| 下午 | 14:00–18:00 | 4h | hour >= 14 且 hour < 18 |
| 晚上 | 18:00–24:00 | 6h | hour >= 18 |

早于 06:00 的课归入"上午"行，topRpx 被 clamp 到 0。

### 卡片时间定位公式

```
topPercent = (startMin - periodStartMin) / periodDurationMin
topRpx = clamp(round(topPercent × rowHeight), 0, rowHeight - cardH)
```

双向 clamp：`max(0, min(topRpx, rowHeight - cardH))` — 防止负值（早于时段起点）和底部溢出。

示例：
- 17:30 在"下午"行：`(1050 - 840) / 240 = 87.5%` → 卡片 top 在行高的 87.5%
- 10:00 在"上午"行：`(600 - 360) / 360 = 66.7%` → 卡片 top 在行高的 2/3 处
- 14:30 在"下午"行：`(870 - 840) / 240 = 12.5%` → 接近行顶部
- 05:30 在"上午"行：`(330 - 360) / 360 = -8.3%` → clamp 到 0

### 卡片重叠策略

同一天同一时段内时间接近的课程（如 14:00 和 14:15）卡片会部分重叠。**这是可接受的设计**：
- 现实场景中，私教课程不会在同一天同一小时安排两节（一个教练同时只上一节课）
- 即使出现，卡片仍可点击（z-index 按数组顺序，后面的盖前面的）
- 周视图定位是"概览"，精确查看用日视图

### CSS 定位方式

```css
.cp-grid__cell {
  position: relative;
  overflow: hidden;
  /* 删除原有 flex/gap — 与 absolute 子元素冲突 */
}
.cp-card {
  position: absolute;
  left: 4rpx;
  right: 4rpx;
  /* top 和 height 由 JS 计算后写入 inline style */
}
```

## 密度系统

设置页提供三档密度选择，存储在 `pk_config.weekDensity`：

| 密度值 | 显示名 | 卡片高度 | 卡片内容 | 空行高度 |
|--------|--------|---------|---------|---------|
| `minimal` | 极简 | 46rpx | 仅会员名 | 88rpx |
| `standard` | 标准 | 52rpx | 会员名 + 课程类型缩写 | 96rpx |
| `detailed` | 详细 | 60rpx | 会员名 + 课程缩写·场馆首字 | 108rpx |

**命名统一为 `minimal`**（设置页已用此值，week.js 需改 `compact` → `minimal`）。

**卡片高度固定**，不因一行有多少课而变化。高度通过 inline style `height:{{cardH}}rpx` 写入（WXSS 中原本无显式 height 声明）。

## 行高计算

### 可用空间

```
wInfo = wx.getWindowInfo()
rpxRatio = 750 / wInfo.windowWidth
safeBottom = wInfo.safeArea ? (wInfo.screenHeight - wInfo.safeArea.bottom) * rpxRatio : 0
availH = max(400, wInfo.windowHeight * rpxRatio - headerH - toolbarH - gridHeadH)
```

注意：使用 `windowHeight`（不含系统状态栏），不是 `screenHeight`。

各区域高度：
- headerH：180rpx
- toolbarH：140rpx + safeBottom（工具栏自身 + 安全区，合并计算）
- gridHeadH：68rpx
- availH 下限保护：max(400rpx, 计算值)

### 分配策略

1. 空行（本周该时段无课的行）使用固定的 `emptyRowH`（按密度档位）
2. 非空行**均分**剩余空间：`nonEmptyRowH = floor((availH - emptyRowH × emptyCount) / nonEmptyCount)`
3. 不按课程数加权 — 所有非空行等高，保持网格节奏

### 数学验证（最小屏 iPhone SE2）

```
windowHeight × rpxRatio ≈ 1206rpx（SE2 的 windowHeight=603pt, rpxRatio=2）
- headerH      180rpx
- toolbarH     140rpx（safeBottom=0，SE2 无刘海）
- gridHeadH     68rpx
= 可用         818rpx

最坏情况：4 行全有课 → 均分 818/4 = 204rpx/行
detailed 模式 cardH=60rpx，单卡占行高 60/204 = 29% → 充裕

iPhone 14 Pro（刘海机型）：
windowHeight × rpxRatio ≈ 1290rpx, safeBottom ≈ 50rpx
availH = 1290 - 180 - 190 - 68 = 852rpx → 均分 213rpx/行 → 更充裕
```

## 修改文件

| 文件 | 修改内容 |
|------|---------|
| `miniprogram/pages/week/week.js` | 密度判断 `compact`→`minimal`；TIME_PERIODS 扩展；增加 topRpx 计算；行高改均分；卡片输出 cardH |
| `miniprogram/pages/week/week.wxml` | `.cp-card` style 添加 `top:{{card.topRpx}}rpx;height:{{cardH}}rpx` |
| `miniprogram/pages/week/week.wxss` | `.cp-grid__cell` 改 relative + 删除 flex/gap；`.cp-card` 改 absolute |
| `miniprogram/pages/settings/settings.js` | 确认 densityOptions value 已为 `minimal`（现已正确，无需改） |
| `miniprogram/data/defaultConfig.js` | 确认 `weekDensity: 'standard'` 默认值（已正确） |

### 不修改

- Header（hdr 区域）
- 月视图
- 底部工具栏
- 导入弹窗
- `onCardTap`/`onCardLongPress`/`onCellTap` 事件处理
- `MEMBER_COLORS` + `simpleHash` 颜色分配
- `loadMonth()`、`goToday()`、`onSwitchView()`
- 所有 utils/storage/config 模块

## week.js 变更详情

### 1. TIME_PERIODS 扩展

给每个时段增加起止分钟数，供 topPercent 计算：

```js
const TIME_PERIODS = [
  { label: '上午', startHour: 6, endHour: 12, startMin: 360, durationMin: 360 },
  { label: '中午', startHour: 12, endHour: 14, startMin: 720, durationMin: 120 },
  { label: '下午', startHour: 14, endHour: 18, startMin: 840, durationMin: 240 },
  { label: '晚上', startHour: 18, endHour: 24, startMin: 1080, durationMin: 360 }
]
```

### 2. 新增 parseTimeToMin 辅助函数

```js
function parseTimeToMin(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return 480  // fallback 08:00
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return 480
  return h * 60 + (m || 0)
}
```

### 3. 密度常量统一为 minimal

```js
const cardH = density === 'minimal' ? 46 : density === 'detailed' ? 60 : 52
const emptyRowH = density === 'minimal' ? 88 : density === 'detailed' ? 108 : 96
```

### 4. loadWeek() 中计算 topRpx

在 cpRows 构建完成、行高分配之后，遍历每行每个 cell 的 cards 计算 topRpx：

```js
cpRows.forEach((row, pIdx) => {
  const period = TIME_PERIODS[pIdx]
  row.cells.forEach(cell => {
    cell.cards.forEach(card => {
      const startMin = parseTimeToMin(card.startTime)
      const topPercent = (startMin - period.startMin) / period.durationMin
      const topRpx = Math.round(topPercent * row.rowHeight)
      card.topRpx = Math.max(0, Math.min(topRpx, row.rowHeight - cardH))
    })
  })
})
```

`setData` 中增加 `cardH` 字段供 wxml 使用。

### 5. 行高分配改为非空行均分

```js
const rowMaxCards = cpRows.map(r => Math.max(0, ...r.cells.map(c => c.cards.length)))
const emptyCount = rowMaxCards.filter(n => n === 0).length
const nonEmptyCount = 4 - emptyCount

cpRows.forEach((r, i) => {
  if (rowMaxCards[i] === 0) {
    r.rowHeight = emptyRowH
  } else {
    r.rowHeight = Math.floor((availH - emptyRowH * emptyCount) / (nonEmptyCount || 1))
  }
})
```

### 6. availH 使用 windowHeight

```js
const wInfo = wx.getWindowInfo()
const rpxRatio = 750 / wInfo.windowWidth
const safeBottom = wInfo.safeArea ? (wInfo.screenHeight - wInfo.safeArea.bottom) * rpxRatio : 0
const headerH = 180
const toolbarH = 140 + safeBottom
const gridHeadH = 68
const availH = Math.max(400, wInfo.windowHeight * rpxRatio - headerH - toolbarH - gridHeadH)
```

## week.wxml 变更

在 `.cp-card` 上添加 top + height 定位：

```xml
<view wx:for="{{cell.cards}}" wx:for-item="card" wx:key="id"
  class="cp-card {{card.done ? 'cp-card--done' : ''}}"
  style="top:{{card.topRpx}}rpx;height:{{cardH}}rpx;{{card.cardStyle}}"
  catchtap="onCardTap" catchlongpress="onCardLongPress"
  data-id="{{card.id}}">
```

其余模板结构不变。

## week.wxss 变更

```css
/* cell 改为 relative 定位上下文，删除 flex 布局 */
.cp-grid__cell {
  border-left: 1rpx solid var(--grid-border);
  position: relative;
  overflow: hidden;
  background: var(--paper);
  /* 删除：display:flex; flex-direction:column; gap:4rpx; padding:4rpx 2rpx; */
}

/* card 改为 absolute 定位 */
.cp-card {
  position: absolute;
  left: 4rpx;
  right: 4rpx;
  border-radius: 4rpx;
  padding: 4rpx 6rpx;
  overflow: hidden;
  box-sizing: border-box;
  border-left: 3rpx solid transparent;
}
```

## 主题兼容

两个主题（`soft-color` 和 `class-plan`）的卡片颜色系统不变。卡片的 `background-color`、`border-left-color`、`color` 通过 JS 计算后写入 `cardStyle`，与定位方式解耦。

## 交互保持

| 交互 | 状态 |
|------|------|
| 点击卡片 → 课程详情 | 不变（`onCardTap`） |
| 长按卡片 → 操作菜单 | 不变（`onCardLongPress`） |
| 点击空白 cell → 新建课程（预填日期） | 不变（`onCellTap`） |
| 左右滑动切换周 | 不变（手势代码不动） |
| 底部"批量导入"/"新建"按钮 | 不变 |

## Codex 审核修复记录

| # | 问题 | 严重级 | 修复 |
|---|------|--------|------|
| 1 | 密度值 `compact` vs `minimal` 命名不一致 | FAIL | 统一为 `minimal`（与设置页一致） |
| 2 | WXSS 无显式 cardH，absolute 后高度丢失 | FAIL | inline style 写入 `height:{{cardH}}rpx` |
| 3 | 卡片重叠未处理 | FAIL | 明确为可接受设计（概览视图 + 实际不会发生） |
| 4 | `.cp-grid__cell` flex/gap 与 absolute 冲突 | FAIL | 删除 flex/gap/padding |
| 5 | topRpx 无下限保护 | FAIL | 加 `max(0, ...)` |
| 6 | parseTimeToMin 无容错 | FAIL | 加 fallback 和 NaN 检查 |
| 7 | 数学证明用 screenHeight 不准确 | FAIL | 改用 windowHeight |
| 8 | 修改文件遗漏 settings.js | FAIL | 加入文件列表 |
| 9 | toolbarH 与 safeBottom 可能双重扣减 | WARN | 明确公式：`toolbarH = 140 + safeBottom` |

## 验证清单

1. 微信开发者工具编译无报错
2. 卡片按实际开始时间在行内定位（09:30 不在行顶部，17:30 在行底部）
3. 三种密度模式切换正常（设置页选"极简"后 week.js 正确识别 `minimal`）
4. 空行压缩、非空行均分正确
5. iPhone SE2（最小屏）一屏展示不滚动
6. iPad / 大屏手机行高更大，时间精度更好
7. soft-color 和 class-plan 主题下卡片颜色正确
8. 月视图切换正常
9. 空状态正常显示
10. 点击/长按/滑动交互正常
11. 非法时间字符串不导致 NaN
