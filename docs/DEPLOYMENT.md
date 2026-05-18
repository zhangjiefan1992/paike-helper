# 部署文档

排课助手 H5 + 后端 API 部署指南，使用 Cloudflare 全套白嫖方案。

## 部署架构

```
┌──────────────────────────────────────────────┐
│            浏览器 / 手机端                     │
└────────────────────┬─────────────────────────┘
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────────┐
│         Cloudflare 边缘网络（全球 CDN）         │
│                                              │
│  keleya.org/        → Pages (H5 静态资源)    │
│  keleya.org/api/*   → Worker (paike-api)    │
│  api.keleya.org     → Worker (备用入口)      │
│  www.keleya.org     → Pages                  │
└────────────────────┬─────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
  ┌──────────┐              ┌──────────┐
  │ DashScope │              │ DeepSeek │
  │  阿里云   │              │   LLM    │
  │ (ASR)    │              │ (解析)   │
  └──────────┘              └──────────┘
```

## 域名规划

| 域名 | 用途 | 备注 |
|------|------|------|
| `keleya.org` | H5 主站 | Pages 服务 |
| `www.keleya.org` | H5 主站别名 | Pages 服务 |
| `keleya.org/api/*` | 后端 API | Worker, **同源**调用，无 CORS |
| `api.keleya.org` | 后端 API 备用 | Worker, 跨域调用 |

> **同源策略**：H5 调用 API 时使用相对路径 `/api/v1/...`，避开浏览器 CORS 检查和 Cloudflare 对跨域 multipart POST 的 Bot 拦截。

## 资源清单

### Cloudflare
- **Worker**: `paike-api`（`server/src/worker.js`）
- **Pages**: `paike-web`（`web/dist/`）
- **Zone**: `keleya.org`

### 外部服务
- **阿里云 DashScope**: 语音识别（paraformer/sensevoice/fun-asr 等 6 个可选模型）
- **DeepSeek**: 课后总结生成 + 语音文本结构化解析

## 首次部署

### 1. 准备

确认已有：
- Cloudflare 账号（domain `keleya.org` 已添加并 DNS 托管到 CF）
- 阿里云 DashScope API Key
- DeepSeek API Key
- Node.js 18+ / npm

