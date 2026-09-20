# Macbeth03 — M3-03-PHASE1-RECOVERY

BASE_SHA: `18f5352070910a867b9729b031aa2e3951785e01`
Branch: `macbeth03/m3-phase1-recovery`
Goal: manifest/链身份、交易恢复、索引隔离、数据库备份恢复与 smoke 准备
Scope: packages/chain-adapter/**; apps/server/**; test/chain-*.test.ts; test/m3-deployment-template.test.mjs; docs/chain/PHASE1-*; docs/management/phase1/Macbeth03-*
Dependencies: base 接口及 02 交接；钱包共享文件由 04 主写，03 提供精确接口/测试需求，不并发编辑

Read [the full assigned user scope](../specs/PHASE1-CLOSEOUT-2026-09-20.md), especially the frozen constraints and your worker section, and [assignments](ASSIGNMENTS.md). Current instructions supersede historical inactive/startup states only within this assignment.

Acceptance: report precise source/candidate/tree/environment/commands/results; preserve failures and NOT_RUN; provide versioned handoff, own retrospective and original PR/Forum ACK. No Testnet broadcast, signing, merge, rule weakening, history rewrite or invented approval. The new Task Intake is not yet received.
