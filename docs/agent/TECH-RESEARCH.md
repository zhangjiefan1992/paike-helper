# 技术预研笔记

> **状态**：进行中，所有结论留待最终设计阶段再敲定
> **目的**：把所有候选技术写下来，避免反复讨论

---

## 1. Agent 框架候选

### AgentScope（Python，主推）

**优点**：
- 阿里达摩院维护，跟 DashScope（已有 key）原生集成
- `MsgHub + Pipeline` 完全匹配 4 派辩论 + 裁判结构
- 中文文档完整，工具齐全
- 有 Studio（可视化 debug + 编排）
- 开源 MIT，可以读懂改

**缺点**：
- 没有 Java 版那个 `HarnessAgent` 一体化封装
- 长期运行的 hook / memory consolidation / context compaction 要自己组装
- 但**Phase A 用不到这些**（4 派咨询是短任务）

**Phase A 需要的能力清单**：
- ✅ `DialogAgent`（每个流派 + 裁判）
- ✅ `MsgHub`（共享消息总线）
- ✅ `forlooppipeline / sequentialpipeline`
- ✅ DashScope provider（Qwen-max）
- ✅ 流式输出
- ✅ Multi-Agent Debate 教程现成可参考

**Phase B 可能需要**：
- ReActAgent（如果加复杂工具链）
- task_long_term_memory（跨会话记忆）
- task_state（持久化）
- task_middleware（hook 中间件）

### AgentScope-Java（可能 Phase B 单独用）

**Java 版独有的 `HarnessAgent`**：
- 把 hook + memory consolidation + context overflow handling + session persistence + subagent + 可插拔 filesystem 一体化
- 对应 Java 文档：https://java.agentscope.io/zh/harness/overview.html
- 三根支柱：身份持续 / 上下文可控 / 状态可恢复
- 注入 `AGENTS.md / MEMORY.md / KNOWLEDGE.md` 当作"agent 的人格 + 知识"

**Python 等价物**：手动组合 `hooks + long_term_memory + state + middleware`，能做到一样的事，但代码量多 100-200 行。

**结论**：Phase A 不用纠结，Phase B 如果某个 agent 真的需要 harness 全套，**可以那个 agent 用 Java，主编排 Python**（AgentScope 支持 RPC 跨语言 agent 通信）。

### Pi / Claude Code / OpenCode（不适合）

