# XLayer Wallet Account and Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Present a concise wallet account and a usable local OKB Pass-trading preview, then validate the final candidate before the user-authorized merge.

**Architecture:** Reuse the existing XLayer wallet runtime for real connections and the existing browser Pass exchange for preview orders. A shared pure account renderer displays one Wallet button, native balance and Pass holdings. A separately selected preview build has its own persisted account; the public build retains its existing no-local-finance boundary.

**Tech Stack:** Node 24.21.0, npm 11.19.1, TypeScript, Vite, Node test runner, existing qualified Chromium tooling.

**Spec:** User request on 2026-09-26: merge; simplify My Account to a Wallet button that becomes its address, with wallet Pass holdings and balance below; provide an interactive mock account. The user clarified the currency as OKB. All visible text remains English and avoids repeated demo terminology.

## Global Constraints

- Work only in independent AlphaForge-XLayer checkouts; preserve the parallel Robinhood line.
- Preserve actual XLayer Testnet identity 1952 and native OKB. Do not relabel the existing real Vault USDT contract as native OKB.
- Use OKB for illustrative catalogue prices and preview trading values. The user-provided Strategy funds card uses a separate simulated USDT balance; Pass remains a quantity.
- No keys, new dependencies, real signing, broadcasting, contract deployment or public hosting.
- Retain all source history, source refs, authors and generated-evidence boundaries. Do not suppress checks.
- User authorized merge, subject to actual current-head validation. Native dependency review remains a prerequisite.

## Task 1: Concise public wallet account

**Files:** New apps/web/src/wallet-account-view.ts and wallet-account.css; new apps/web/src/xlayer-wallet-balances.ts; update apps/web/src/xlayer-public-ui.ts; add focused wallet view/read tests.

**Interface:** Export renderWalletAccount(input) with address: string|null, connecting?: boolean, balance: string|null, passes: readonly {name: string; quantity: string; href?: string}[], message?: string, and actionAttribute: 'data-chain-connect'|'data-preview-connect'. It returns escaped HTML with Wallet/address button and OKB/Pass holdings. Balances are already formatted decimal strings. Export corresponding input types for the preview consumer.

- [x] Add RED behavioral tests for the disconnected/connected account, native balance reads and stale account/chain rejection.
- [x] Render My Account with this component instead of the verbose diagnostic/Vault cards. Preserve existing trade-page operations.
- [x] Read native OKB and configured Pass holdings using the supplied wallet provider and reviewed deployment configuration. Check account and chain before and after reads; reject malformed quantities and stale responses. Never invent zero balances for unavailable data.
- [x] Pass focused tests and both TypeScript projects. Supply a patch and exact RED/GREEN evidence for independent review.

## Task 2: Isolated interactive preview

**Files:** New apps/web/src/xlayer-preview-ui.ts; update product-ui.ts, xlayer-public-config.ts, apps/web/vite.config.ts, tools/build-xlayer.mjs or a focused preview build wrapper, package.json, apps/web/prototype/AlphaForge_v3_EN.html, kline-hover.ts as needed; add preview behavioral/build/browser tests.

**Interface:** Consume renderWalletAccount from Task 1. Continue using AF.exchange.read/review/execute; no second trading ledger. The explicit preview build must never load the real wallet provider or public chain API. Public build remains VITE_AF_APP_MODE=testnet with local exchange writes prohibited.

- [x] Add RED tests for explicit preview mode isolation, seeded account conservation and Wallet connection without provider/RPC.
- [x] Add build:xlayer:preview and preview:xlayer commands with a loopback-only server and separate dist/xlayer/preview output. Reuse locked tooling and existing server patterns.
- [x] Give preview its own persistent storage key, 1,000 OKB available balance and a small seeded Pass position. Preserve cash + cost = initial capital + realized P&L. Keep the old local simulation unchanged.
- [x] Reuse existing review/confirm/receipt interactions for buys and sells. Keep a concise simulated-account disclosure and an address-shaped mock identity; do not imitate a real transaction hash or receipt.
- [x] Show OKB throughout illustrative pages, charts, order quotes and receipts. Preserve actual contract asset labels on real transaction controls.
- [x] Verify buy then sell changes cash and Pass holdings, persists after reload, and rejected/duplicate/expired orders cannot mutate state. Public build must still reject local exchange writes and omit the preview entry/account module. Existing shared prototype code may retain an inert preview seed branch, but public mode must override preview flags before any ledger storage access or synthetic balance is enabled.
- [x] Pass focused tests and TypeScript. Supply patch, RED/GREEN evidence and build commands for review.

## Task 2b: Synchronize the current Robinhood UI

**Source:** Macbeth01 commit `7fcd844947390ed99d68d1d707099fd113b191da`, retained unchanged in `codex/reference-robinhood-ui-7fcd844`. The user explicitly requested this UI synchronization on 2026-09-26 while Tasks 1 and 2 were in progress.

- [x] Adapt the account header, compact address button, native balance card, Pass cards, empty state and responsive layout to XLayer and OKB. The user fixed the mock display rate at 1 OKB = 120 USDT; show that USDT estimate only for the simulated account, without treating it as a live price.
- [x] Match the user-provided Strategy funds card: active Deposit/Withdraw tabs, wallet available, allocated funds, available Pass, amount input and review/confirmation. Keep a nested simulated USDT asset balance in the existing isolated AF.exchange state and storage key, seeded with 10,000 USDT. One Pass enables one USDT of capacity; use six-decimal amounts, freeze/release capacity, stale/expired/duplicate review rejection, bounded withdrawal capacity and conservation checks. Preserve existing OKB trading history and migrate any earlier preview OKB allocations by returning their original asset before enabling the USDT balance. Do not auto-convert OKB or import the Robinhood-specific ETH conversion.
- [x] Keep the Trade page concise. Place actual XLayer Vault operations behind an explicit compact disclosure while preserving their real USDT denomination and runtime guards.
- [x] Preserve existing public/preview boundaries, unknown balance handling, original prototype CSS and all HTML outside its script. Record the exact source and adaptation in the synchronization receipt.
- [x] Independently review the delta and verify desktop/mobile account, funding, buy/sell and real-wallet boundaries.

## Task 3: Integrate, review and merge

**Files:** Manager-owned script registration/provenance and generated C/R/S artifacts only where required, plus the two reviewed task patches.

- [ ] Independently review both patches, resolve real findings, integrate and refresh mapped source provenance without changing historical evidence.
- [x] Verify actual desktop and narrow viewport account layout, Wallet connection, buy/sell, holdings, OKB copy and persistence in the preview. Verify the real public account retains its own chain boundary.
- [ ] Run affected checks and the required full collector, produce fresh manifest-only R and snapshot-only S, then publish by ordinary fast-forward.
- [x] Resolve repository Dependency graph availability through an authorized settings action and rerun native dependency review; do not replace it with another audit.
- [ ] Check current public head/base and all hosted outcomes. Once green, mark ready and merge using a merge commit pinned to the reviewed head. Preserve branches and source refs.
- [ ] Validate the actual resulting master and its hosted checks. If external prerequisites remain unavailable, retain the actual blocked result and report it plainly.