### 2. 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd ../web
npm install
```

### 3. 登录 Cloudflare

```bash
cd server
npx wrangler login
```

浏览器自动打开 OAuth 授权页面，点 **Allow** 完成授权。

### 4. 设置 Worker 密钥

```bash
echo "sk-xxx-your-dashscope-key" | npx wrangler secret put DASHSCOPE_API_KEY
echo "sk-xxx-your-deepseek-key"  | npx wrangler secret put LLM_API_KEY
```

或交互式：
```bash
npx wrangler secret put DASHSCOPE_API_KEY  # 提示输入时粘贴
npx wrangler secret put LLM_API_KEY
```

### 5. 部署 Worker

```bash
cd server
npm run deploy
```

预期输出：
```
Deployed paike-api triggers (2.16 sec)
  keleya.org/api/* (zone name: keleya.org)
  api.keleya.org (custom domain)
```

### 6. 部署 H5 前端

```bash
cd web

# 配置 API base URL（同源使用空值即可）
echo "VITE_API_BASE=" > .env.production

# 构建
npm run build

# 部署到 Pages
cd ../server
npx wrangler pages deploy ../web/dist \
  --project-name=paike-web \
  --branch=main \
  --commit-dirty=true
```

> 首次部署需要先创建项目：
> ```bash
> npx wrangler pages project create paike-web --production-branch=main
> ```

### 7. 配置自定义域名（首次绑定）

通过 Cloudflare API 绑定（可在 Dashboard 完成）：

```bash
TOKEN="<your-cloudflare-api-token>"
ACCOUNT_ID="<your-account-id>"
ZONE_ID="<keleya-org-zone-id>"

# Worker 绑定 api.keleya.org
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/domains" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data "{\"environment\":\"production\",\"hostname\":\"api.keleya.org\",\"service\":\"paike-api\",\"zone_id\":\"$ZONE_ID\"}"

# Pages 绑定根域名 + www
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/paike-web/domains" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{"name":"keleya.org"}'

curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/paike-web/domains" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{"name":"www.keleya.org"}'
```

> Pages 绑定后状态为 `pending`，需要在 DNS 中加 CNAME 记录指向 `paike-web.pages.dev`。Dashboard UI 操作更简单：
> Workers & Pages → paike-web → Custom domains → Set up a custom domain。

### 8. 验证

| 测试项 | URL | 期望 |
|--------|-----|------|
| Worker 健康检查 | https://api.keleya.org/health | `{"status":"ok"}` |
| Pages 首页 | https://keleya.org | 排课助手 H5 |
| 同源 API | https://keleya.org/api/v1/ai/parse-text | POST 测试通过 |

## 日常更新

### 改后端代码

```bash
cd server
npm run deploy
```

### 改前端代码

```bash
cd web && npm run build
cd ../server && npx wrangler pages deploy ../web/dist \
  --project-name=paike-web --branch=main --commit-dirty=true
```

### 改密钥

```bash
cd server
echo "new-key" | npx wrangler secret put LLM_API_KEY
# Worker 自动热加载，无需重新 deploy
```

### 实时查看 Worker 日志

```bash
cd server
npx wrangler tail paike-api
```

## 环境变量

### Worker (server/wrangler.toml)

```toml
[vars]
ASR_MODEL = "paraformer-v2"            # 默认 ASR 模型，前端可覆盖
LLM_BASE_URL = "https://api.deepseek.com/v1"
LLM_MODEL = "deepseek-chat"
LLM_MAX_TOKENS = "800"
```

### Worker Secrets（通过 wrangler secret put 设置，不进 git）

| 名称 | 用途 |
|------|------|
| `DASHSCOPE_API_KEY` | 阿里云 DashScope 语音识别 |
| `LLM_API_KEY` | DeepSeek API Key |

### Frontend (web/.env.production)

```
VITE_API_BASE=
```

空值表示用相对路径（同源调用）。如果要跨域调用 worker，可设为 `https://api.keleya.org`。

### Local Dev (server/.env，不进 git)

```
PORT=3000
DASHSCOPE_API_KEY=sk-xxx
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
ASR_MODEL=paraformer-v2
```

本地启动 Fastify 开发服务器：`cd server && npm run dev`。

## ASR 模型说明

前端 VoiceInput 组件提供 6 个模型实时切换，用户选择保存到 localStorage：

| 模型 | 适合场景 |
|------|---------|
| `paraformer-v2` | 通用，识别清晰 |
| `paraformer-v1` | 老版稳定 |
| `paraformer-mtl-v1` | 多语言（含外来词如"普拉提"=Pilates）|
| `paraformer-8k-v1` | 8kHz 采样（电话/低质量音频）|
| `sensevoice-v1` | 多方言、抗噪 |
| `fun-asr` | 短句优化（bl CLI 默认）|

后端 `worker.js` 中 `ALLOWED_MODELS` 白名单控制可用模型。

## 成本

| 服务 | 月均成本（教练日均 30 节课）|
|------|----------------------------|
| Cloudflare Workers | ¥0（免费 10万请求/天）|
| Cloudflare Pages | ¥0（免费无限流量）|
| Cloudflare DNS | ¥0（免费）|
| 阿里云 DashScope | ¥10-30（首次注册有免费额度）|
| DeepSeek | <¥2（按 token 计费）|
| **合计** | **<¥30/月** |

## 故障排查

### 1. 浏览器报 CORS error / Failed to fetch

可能原因（按概率）：
1. **Cloudflare Bot Fight Mode 拦截 multipart POST**（最常见）
   - 现象：307 Temporary Redirect + Clear-Site-Data
   - 修复：使用同源调用（`VITE_API_BASE=` 设为空），或在 WAF Custom Rules 添加 Skip 规则
2. **Worker 异常返回 500 但无 CORS 头**
   - 用 `npx wrangler tail` 看具体错误
3. **API Key 未配置**
   - 重新跑 `npx wrangler secret put` 设置

### 2. 公司网络代理拦截 keleya.org

- 现象：响应被改成"安全策略"页面
- 影响：仅影响内网测试，外网/手机网络正常

### 3. ASR 识别准确率低

- 在 H5 VoiceInput 面板顶部切换不同 ASR 模型对比
- 编辑识别原文后点"重新解析"，区分 ASR 错误 vs LLM 解析错误
- 如果某场景下 fun-asr 比 paraformer 好，把 `wrangler.toml` 中的 `ASR_MODEL` 改成对应值

### 4. DeepSeek 调用失败

- DeepSeek 国内访问通常正常，但有时高峰期会 502
- 可切换到阿里云 qwen-plus 等替代：修改 `LLM_BASE_URL` + `LLM_MODEL` + `LLM_API_KEY`
- 兼容 OpenAI 协议的 API 都能直接接入

### 5. 部署后旧版仍生效

- Pages：浏览器强刷（Cmd+Shift+R）或无痕窗口
- Worker：通常秒级生效，等 30 秒重试
- DNS：首次配置可能需要 1-2 分钟传播

## 文件清单

```
server/
├── wrangler.toml              # Worker 配置（routes、vars）
├── package.json               # 依赖（fastify + hono + wrangler）
├── .env.example               # 本地开发环境变量模板
├── .env                       # 本地密钥（gitignored）
└── src/
    ├── worker.js              # Cloudflare Workers 入口（自包含）
    ├── index.js               # 本地 Fastify 服务器（开发用）
    ├── routes/ai.js           # Fastify 路由
    └── services/
        ├── asr.js             # DashScope ASR
        ├── llm.js             # DeepSeek LLM
        └── voiceParser.js     # 语音文本结构化解析

web/
├── .env.production            # 生产环境 API base
├── package.json
└── src/
    ├── components/VoiceInput.vue  # 语音录入（含 6 模型切换）
    ├── services/api.js            # API 客户端
    └── utils/audioRecorder.js     # 浏览器录音（16kHz WAV）

docs/
└── DEPLOYMENT.md              # 本文档
```

## 后续优化

- [ ] GitHub Actions 自动部署（push 到 main 自动 deploy worker + pages）
- [ ] CORS 严格化：从 `*` 改为只允许 `keleya.org` 和 `*.keleya.org`
- [ ] 错误监控：接入 Cloudflare Workers Analytics 或 Sentry
- [ ] 速率限制：Worker 加 KV 存储用户 ID 做配额控制
- [ ] 备份方案：定期 export DashScope/DeepSeek 调用日志