- 这是**单用户终端编码 agent**，不是多 agent 应用框架
- 强行用 = 杀鸡用牛刀 + 错配抽象层
- 留作 Phase B 候选：如果某个 agent 是"复杂代码生成式任务"再考虑
- Pi (https://pi.dev/docs/latest) 是 npm 包，单进程交互式 TUI

### LangGraph / AutoGen / CrewAI（备胎）

**LangGraph (TS/Python)**：
- 图状状态机更复杂场景适合
- TypeScript 版完整，可以跟 Cloudflare Worker 同栈
- 但 4 派辩论这个场景，LangGraph 比 AgentScope 重

**AutoGen (Microsoft)**：
- 多 agent 聊天范式
- AgentScope 是它的中国对手
- 选哪个看生态，DashScope 集成 AgentScope 完胜

**CrewAI**：
- 角色驱动，Crew = 一组角色
- 实际上还是 Pipeline 思路
- AgentScope 在我们场景里更直接

---

## 2. LLM 选型

| Model | 用途 | 单次成本（粗估）| 备注 |
|-------|------|---------------|------|
| **Qwen-Max**（阿里）| 4 派 / 裁判主力 | 输入 ¥20/M token，输出 ¥60/M | 跟 DashScope 同账号，最便宜方案 |
| **DeepSeek-V3** | 备选 / 长 context | 输入 ¥1/M，输出 ¥2/M | 极便宜但中文流派理解略弱 |
| **Claude Sonnet 4** | 复杂推理 / 评测 | 输入 ¥21/M，输出 ¥105/M | 质量上限，成本高 |
| **GPT-4o** | 评测对比 | 输入 ¥17/M，输出 ¥70/M | 用于 LLM-as-judge 评估 |

**Phase A 默认**：Qwen-Max（性价比 + DashScope 集成）

**单次咨询成本估算**（4 派 + 1 裁判，每 agent 平均 2K input + 800 output）：
- Qwen-Max: 4×(2K×¥20/M + 800×¥60/M) + 1×(8K×¥20/M + 1500×¥60/M) = ¥0.04 + ¥0.25 ≈ **¥0.30 左右**
- DeepSeek-V3: ¥0.015
- 太贵会触发反向指标，需要看实际情况

---

## 3. 知识层架构（已部分敲定）

### 决策：llm-wiki 模式（不做向量 RAG）

- 用 LLM 离线把原始教材**蒸馏**成结构化 wiki.md
- agent 启动时把对应流派的 wiki.md **完整灌进 system prompt**
- 长 context 模型（Qwen-Max 32K / DeepSeek 128K）能轻松装下

### 流程

```
[原始资料 paike-knowledge-source repo]
    ↓ Claude Code 在本地 Mac 运行蒸馏
[wiki.md 草稿]
    ↓ 你审核 + 改写
[wiki.md vN.md commit 到 paike-helper/knowledge/distilled/]
    ↓ npm run publish
[Cloudflare R2 paike-knowledge bucket]
    ↓ Agent runtime 拉取 + 内存缓存
[agent 用]
```

### 4 个流派分类（已定）

- **经典派**（原始普拉提，控制 / 呼吸 / 流畅）
- **当代派**（生物力学 / 个性化 / 当代教学法）
- **康复派**（临床 / 损伤 / 特殊人群）
- **健身派**（体能塑形 / 强度 / 表现）

**避开品牌名**，用流派思想分类，IP 风险最低。

### 资料管理（已定）

- **原始资料**：单独 private repo `paike-knowledge-source`（不入主 repo）
- **蒸馏产物**：commit 到 `paike-helper/knowledge/distilled/`
- **生产**：published 到 Cloudflare R2

---

## 4. 部署架构

### 候选方案

**方案 A**：阿里云函数计算 FC + Python + AgentScope（推荐）
- 跟 DashScope 同账号
- 按调用计费，agent 用得少时几乎不花钱
- 自定义域名挂 ai.keleya.org
- 冷启动 ~1-2s（可预留实例消除）
- 超时上限 600s 够用

**方案 B**：阿里云 ECS + Docker（备选）
- 24/7 运行无冷启动
- 月费 ¥30-60
- 自己维护 OS / 监控

**方案 C**：Cloudflare Containers（新出，beta）
- 留意，可能未来值得切

**当前结论**：方案 A FC

### 子域名 + DNS

```
ai.keleya.org   CNAME   <fc-endpoint>.fcv3.cn-shanghai.aliyuncs.com
                        DNS only（不走 Cloudflare 代理）
```

H5 浏览器直连 OK，小程序仍需通过云函数代理（ICP 限制）。

### 流量路径

```
H5 (keleya.org) ─→ Cloudflare Worker (api.keleya.org) ─→ FC (ai.keleya.org)
小程序 ─→ wx.cloud.callFunction(agentConsult) ─→ FC (直连，云函数无 ICP 限制)
```

---

## 5. Conversation State 持久化

### 候选

| 选项 | 优势 | 劣势 |
|------|------|------|
| **阿里云 RDS PostgreSQL** | 关系型成熟，关联查询方便 | 月费 ¥40+，过重 |
| **阿里云 OTS（Tablestore）** | 按量计费 | NoSQL，跨表关联不便 |
| **Cloudflare D1（SQLite）** | 极便宜，跟 Worker 同栈 | 在 FC 那边访问要 HTTP |
| **MongoDB Atlas Lite** | 文档型适合对话 | 月费 |
| **本地 SQLite + OSS 备份** | 最便宜 | FC 多实例不行 |

**当前倾向**：Cloudflare D1（如果走方案 A FC + Worker，用 D1 走 Worker API 访问）

### Schema 草稿

```sql
-- 会话
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,           -- 教练 id
  member_id TEXT,                   -- 关联会员（可空，留给"通用咨询"）
  pipeline_id TEXT NOT NULL,       -- consult / deepen / cmp
  scratchpad JSON,                  -- 共享工作区
  created_at INTEGER,
  updated_at INTEGER
);

-- 消息
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  turn INTEGER,
  role TEXT,                        -- user / agent / system / tool
  source TEXT,                      -- agent id 或 'user'
  visible_to JSON,                  -- 数组或 'all'
  content TEXT,
  payload JSON,                     -- 结构化 payload
  meta JSON,
  created_at INTEGER
);
```

---

## 6. 监控 / 评测 / Trace

### 候选

- **AgentScope Studio**：本地 debug 时用
- **Langfuse**：开源 LLM observability，自托管或 Cloud
- **AgentScope Tracing + 自建 dashboard**：成本最低

### 评测集（内测期需要）

`paike-agent/tests/eval/` 里准备 10-20 条场景，每条人工标注"理想输出"，定期跑评测看回归。

---

## 7. 仍然开放的技术问题

> 不在文档现在回答，留给真实落地阶段再决断。

- [ ] 流式 SSE：FC 函数计算原生支持 SSE 流式响应吗？还是需要 WebSocket / 长连接？
- [ ] FC 冷启动：4 派并行调用 + wiki 加载，冷启动会不会很慢？是否要常驻预留实例？
- [ ] 知识层版本：教练能否选择"用旧版 wiki"？还是永远用 latest？
- [ ] 4 派 agent 的输出失败时，重试策略？谁来 retry（Worker 边缘 vs FC 内部）？
- [ ] 跨 agent visibility 控制：MsgHub 是否原生支持？
- [ ] AgentScope Python 用什么版本？（v0.x vs v1.x，breaking changes）
- [ ] Tool calling 标准：用 OpenAI function calling 还是 DashScope 自己的？
- [ ] 是否要做 prompt 版本化 + AB test 框架？

---

## 8. 现有代码资产盘点

可以复用的：
- `cloudfunctions/parseSegments`（小程序云函数代理模式可复刻成 `agentConsult`）
- `server/src/worker.js` 的 SSE 流式输出模式
- `web/src/services/api.js` 的 fetch 客户端模式
- 蓝图：H5 SessionForm 的 VoiceInput 组件可改造成 AI 咨询主面板（虽然语音砍了，但 UI 框架可参考）

新增的：
- `paike-agent/`（Python repo，独立部署到 FC）
- `paike-knowledge-source/`（private repo，原始资料）
- `paike-helper/knowledge/`（蒸馏产物 + publish 脚本）
