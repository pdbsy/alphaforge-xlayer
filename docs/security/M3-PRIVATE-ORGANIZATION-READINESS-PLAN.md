# AlphaForge 私有组织与 Code Security 准备方案

日期：2026-09-20（Asia/Shanghai）。状态：PROPOSED，尚未执行账户、计费、权限或仓库迁移。

用户选择保持私有并准备组织与 Code Security 方案。该选择不等于批准付费、创建组织、迁移、授权新成员或修改现有仓库身份。正式仓库仍为 `pdbsy/quantpass-arbitrum-hackathon`。

## 已核验的阻塞

- 仓库为个人账户 `pdbsy` 所有的 private repository。当前凭证的组织和组织成员关系列表均为空；这只说明当前可见结果，不证明用户在其他凭证下没有组织。
- PR #21 在 `6643fea04a15925239f290010d043adcd6255d57` 无合并冲突，GitHub 显示 `BLOCKED`、`REVIEW_REQUIRED`，无审批或审阅请求。
- 两组 Engineering 三平台检查均通过。CodeQL run 35461334906 完成分析后在上传时失败，明确提示 code scanning 未启用；Dependency Review run 35461334913 明确提示仓库不支持该功能。配置 API 同样返回 403。
- PR 作者、唯一可见 collaborator 及全部 CODEOWNERS 均为 `pdbsy`。用户提供的审阅人也是 `pdbsy`，因此仍缺独立可计入审批的身份；GitHub 禁止 PR 作者批准自己的 PR。[审批规则](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews)
- 05 最终安全审查的服务限制仍未解除。本轮只查询访问状态，得到 `not_granted`；这是提示信息，不证明所有审查任务都不可执行，也不构成重试或替换此前受限审查的理由。未重新运行或转移受限任务。申请入口：[Trusted Access](https://chatgpt.com/cyber)。技术自检不等于独立安全验收或 GitHub APPROVED。

## 拟采用的配置

| 项目 | 目前 | 拟议目标 |
| --- | --- | --- |
| 仓库可见性 | private | 保持 private |
| Owner | pdbsy（个人） | 用户指定的组织，名称待定 |
| 仓库名称 | quantpass-arbitrum-hackathon | 保持此名称及既有 Git 历史 |
| 套餐 | 不推测个人计费套餐 | 组织 GitHub Team + Code Security；已有合适 Enterprise 权益时复用 |
| Security 范围 | 两项 required check 因功能权限失败 | 仅对此仓库启用所需 Code Security，保留现有高级 workflow |
| 审阅人 | 只有 PR 作者 | 用户指定的另一位独立审阅人，具备必要仓库权限及 CODEOWNER 覆盖 |
| master 门禁 | ruleset 22507334 | 保持现有全部约束，不新增绕过者 |

GitHub 官方将私有仓库 code scanning 和 dependency review 置于组织 Team/Enterprise + Code Security 的能力范围。仅升级个人 Pro 或仅创建 Free 组织不能解决本任务。[CodeQL 私有仓库前提](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement)、[Dependency Review 前提](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review)

## 费用准备，不是购买授权

2026-09-20 查询到的官网标价：Team 为每用户每月 USD 4（页面含首 12 个月促销条款），Code Security 为每活跃提交者每月 USD 30。最终必须以该组织结算页面显示的周期、人数、税费和报价为准。[Team 定价](https://github.com/pricing)、[Code Security 定价](https://github.com/security/plans)

规划公式为 `Team 单价 × 计费席位 + Code Security 单价 × 计费活跃提交者 + 超额 Actions/其他用量与税费`。例如 2 个 Team 席位、1 个计费活跃提交者时，按上述标价估算 USD 38/月；2 个活跃提交者时为 USD 68/月。这不是固定报价或支出上限。不能把 Macbeth01–05 的 Git author 标签直接当作五个计费账号，也不能假定只计一个。

GitHub 按过去 90 天被推送的提交及有资格的账号计算活跃提交者，GitHub App bots 不计入；启用页面的实际用量预览是执行前依据。预算限制不保证停止已启用仓库的后续费用，不能承诺硬费用上限。[计费规则](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security)

## 执行前必须形成的明确决定

1. 目标组织的准确名称、现有或新建、组织管理员和计费负责人。
2. Team/Enterprise 及 Code Security 的准确报价、计费人数、周期和用户批准的支出范围；仅此仓库启用，不默认全组织开启。
3. 独立审阅人的准确 GitHub 用户名和最小必要权限。不能用另一个受同一操作者控制的账号冒充独立审批。
4. 对仓库所有权转移、新 canonical 地址、各任务 checkout 更新及兼容迁移补丁的明确授权。当前原任务要求保留 GitHub 仓库身份，因此这属于新的受控迁移决定。
5. 对必要治理 PR、CODEOWNERS 和新增成员权限的明确授权；保持批准数量及全部 required checks。

未补齐这些项前，不创建组织、不购买、不转移、不邀请、不更改 CODEOWNERS。

## 已准备的迁移影响范围

这不是只改 Git remote。受检验器约束的运行配置明确固定当前仓库地址，包括：

- `tools/check-agent-identity.mjs`、`tools/agent-integration-identity.mjs`：同仓 PR、来源图和仓库准入。
- `tools/environment/observe.mjs`、`tools/environment/policy.mjs`：真实 CI 事件和来源身份。
- `tools/check-supply-chain.mjs`、`planning/supply-chain-policy.json`：仓库身份与 SBOM namespace。
- `tools/agent-forum.mjs`、`tools/sync-agent-forum.mjs`：受信来源与 PR 链接。
- `docs/management/agents/registry.json`、当前 integration manifest、各独立 checkout remote 及任务路由。

目标组织确定后，应先准备有界、可测试的身份迁移补丁：显式绑定旧仓库、准确新仓库、GitHub repository ID、固定迁移基线及历史来源，拒绝任意其他 owner。新增正负测试；保留旧审计文档、原始 manifest 和不可变证据的历史语义，不能全仓字符串替换或扩大到任意仓库。当前方案没有修改这些检查。

GitHub transfer 会保留 Git 历史与 PR，并提供旧地址重定向；不能依赖重定向满足本地严格身份校验。转移到 Free 组织会有保护功能损失风险，因此必须先确认目标套餐。不要在旧地址重建仓库，以免破坏重定向；回退迁移也需要重新授权，并非保证随时可逆。[仓库转移说明](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)

## 获批准后的执行顺序

1. 用户确定组织、费用和独立审阅人；核验接收权限、名称冲突及计划权益。准备精确迁移补丁和回退说明，用户最终批准具体操作。
2. 在停写窗口保存远端 branches/tags、各来源 SHA、PR、规则、权限和 Actions 设置；保留全部历史及 evidence refs，不 force push 或 prune。
3. 获批后启用目标组织的必要权益，再进行仓库转移，保持 private；立即回读仓库 ID、master 和 PR head、来源 refs 及所有保护约束。若保护缺失，停止后续写入和 merge，按获批方案恢复并核验。
4. 应用审阅过的 canonical 身份迁移补丁，逐个更新独立 checkout 与任务目标。依赖和 SQLite 数据继续各自隔离，不通过旧地址隐式重定向继续工作。
5. 对此仓库启用 Code Security，保留已有 CodeQL 高级 workflow 和最小权限；不同时引入重复 default-setup 流程。确认 dependency graph/API 可用，再重跑同一最终候选的失败检查。
6. 配置独立审阅人的权限及 CODEOWNER 覆盖。注意 required CODEOWNERS 从 base 分支读取；只在本 PR head 增加审阅人不能解决当前审批。可准备独立治理 PR，由独立人员用自己的账号实际创建并推送，现有 base CODEOWNER pdbsy 审阅批准；其合入仍需另行明确 merge 授权和全部检查。不得由经理代用他人身份。
7. 对最终产品候选完成独立验收和真实 GitHub approval，解决所有 review threads。任何新的代码 push 后重新确认审批没有失效。
8. 只有五个 required checks 在准确最终头部通过、CODEOWNER/last-push 审批满足、独立 QA 完成、保护规则保持、PR 无冲突且退出 Draft 后，才能报告 Ready to Merge。该状态不授权实际 merge。

## 本轮已完成及仍未完成

代码侧增加关闭 Vault 的界面回归：索引和直接读取两种路径都禁用 deposit/withdraw/close，隐藏无效的存款授权入口并显示关闭状态。原合约权限保持不变。先观察两项失败，再完成修复，40 项相关测试、typecheck 和 lint 通过。全量源绑定证据另按 C/R/S 生成。

本方案未执行购买、迁移、权限授予、review 请求、merge、部署或链上交易。目标组织与合格独立审阅人尚待用户提供；Ready to Merge 继续为 BLOCKED。
