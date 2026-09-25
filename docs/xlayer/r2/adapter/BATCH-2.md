# XLayer R2 — chain-isolated evidence APIs

All chain evidence GET routes accept an optional exact decimal `chainId` query for registered runtimes. Contract/Pass lookups filter by chain before selecting a unique match. A missing selector with identical addresses across chains fails with INVALID_REQUEST, preserving all single-network legacy routes. Operation evidence filters before store access and remains not-found when the identity is ambiguous or the owner does not match. Submission continues to bind both chain and target.

The real Fastify/runtime/store regression reproduced a wrong-chain projection (46630 returned for an explicit 1952 request) before implementation. After the change: new API + old chain-api + batch-one XLayer tests 21/21 passed, both typecheck projects passed, changed-file lint passed. Tests also retain single-chain legacy reads and exact one-wei Pass transfer / untracked-token rescue submission behavior. The earliest test fixture mistakenly used an error code as a lifecycle state; it was corrected before the valid RED reproduction and before production edits. Both logs remain in the ignored output directory.

Shared script registration requested: `test/xlayer-chain-api.test.ts`. No actual RPC, deployment or broadcast. Full phase-one canonical reconciliation and recovery tests follow; submitted operation acceptance alone is not a confirmation claim.
