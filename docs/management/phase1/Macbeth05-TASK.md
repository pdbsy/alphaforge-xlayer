# Macbeth05 — M3-05-PHASE1-ACCEPTANCE

BASE_SHA: `18f5352070910a867b9729b031aa2e3951785e01`
Branch: `macbeth05/m3-phase1-acceptance`
Goal: 验收矩阵、普通功能独立复测、实际覆盖率测量、缺陷台账与最终候选复核边界
Scope: docs/management/agents/qa/M3-05-PHASE1-ACCEPTANCE/**; 自有隔离临时证据；新增功能验收用例先报路径给 01，禁止改业务实现
Dependencies: 先核查历史服务限制；普通功能工作可继续；安全服务限制不得通过改名/换工具/换 worker 绕过；最终 01 候选

Read [the full assigned user scope](../specs/PHASE1-CLOSEOUT-2026-09-20.md), especially the frozen constraints and your worker section, and [assignments](ASSIGNMENTS.md). Current instructions supersede historical inactive/startup states only within this assignment.

Acceptance: report precise source/candidate/tree/environment/commands/results; preserve failures and NOT_RUN; provide versioned handoff, own retrospective and original PR/Forum ACK. No Testnet broadcast, signing, merge, rule weakening, history rewrite or invented approval. The new Task Intake is not yet received.
