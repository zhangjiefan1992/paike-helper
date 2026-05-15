# 服务端架构设计

> 版本：v1.0  
> 日期：2026-05-15  
> 定位：能力网关（文件存储 + LLM + 认证），非业务中台

---

## 一、技术选型

| 层 | 选型 | 理由 |
|----|------|------|
| 运行时 | **Node.js 20 LTS** | 前后端同语言，生态成熟，部署轻量 |
| 框架 | **Fastify** | 比 Express 快 2x，内置 schema 校验、日志，插件体系干净 |
| 鉴权 | **JWT (RS256)** | 非对称签名，私钥不出服务端，公钥可下发给各端验签 |
| 文件存储 | **MinIO**（自建）或 **阿里云 OSS** | S3 协议兼容，presigned URL 模式 |
| LLM | **OpenAI 兼容协议** | 通义千问/DeepSeek/OpenAI 都走同一协议 |
| 部署 | **Docker + Nginx** | 单机部署，Nginx 做反代 + TLS + 限流第一道防线 |

不引入数据库——Phase 1 服务端是无状态网关，用户数据仍在客户端本地。

---

## 二、安全架构（重点）

### 2.1 四层防御体系

```
互联网流量
    │
    ▼
┌──────────────────────────────┐
│  L1: Nginx 反代               │  TLS终止、IP限流、请求体大小限制
│      (或 Cloudflare CDN)      │  CC攻击拦截、地域封禁
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  L2: Fastify 全局中间件       │  CORS白名单、Helmet安全头
│                              │  请求频率限制（每用户/每IP）
│                              │  请求体schema强校验
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  L3: 业务层校验               │  JWT鉴权、权限检查
│                              │  文件类型/大小白名单
│                              │  LLM prompt注入防护
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  L4: 外部服务隔离             │  AK仅在环境变量，不入代码
│                              │  MinIO/LLM内网访问
│                              │  超时熔断、异常不透传
└──────────────────────────────┘
```

### 2.2 具体措施清单

#### Nginx 层（第一道墙）

```nginx
# 全局限流：每IP每秒10个请求，突发20
limit_req_zone $binary_remote_addr zone=global:10m rate=10r/s;

# 请求体大小限制（防大文件攻击）
client_max_body_size 10m;

# 隐藏服务器信息
server_tokens off;
proxy_hide_header X-Powered-By;

# 只允许必要的HTTP方法
if ($request_method !~ ^(GET|POST|PUT|DELETE|OPTIONS)$) {
    return 405;
}

# 强制 HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

#### Fastify 层

```
安全头（Helmet）:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Strict-Transport-Security: max-age=31536000
  - Content-Security-Policy: default-src 'self'

CORS 白名单:
  - 小程序域名（servicewechat.com）
  - H5 域名（你的部署域名）
  - localhost（开发环境，仅 NODE_ENV=development 时开启）

频率限制（per route）:
  - 认证接口: 5次/分钟/IP（防爆破）
  - 文件上传: 30次/小时/用户（防滥用）
  - LLM接口: 10次/分钟/用户（防刷量）
  - 普通接口: 60次/分钟/用户
```

#### JWT 设计

```
签发: RS256 非对称签名
有效期: access_token 2小时, refresh_token 30天
载荷: { uid, platform, iat, exp }
续签: refresh_token 换新 access_token，refresh_token 本身一次性使用

流程:
  小程序: wx.login() → code → POST /api/auth/wx-login → { access_token, refresh_token }
  H5:    手机+验证码 → POST /api/auth/sms-login → { access_token, refresh_token }
```

#### 文件上传安全

```
白名单后缀: .jpg, .jpeg, .png, .webp, .heic
MIME 校验: 读文件头 magic bytes，不信任 Content-Type
单文件上限: 5MB
单用户存储配额: 500MB（Phase 1 足够）
文件名: 服务端生成，不使用客户端文件名（防路径遍历）
存储路径: /{uid}/{date}/{random}.{ext}
```

#### LLM 安全

```
AK: 仅存环境变量，不入代码仓库
Prompt: 服务端拼装 system prompt，客户端只传业务参数
超时: 单次请求 30s 熔断
tokens 限制: 单次请求 max_tokens=2000
费用兜底: 每用户每日 LLM 调用上限 50 次
输入过滤: 去除客户端传入的 system/role 字段（防 prompt 注入）
```

---

## 三、API 协议设计

### 3.1 通用规范

```
Base URL:  https://{domain}/api/v1
Content-Type: application/json（文件上传除外）
认证方式: Authorization: Bearer {access_token}
版本策略: URL 路径版本 /v1/

请求格式:
  GET    /api/v1/resource         → 查询
  POST   /api/v1/resource         → 创建
  PUT    /api/v1/resource/:id     → 更新
  DELETE /api/v1/resource/:id     → 删除

