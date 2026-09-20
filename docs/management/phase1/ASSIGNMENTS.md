# AlphaForge 第一阶段收尾任务登记

登记日期：2026-09-20。Owner：Macbeth01。正式仓库：`pdbsy/quantpass-arbitrum-hackathon`；默认分支 `master`。

准确 BASE_SHA：`18f5352070910a867b9729b031aa2e3951785e01`，重新 fetch 后固定；PR #21 已合并，原候选 `a712685c1645d9a924dcb0931c98d917da919ced` 与 master tree 相同。该 squash 不使来源代码重新变成未集成。

授权：[当前完整用户任务](../specs/PHASE1-CLOSEOUT-2026-09-20.md)。允许实现、测试、文档、协调和正常 PR；未授予本轮 merge、保护例外、外部部署、签名、广播、购买、secrets 或权限扩大。#21 的一次性例外已结束。

所有 worker 先从自己的独立 clean worktree/checkout fetch 并核对本基线；保护未知改动，保留旧分支和全部历史。新分支从准确 BASE_SHA 创建，不继承经理/其他 worker 未合并提交。登记位于经理 PR；可只读查看登记提交，不把经理提交并入普通 worker 分支。不变更 attribution validator。

One Chat = One Worker；One Worker = One Worktree；One Task = One Branch；One Branch = One PR。作者保持真实；提交与 PR 使用自己的 Agent/Task，提交 body 恰好一个 Agent-ID/Task-ID。先 Task Intake、Draft PR，再实质开发。无开发者代写他人 ACK；app 回执与公开 Forum ACK 分开。

| Owner | Task-ID | Branch | 本轮目标 | 文件边界 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| Macbeth01 | M3-01-PHASE1-CLOSEOUT | `macbeth01/m3-phase1-closeout` | 共享集成、全量矩阵、决策、旧 PR 内容核对、证据与交付 | README.md; docs/management/**（不代写 QA 结论）; docs/superpowers/plans/2026-09-20-phase1-closeout.md; planning/roadmap.json 的已批准范围同步; 共享 package/CI 由明确后续计划串行处理 | 02/03/04 版本化交接；05/06 同一候选验收 |
| Macbeth02 | M3-02-PHASE1-CONTRACTS | `macbeth02/m3-phase1-contracts` | 合约缺口、可重建 ABI/字节码清单、隔离本地部署演练与真实测试网方案 | contracts/**; docs/protocol/PHASE1-*; docs/management/phase1/Macbeth02-* | 以 base 已发布 ABI 开始；接口变化先通知 03/04；不依赖未知销售机制 |
| Macbeth03 | M3-03-PHASE1-RECOVERY | `macbeth03/m3-phase1-recovery` | manifest/链身份、交易恢复、索引隔离、数据库备份恢复与 smoke 准备 | packages/chain/**; apps/server/**; test/chain-*.test.ts; test/m3-deployment-template.test.mjs; docs/chain/PHASE1-*; docs/management/phase1/Macbeth03-* | base 接口及 02 交接；钱包共享文件由 04 主写，03 提供精确接口/测试需求，不并发编辑 |
| Macbeth04 | M3-04-PHASE1-PRODUCT | `macbeth04/m3-phase1-product` | 真实入口操作闭环、Pass 转账/获取和 Vault 选择、post-close rescue、浏览器验收 | apps/web/**; test/ui-*.test.ts; test/m3-*-runtime.test.ts; test/m3-product*.test.ts; test/m3-chain-action-flow.test.ts; test/hackathon-ui-build.test.mjs; docs/product/PHASE1-*; docs/management/phase1/Macbeth04-* | 先消费 base ABI/adapter；等待 02/03 新接口精确 SHA；首发分配与转账纳入；付费销售/真实 Buy/Sell 已由用户移出本阶段 |
| Macbeth05 | M3-05-PHASE1-ACCEPTANCE | `macbeth05/m3-phase1-acceptance` | 验收矩阵、普通功能独立复测、实际覆盖率测量、缺陷台账与最终候选复核边界 | docs/management/agents/qa/M3-05-PHASE1-ACCEPTANCE/**; 自有隔离临时证据；新增功能验收用例先报路径给 01，禁止改业务实现 | 先核查历史服务限制；普通功能工作可继续；安全服务限制不得通过改名/换工具/换 worker 绕过；最终 01 候选 |
| Macbeth06 | M3-06-CI-GATES | `macbeth06/m3-phase1-gates` | 只读 CI/规则/证据核验与合约/scanner 覆盖核对 | docs/management/phase1/Macbeth06-* 和自有只读报告；不改业务、CI、scanner、ruleset 或 review 政策 | 复用登记身份；起点 base；后续绑定每个准确候选；不是 05 或独立 GitHub 审批 |

## 实际启动与 ACK

登记时：02–06 均为 WAITING_DISPATCH / WAITING_ACTUAL_ACK。已有 app task 的存在不证明新任务启动。后续追加各 worker 自己的 Task Intake/ACK 链接、时间、实际分支和 SHA。Forum 状态在真实公开 ACK 前保持 UNVERIFIED。

## 共享边界

01 独占 registry/bootstrap、README、roadmap、package.json/package-lock.json、workflow、环境/供应链策略、管理生成器与生成快照。02/03/04 发现需要触及共享文件时给出最小 diff/命令要求，由 01 处理。不得靠放宽归属校验使混合未合并历史通过。

02/03/04 先核对当前代码覆盖，已实现且有相同 tree/语义证据的内容不重复开发。独立任务可以并行；依赖接口绑定准确版本。真实链操作、首发付费机制、外部治理主体和最终合并授权分别记录，不能阻断无关工作。

最新范围决定见 [DECISIONS.md](DECISIONS.md)。
