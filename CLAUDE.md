# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

「排课助手」是一款微信小程序，面向兼职私人教练和小型瑜伽/普拉提工作室，用于课程排期管理。使用微信小程序原生开发（JS + WXML + WXSS），不依赖任何后端服务，数据完全存储在用户手机本地。

- AppID（测试号）：`wxec7783fbf92910fd`
- 最低基础库版本：2.25.0+
- 组件框架：glass-easel

## Development

使用**微信开发者工具**进行开发和预览，无需 npm 构建步骤。导入项目目录后即可编译运行。

## Architecture

### Data Layer (No Backend)

所有数据通过 `wx.setStorageSync` / `wx.getStorageSync` 存储在本地，10MB 上限。

Storage Key 规划：
- `pk_members` — `Member[]` 会员数据
- `pk_sessions` — `Session[]` 课程记录
- `pk_config` — `Config` 预设配置（课程类型、地点、训练重点等）

核心数据工具模块（按 `docs/IMPLEMENTATION.md` 规划）：
- `utils/storage.js` — 本地存储 CRUD 封装（会员、课程、配置、导入导出）
- `utils/dateUtil.js` — 日期工具（周范围计算、格式化、星期几等）
- `utils/idGenerator.js` — 唯一 ID 生成（会员 `m_` 前缀，课程 `s_` 前缀）
- `utils/theme.js` — 主题配置管理
- `data/defaultConfig.js` — 默认预设配置

### Page Structure

底部 TabBar 三个入口：
- `pages/week/` — 周视图（首页），7 列布局展示一周排课
- `pages/members/` — 会员列表，按最近上课时间倒序
- `pages/settings/` — 设置页，预设管理 + 数据导入导出

非 Tab 页面：
- `pages/day/` — 日视图，时间轴形式展示当天课程（从周视图点入）
- `pages/session/` — 课程录入/编辑表单
- `pages/member-detail/` — 会员详情 + 上课时间轴
- `pages/member-edit/` — 新增/编辑会员

### Reusable Components

- `components/session-card/` — 课程卡片（compact 模式用于周视图，完整模式用于日视图）
- `components/empty-state/` — 空状态（插画 + 引导文案）
- `components/tag/` — 标签（可选中、可关闭）
- `components/member-avatar/` — 会员头像

### Theme System

视觉通过 CSS 变量控制，定义在 `app.wxss` 的 `page` 选择器中。第一版内置"动漫暖系"主题（`anime-warm`），架构预留多主题切换。

关键变量前缀：`--color-`（颜色）、`--bg-`（背景）、`--text-`（文字）、`--radius-`（圆角）、`--shadow-`（阴影）、`--spacing-`（间距）、`--font-`（字号）。

课程状态色：scheduled=`#F28B82`、completed=`#81C995`、cancelled=`#CCCCCC`、noshow=`#FFB74D`。

## Key Conventions

- 缩进 2 空格
- CSS 引用主题变量，不硬编码颜色值
- 组件通过 `properties` 接收数据，通过 `triggerEvent` 向外通信
- 页面间传参用 URL query，复杂数据用 `globalData` 或 `eventChannel`
- 列表页使用 `onShow`（而非 `onLoad`）加载数据，确保返回时刷新
- 照片只存临时路径，不存 base64
- 删除操作必须二次确认弹窗
- 写操作提供即时反馈：Toast + `wx.vibrateShort()`

## Reference Documents

- `docs/PRD.md` — 完整产品需求文档（数据模型、页面功能、交互规范、视觉方向）
- `docs/IMPLEMENTATION.md` — 研发实施计划（项目结构、数据层设计、页面规格、组件规格、分阶段任务）
