# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

「排课助手」是一款多端排课管理应用，面向兼职私人教练和小型瑜伽/普拉提工作室。当前支持微信小程序和 H5 两端，共享相同的数据模型和业务逻辑。

## Repository Structure (Monorepo)

```
paike-helper/
├── miniprogram/      ← 微信小程序（原生 JS + WXML + WXSS）
├── web/              ← H5 应用（Vue3 + Vite + Vant 4）
├── cloudfunctions/   ← 微信云函数
├── server/           ← 服务端 API（后续）
├── docs/             ← 共享文档（PRD、实施计划）
├── project.config.json  ← 微信开发者工具配置（miniprogramRoot 指向 miniprogram/）
└── CLAUDE.md
```

## Miniprogram (miniprogram/)

微信小程序原生开发，不依赖后端服务，数据存储在用户手机本地。

- AppID：`wx5f96f0dff1804a89`
- 最低基础库版本：2.25.0+
- 组件框架：glass-easel
- 开发工具：微信开发者工具，导入项目根目录即可（miniprogramRoot 已配置）

### Data Layer

通过 `wx.setStorageSync` / `wx.getStorageSync` 存储，10MB 上限。

Storage Key：
- `pk_members` — `Member[]` 会员数据
- `pk_sessions` — `Session[]` 课程记录
- `pk_config` — `Config` 预设配置

核心模块：
- `miniprogram/utils/storage.js` — 本地存储 CRUD
- `miniprogram/utils/dateUtil.js` — 日期工具
- `miniprogram/utils/idGenerator.js` — ID 生成（会员 `m_` / 课程 `s_`）
- `miniprogram/utils/theme.js` — 主题管理
- `miniprogram/data/defaultConfig.js` — 默认预设

### Page Structure

TabBar 三入口：
- `miniprogram/pages/week/` — 周视图首页
- `miniprogram/pages/members/` — 会员列表
- `miniprogram/pages/settings/` — 设置页

非 Tab 页面：
- `miniprogram/pages/day/` — 日视图
- `miniprogram/pages/session/` — 课程表单
- `miniprogram/pages/member-detail/` — 会员详情
- `miniprogram/pages/member-edit/` — 会员编辑

### Components

- `miniprogram/components/session-card/` — 课程卡片
- `miniprogram/components/empty-state/` — 空状态
- `miniprogram/components/tag/` — 标签
- `miniprogram/components/member-avatar/` — 头像

## H5 Web App (web/)

Vue3 + Vite + Vant 4，移动端优先，localStorage 数据层共享相同 key schema。

- 开发：`cd web && npm run dev`
- 构建：`cd web && npm run build`
- 路由：Hash mode SPA

### Web 核心模块

- `web/src/services/storage.js` — localStorage CRUD（与小程序同 key）
- `web/src/utils/dateUtil.js` — 日期工具
- `web/src/utils/idGenerator.js` — ID 生成
- `web/src/styles/theme.css` — CSS 变量主题
- `web/src/router/index.js` — Vue Router 路由

### Web 页面

- `web/src/views/WeekView.vue` — 周视图
- `web/src/views/DayView.vue` — 日视图
- `web/src/views/SessionForm.vue` — 课程表单
- `web/src/views/MemberList.vue` — 会员列表
- `web/src/views/MemberDetail.vue` — 会员详情
- `web/src/views/MemberEdit.vue` — 会员编辑
- `web/src/views/SettingsView.vue` — 设置页

## Theme System

视觉通过 CSS 变量控制。小程序在 `miniprogram/app.wxss`，H5 在 `web/src/styles/theme.css`。

关键变量前缀：`--color-`、`--bg-`、`--text-`、`--radius-`、`--shadow-`、`--spacing-`、`--font-`

课程状态色：scheduled=`#F28B82`、completed=`#81C995`、cancelled=`#CCCCCC`、noshow=`#FFB74D`

## Key Conventions

- 缩进 2 空格
- CSS 引用主题变量，不硬编码颜色值
- 小程序组件通过 `properties` + `triggerEvent` 通信
- 列表页使用 `onShow`（小程序）/ `activated`（H5 keep-alive）加载数据
- 删除操作必须二次确认弹窗
- 写操作提供即时反馈（Toast）

## Reference Documents

- `docs/PRD.md` — 完整产品需求文档
- `docs/IMPLEMENTATION.md` — 研发实施计划
