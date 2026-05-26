# 已敲定决策（不再讨论）

> 这里只放**已经达成共识、不再反复讨论的决策**。
> 每条决策标日期 + 理由，避免后续遗忘。

---

## D1 · 流派分类（2026-05-26）

**决策**：用四个**思想流派**，不出现品牌名

- 经典派
- 当代派
- 康复派
- 健身派

**理由**：避开 Stott / Polestar / BASI 等品牌的 IP / 商标问题，行业通用术语，扩展性强。

---

## D2 · IP 策略（2026-05-26）

**决策**：用 llm-wiki 蒸馏模式，不做向量 RAG

- 原始教材 → LLM 蒸馏 → 用户审核 → 入库
- agent 用蒸馏后的 wiki 作 system prompt，不接触原文
- 输出基于蒸馏内容，原文不可追溯
- 必带免责声明："AI 生成建议，不代表任何品牌官方意见"

**理由**：
- 直接 RAG 教材原文有侵权风险
- llm-wiki 是 AI 二次创作 + 用户审核，已经离原作两层
- IP 风险显著降低

---

## D3 · 知识层与 Agent 解耦（2026-05-26）

**决策**：知识层（wiki.md）通过 Cloudflare R2 发布，Agent runtime 拉取，**不打包**

- 蒸馏在本地 Mac 跑（用 Claude Code）
- 蒸馏产物 commit 到 `paike-helper/knowledge/distilled/`（git 审计）
- 发布到 Cloudflare R2
- Agent 启动从 R2 拉，内存缓存
- 更新 wiki **不需要**重新部署 Agent

**理由**：解耦 + 持续更新需求 + 健壮性（版本化 / 原子切换 / 一键回滚）。

---

## D4 · 资料管理（2026-05-26）

**决策**：

- **原始资料**：单独 private repo `paike-knowledge-source`（不入主 repo）
- **蒸馏脚本 + 产物**：在 `paike-helper/knowledge/`（主 repo 内）
- **生产**：published 到 Cloudflare R2
- 蒸馏在你 Mac 本地跑（用 Claude Code）

**理由**：原始 PDF 大不入 git，蒸馏产物小可审计，版本控制清晰。

---

## D5 · Agent 框架（2026-05-26）

**决策**：

- **Phase A**：Python + AgentScope（4 派 + 裁判，MsgHub + Pipeline）
- **不用** Pi / Claude Code / OpenCode（错配抽象，开发者工具不是 agent runtime）
- **不自己造**：AgentScope 就是成熟 agent driver

**理由**：
- AgentScope 是阿里出品，跟 DashScope / Qwen 原生集成
- MsgHub + Pipeline 是 4 派辩论的天然抽象
- Python 生态 LLM 工具链成熟
- 我们做的是"在 AgentScope 上二次编排"，不是自造框架

---

## D6 · ReAct vs One-shot（2026-05-26）

**决策**：Phase A 用 **one-shot 多 agent**（每个 agent 一次 LLM 调用）

- 4 派 agent 各 one-shot 输出 schema-validated JSON
- 1 裁判 agent one-shot 综合
- Pipeline 流程硬编码（不让 LLM 决定下一步）

**Phase B 视情况引入**：
- 如果某些场景需要 agent 调工具（查会员 / 翻 wiki section），用 AgentScope `ReActAgent`
- 但 ReAct 节点内部的 loop，外部 pipeline 还是确定性

**理由**：
- 普拉提咨询本质是"给定 X 推 Y"，信息齐全无需探索
- One-shot 延迟低 / 成本低 / 可预测 / 易调试
- 过早 ReAct 是技术炫技

---

## D7 · 部署形态（2026-05-26）

**决策**：

- **Agent 服务**：Python + FastAPI + AgentScope，部署到 **阿里云函数计算 FC**
- **域名**：ai.keleya.org（CNAME 到 FC，DNS only 不走 Cloudflare 代理）
- **流量路径**：
  - H5 → Cloudflare Worker → FC（反向代理 + 鉴权）
  - 小程序 → 云函数 `agentConsult` → FC
- **数据**：会员数据从主后端拿（不在 agent 服务里复制）

**理由**：
- FC 跟 DashScope 同账号，省事
- 按调用计费，低使用时几乎不花钱
- 自定义域名挂载方便
- 主 Worker 当边缘网关有现成基础设施

---

## D9 · Session V2 数据模型与 AI 输出对齐（2026-05-26）

**决策**：

- AI 备课建议的输出 schema **直接对齐 V2 目标 Session model**，不是抽象描述性建议
- V2 字段参考真实教练记录格式（参见 PRD § 1.x）：
  - `sessionNumber` / `memberState` / `focusArea` / `trainingItems[]` / `intensity` / `trainingResult` / `summary[]` / `homework[]` / `createdBy`
- **数据演化走路径 2**：
  - V1（已上线）不动，继续兼容
  - V2 跟 Phase 3 (AI Agent) 一起升级
  - 不强制迁移历史 notes，可选 LLM 拆分工具
- **AI 输出原则**：
  - `trainingItems` 是有序自由文本动作清单，**不解析 "R" 等教练自定义前缀**
  - `sessionNumber` 系统建议默认值，**允许覆盖**（兼容线下未录入数据）
  - `memberState` / `homework` 是自由文本，**不限制结构**（不同馆工作流差异大）
  - `trainingResult` 可留空（课前 vs 课后填写）

**理由**：

- 教练真实工作流的字段比抽象描述更直接可用
- "应用到下次课程" 字段映射零摩擦
- 不限制自由度 = 不被工作流差异拒绝
- V1 不动 = 不影响审核中的小程序

---

## D8 · 启动节奏（2026-05-26）

**决策**：先发现期，再实施期。**不急着写代码**。

发现期产物（在 `docs/agent/`）：
1. PRD.md（产品需求）
2. WIREFRAME.md（交互稿）
3. TECH-RESEARCH.md（技术预研）
4. DECISIONS.md（决策备忘，本文件）

发现期完成的标志：
- PRD + 交互稿稳定（多轮迭代）
- 跟 3-5 个真实教练访谈完
- 技术预研所有"待回答问题"答完

实施期：在发现期产物完整后，**统一拆解任务一次性落地**。

**理由**：
- 当前还在小程序 V1 审核期，没有真实使用数据
- AI 这种功能"做错了不是浪费时间是误导用户"
- 投资 1-2 周设计期可以省后续 4-6 周的返工
