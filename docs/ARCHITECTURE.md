# 排课助手 · 系统架构

## 全局架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            用户设备                                      │
├────────────────────────┬────────────────────────────────────────────────┤
│   微信小程序            │          H5 (Vue3 + Vant 4)                    │
│   原生 WXML/JS         │          keleya.org (CF Pages)                 │
└───────────┬────────────┴───────────────────┬───────────────────────────-┘
            │                                │
            │ wx.cloud.callFunction          │ fetch /api/v1/*
            ▼                                ▼
┌───────────────────────┐      ┌─────────────────────────────────────────┐
│  微信云函数 (代理)      │      │  Cloudflare Worker (paike-api)           │
│  aiConsult / aiFollowup│─────▶│  keleya.org/api/* + api.keleya.org      │
│  parseVoiceSession     │      │                                         │
└───────────────────────┘      │  路由:                                   │
                               │  /api/v1/ai/*     → DeepSeek 直调        │
                               │  /api/v1/agent/*  → Agent FC 代理        │
                               └──────────────────┬──────────────────────┘
                                                  │
                                                  │ AGENT_SERVICE_URL
                                                  ▼
                               ┌─────────────────────────────────────────┐
                               │  阿里云函数计算 FC 3.0 (cn-hangzhou)      │
                               │  paike-agent (custom-container)          │
                               │  Python 3.11 + FastAPI                   │
                               │                                         │
                               │  /api/v1/agent/consult                  │
                               │  /api/v1/agent/followup                 │
                               │                                         │
                               │  ┌───────────────────────────────────┐  │
                               │  │ 4 流派 Agent (并行)                │  │
                               │  │ 罗马纳 │ 斯多特 │ 北极星 │ BASI  │  │
                               │  └───────────────┬───────────────────┘  │
                               │                  │                      │
                               │  ┌───────────────▼───────────────────┐  │
                               │  │  裁判 Agent (综合 + 结构化输出)     │  │
                               │  └───────────────────────────────────┘  │
                               │                                         │
                               │  知识层: /app/knowledge/distilled/       │
                               │  (4 个 wiki.md 直接塞 prompt context)   │
                               └──────────────────┬──────────────────────┘
                                                  │
                                                  │ OpenAI-compatible API
                                                  ▼
                               ┌─────────────────────────────────────────┐
                               │  DeepSeek V4 (deepseek-chat)            │
                               │  https://api.deepseek.com               │
                               └─────────────────────────────────────────┘
```

## 各层职责

| 层 | 技术栈 | 部署位置 | 职责 |
|---|---|---|---|
| 小程序端 | 微信原生 | 微信平台 | 用户界面，本地数据，云函数代理 |
| H5 端 | Vue3 + Vite + Vant 4 | Cloudflare Pages | 用户界面，localStorage 数据 |
| 网关层 | Hono (CF Worker) | Cloudflare Workers | CORS、路由分发、LLM 直调、Agent 代理 |
| Agent 层 | Python + FastAPI | 阿里云 FC (Docker) | 多流派并行推理 + 裁判综合 |
| LLM 层 | DeepSeek V4 | DeepSeek 云端 | 大模型推理 |
| 知识层 | wiki.md 文件 | 随 Docker 镜像打包 | 流派知识（直接塞 prompt，不用 RAG） |

## 部署指南

### 前置条件

- Node.js 18+
- Docker（macOS 推荐 Colima：`colima start --arch amd64 --cpu 2 --memory 4`）
- 阿里云 CLI（`aliyun`，已配置 AccessKey）
- Wrangler CLI（`npx wrangler`，已登录 Cloudflare）
- 微信开发者工具

### 1. Agent 服务部署（阿里云 FC）

```bash
cd agent

# 复制知识文件到 Docker 构建上下文
cp -r ../knowledge ./knowledge

# 构建镜像（必须 amd64）
docker build --platform linux/amd64 -t paike-agent .

# 推送到阿里云 ACR
docker tag paike-agent crpi-99pig5990uo7iykz.cn-hangzhou.personal.cr.aliyuncs.com/paike_helper/keleya-agent:latest
docker push crpi-99pig5990uo7iykz.cn-hangzhou.personal.cr.aliyuncs.com/paike_helper/keleya-agent:latest

# 更新 FC 函数（如已创建）
aliyun fc UpdateFunction --functionName paike-agent --region cn-hangzhou \
  --body '{
    "customContainerConfig": {
      "image": "crpi-99pig5990uo7iykz.cn-hangzhou.personal.cr.aliyuncs.com/paike_helper/keleya-agent:latest"
    }
  }'
```

**环境变量（FC 控制台或 CLI 设置）：**
- `DEEPSEEK_API_KEY` — DeepSeek API 密钥
- `KNOWLEDGE_DIR` — `/app/knowledge/distilled`
- `PORT` — `9000`
- `LOG_LEVEL` — `info`

**FC 公网地址：** `https://paike-agent-pxwunohxjz.cn-hangzhou.fcapp.run`

### 2. Worker 网关部署（Cloudflare）

```bash
cd server
npx wrangler deploy
```

**Secrets（通过 wrangler secret put 设置）：**
- `LLM_API_KEY` — DeepSeek API Key
- `DASHSCOPE_API_KEY` — 阿里云 DashScope Key（ASR 用）
- `AGENT_SERVICE_URL` — FC Agent 地址

**绑定域名：** `keleya.org/api/*` + `api.keleya.org`

### 3. H5 前端部署（Cloudflare Pages）

```bash
cd web
npm run build
npx wrangler pages deploy dist --project-name paike-web
```

**域名：** `keleya.org`（Pages 自定义域名）

### 4. 小程序发布

微信开发者工具 → 上传 → 提交审核

**云函数：** 在微信云开发控制台部署 `cloudfunctions/` 下的函数

### 5. 知识更新（见下方「知识蒸馏管线」）

---

## ⭐ 知识蒸馏管线（核心能力）

这是整个 AI Agent 的知识引擎——从原始教学资料到可注入 prompt 的结构化知识。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        知 识 蒸 馏 管 线                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────┐                                              │
│  │  原始教学资料           │  ← 私有 Git Repo: paike-knowledge-source    │
│  │  · 教材 PDF / 扫描件   │     (不进主仓库，独立管理)                     │
│  │  · 培训笔记 / 视频转录 │                                              │
│  │  · 教练经验沉淀        │                                              │
│  └──────────┬────────────┘                                              │
│             │                                                           │
│             │ 蒸馏工具（人工 + AI 辅助）                                   │
│             │ ┌────────────────────────────────────────┐                │
│             ├─│ LLM 直接蒸馏 (DeepSeek / Claude)       │                │
│             ├─│ NotebookLM → Audio → 结构化摘要        │                │
│             └─│ 人工审核 + 领域专家校验                  │                │
│               └────────────────────────────────────────┘                │
│             │                                                           │
│             ▼                                                           │
│  ┌───────────────────────┐                                              │
│  │  蒸馏产物 (wiki.md)    │  ← 主仓库: knowledge/distilled/             │
│  │  · romana.md           │     Git tracked，版本可追溯                   │
│  │  · stott.md            │     每文件 ≈ 3000-5000 tokens               │
│  │  · polestar.md         │     结构化 Markdown，塞 prompt 即用           │
│  │  · basi.md             │                                              │
│  └──────────┬────────────┘                                              │
│             │                                                           │
│             │ docker build (COPY 进镜像)                                 │
│             ▼                                                           │
│  ┌───────────────────────┐                                              │
│  │  运行时知识注入         │  → FC 容器 /app/knowledge/distilled/         │
│  │  直接塞入 system prompt │     Agent 启动时读取，作为各流派上下文         │
│  │  不走 RAG / 不走向量库  │                                              │
│  └───────────────────────┘                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 仓库分工

| 仓库 | 地址 | 内容 | 体积 |
|------|------|------|------|
| **原始资料** | `github.com/zhangjiefan1992/paike-helper-source-knowledge` | 视频、PDF、文章、转录文本 + 蒸馏产物 | 几十 GB（视频为主） |
| **主仓库** | `github.com/zhangjiefan1992/paike-helper` | `knowledge/distilled/*.md`（同步自 source） | 几十 KB |

**构建隔离原则**：Docker 镜像只依赖主仓库，绝不 clone source repo。视频等大文件不进入构建链。

### Source Repo 结构（推荐）

```
paike-helper-source-knowledge/
├── raw/                          ← 原始资料
│   ├── videos/                   ← .gitignore（太大不入 Git）
│   ├── pdfs/                     ← 教材扫描件
│   ├── transcripts/              ← 视频转录文本（ASR 产物）
│   └── notes/                    ← 培训笔记
├── distilled/                    ← 蒸馏产物（LLM-wiki / NotebookLM 输出）
│   ├── romana.md
│   ├── stott.md
│   ├── polestar.md
│   └── basi.md
├── .gitignore                    ← 排除 raw/videos/
└── README.md
```

**视频处理**：不用 Git 管理视频原件。蒸馏只需要转录文本（ASR → `raw/transcripts/`），视频存本地/NAS/OSS 即可。

### 设计原则

| 原则 | 说明 |
|------|------|
| **不用 RAG** | wiki.md 直接塞 prompt context，token 成本可控（4 文件 ≈ 15K tokens） |
| **人工把关** | 蒸馏产物必须经领域专家校验，AI 辅助但不自动发布 |
| **版本追溯** | 蒸馏结果同步到主仓库 git，每次修改有 commit 记录 |
| **原始隔离** | 原始资料（含视频/版权内容）在独立私有 repo，不混入主仓库 |
| **构建解耦** | Docker build 只看主仓库，不依赖 source repo 网络访问 |

### 蒸馏流程

```bash
# 1. 在 source repo 准备原始资料
cd paike-helper-source-knowledge/
# 视频 → ASR 转录 → raw/transcripts/
# 教材 → OCR / 手打 → raw/pdfs/ 或 raw/notes/

# 2. 蒸馏（选一种或组合）
#    a) LLM 直接蒸馏：喂入转录/笔记 → 输出结构化 wiki
#    b) NotebookLM：上传 PDF/文本 → 生成 Audio Overview → 结构化摘要
#    c) LLM-wiki 工具：自动生成 wiki 格式
#    输出到 distilled/ 目录，控制在 3000-5000 tokens/文件

# 3. 人工审核 + 领域专家校验
#    确认关键知识点、禁忌、适用场景无遗漏

# 4. 同步到主仓库（手动或脚本）
cp distilled/*.md ~/WeChatProjects/paike-helper/knowledge/distilled/
cd ~/WeChatProjects/paike-helper
git add knowledge/distilled/ && git commit -m "knowledge: update distilled wiki"

# 5. 重建 Agent 镜像并推送
cd agent && cp -r ../knowledge ./knowledge
docker build --platform linux/amd64 -t paike-agent .
docker push crpi-99pig5990uo7iykz.cn-hangzhou.personal.cr.aliyuncs.com/paike_helper/keleya-agent:latest
```

### 蒸馏工具选型（待评估）

| 工具 | 能力 | 自动化 | 适用场景 |
|------|------|--------|----------|
| **NotebookLM** | 视频/PDF/音频全吃，问答效果最好 | ❌ 交互式 | 深度理解，核心内容 |
| **Gemini 2.5 API** | 直接吃视频（≤1h），多模态理解 | ✅ 可脚本化 | 批量处理，画面+音频 |
| **Whisper + DeepSeek** | 本地 ASR → LLM 结构化 | ✅ 全自动 | 纯音频内容，成本极低 |
| **通义听悟** | 视频→时间戳文字+摘要 | ✅ API | 中文语音识别 |

当前优先级：**NotebookLM 手动蒸馏 → 验证效果 → 再决定是否自动化**

### 演进方向：NotebookLM 作为运行时知识源

当前架构是「预蒸馏 → 静态 wiki.md → 塞 prompt」。未来可能的演进：

```
方案 A（当前）：                    方案 B（未来可能）：
预蒸馏 → 静态 wiki.md              Agent → 实时查询 NotebookLM
Agent 启动时一次性读取               NotebookLM 内已加载全部原始资料
适合：知识稳定、变化慢              适合：知识量大、需要精准检索
```

方案 B 的核心思路：NotebookLM 本身就是 Google 的 RAG，不需要自建。
如果 Agent 能调用 NotebookLM 获取答案，等于用 Google 的检索能力替代自建向量库——
符合「不自建 RAG」原则。

**待验证**：NotebookLM 是否有 API / MCP 可供 Agent 运行时调用。

### 未来可选优化

- **CI 自动同步**：source repo `distilled/` 变更 → GitHub Action → 主仓库 PR
- **如需检索**：接入 RAGFlow 或 NotebookLM（不自建向量库）
- **质量评估**：蒸馏前后 diff 对比 + token 数检查
- **视频存储**：阿里云 OSS 存原始视频，source repo 只存引用链接
- **Gemini 蒸馏脚本**：source repo 内置自动化脚本（待 API Key 就绪后实现）

---

## 关键约束

- **无 ICP 备案**：keleya.org 没有 ICP，小程序不能直连，必须走云函数代理
- **无 RAG**：知识层永远用 wiki.md 直接塞 prompt context，不自建向量数据库
- **非流式**：小程序端云函数不支持 SSE，走非流式（约 5-8 秒）
- **DeepSeek V4 唯一模型**：所有 LLM 调用统一走 DeepSeek
- **数据本地存储**：用户数据存手机本地（localStorage/wx.storage），不上云

## 成本估算

| 服务 | 计费模式 | 预估月费 |
|---|---|---|
| 阿里云 FC | 按调用 + 执行时长 | ¥5-20（低频使用） |
| Cloudflare Workers | 免费套餐 10万请求/天 | ¥0 |
| Cloudflare Pages | 免费 | ¥0 |
| DeepSeek API | ¥2/百万 token (input) | ¥10-30 |
| 阿里云 ACR | 个人版免费 | ¥0 |
| **合计** | | **¥15-50/月** |