统一响应格式:
  成功: { "code": 0, "data": {...} }
  失败: { "code": 40001, "message": "具体错误描述" }
  分页: { "code": 0, "data": { "list": [...], "total": 100, "page": 1, "pageSize": 20 } }
```

### 3.2 错误码规划

```
0       成功
40001   参数校验失败（附带 field + reason）
40101   未登录（token 缺失）
40102   token 过期（客户端应走 refresh 流程）
40103   token 无效
40301   无权限
42901   频率限制（附带 retryAfter 秒数）
50001   服务内部错误（不透传具体原因）
50201   LLM 服务不可用
50202   存储服务不可用
```

### 3.3 接口清单（Phase 1）

#### 认证

```
POST /api/v1/auth/wx-login
  请求: { code: string }
  响应: { access_token, refresh_token, expires_in }

POST /api/v1/auth/sms-login
  请求: { phone: string, smsCode: string }
  响应: { access_token, refresh_token, expires_in }

POST /api/v1/auth/refresh
  请求: { refresh_token: string }
  响应: { access_token, refresh_token, expires_in }
```

#### 文件存储

```
POST /api/v1/file/presign
  请求: { filename: string, contentType: string, size: number }
  校验: 白名单后缀 + 大小 ≤ 5MB
  响应: { uploadUrl: string, fileKey: string, expires: number }
  说明: 客户端拿 uploadUrl 直传 MinIO/OSS，不经过服务端

GET /api/v1/file/:fileKey
  响应: 302 → presigned download URL
  说明: 生成临时下载链接（有效期 1 小时）

DELETE /api/v1/file/:fileKey
  响应: { code: 0 }
```

#### LLM 能力

```
POST /api/v1/ai/summary
  请求: { sessions: Session[], memberName: string, lang?: string }
  响应: SSE stream → { event: "chunk", data: "文本片段" } ... { event: "done" }
  说明: 多节课训练总结报告

POST /api/v1/ai/parse-text
  请求: { text: string }
  响应: { sessions: ParsedSession[] }
  说明: 自然语言/语音转录文本 → 结构化排课数据

POST /api/v1/ai/speech-to-text
  请求: multipart/form-data { audio: File }
  校验: ≤ 2MB, 格式 mp3/m4a/wav/silk
  响应: { text: string }
  说明: 语音文件 → 文字（可串联 parse-text 实现语音排课）
```

### 3.4 客户端 SDK 封装思路

```javascript
// web/src/services/api.js — 未来替代直接调 storage

class ApiClient {
  constructor(baseURL) { ... }

  // 拦截器：自动附加 token
  // 拦截器：401 时自动 refresh 重试一次
  // 拦截器：429 时读 retryAfter 自动延迟重试

  async uploadFile(file) {
    // 1. POST /file/presign → 拿 uploadUrl
    // 2. PUT uploadUrl → 直传 OSS
    // 3. 返回 fileKey
  }

  async aiSummary(sessions, memberName) {
    // SSE 流式返回
  }
}
```

---

## 四、部署架构

```
                    ┌─────────────┐
                    │  Cloudflare │  可选：DDos防护 + CDN
                    │  (免费版)   │  WAF规则、5s盾
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Nginx     │  TLS、限流、反代
                    │   :443      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼───┐ ┌──────▼───┐ ┌─────▼────┐
       │ Fastify  │ │  MinIO   │ │  H5静态  │
       │ :3000    │ │  :9000   │ │  文件    │
       │ (API)    │ │ (内网)   │ │         │
       └──────────┘ └──────────┘ └──────────┘

Docker Compose 一键启动:
  - paike-api     (Node.js Fastify)
  - paike-minio   (MinIO，不暴露公网)
  - paike-nginx   (Nginx反代，唯一入口)
```

**MinIO 不暴露公网**——所有文件访问通过 API 层签发 presigned URL，MinIO 监听 127.0.0.1 或 Docker 内网。

---

## 五、环境变量清单

```env
# 服务
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRES=2h
JWT_REFRESH_EXPIRES=30d

# 微信
WX_APPID=wx5f96f0dff1804a89
WX_SECRET=***

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=***
MINIO_SECRET_KEY=***
MINIO_BUCKET=paike-files

# LLM
LLM_PROVIDER=deepseek
LLM_API_KEY=***
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=2000

# 限流
RATE_LIMIT_AUTH=5/min
RATE_LIMIT_UPLOAD=30/hour
RATE_LIMIT_AI=10/min

# 短信（Phase 1 可暂缓，先做微信登录）
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY=***
SMS_SECRET_KEY=***
```

`.env` 文件加入 `.gitignore`，仓库中放 `.env.example` 作模板。

---

## 六、落地节奏

```
Step 1: 项目骨架 + JWT 认证 + 健康检查
Step 2: 文件存储（presign 上传 + 下载）
Step 3: LLM 网关（summary + parse-text）
Step 4: Docker Compose + Nginx 部署配置
Step 5: 客户端接入（先 H5，再小程序）
```
