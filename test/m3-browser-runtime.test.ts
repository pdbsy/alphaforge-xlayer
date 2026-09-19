import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asAddress, asBlockHash, asHexData } from '../packages/chain-adapter/src/types.ts';
import type { ProductOperationEvidence } from '../packages/chain-adapter/src/reconciliation.ts';
import { encodeM3VaultCall } from '../packages/chain-adapter/src/vault-abi.ts';
import { createM3BrowserRuntime } from '../apps/web/src/m3-browser-runtime.ts';
import type { Eip1193Provider, Eip1193Request } from '../apps/web/src/chain-wallet.ts';
import { onchainActionEnabled, renderM3StrategyShell } from '../apps/web/src/m3-product-shell.ts';
import type { M3VaultSnapshot } from '../apps/web/src/m3-vault-client.ts';

const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const VAULT = asAddress('0x2222222222222222222222222222222222222222');
const AF_USDC = asAddress('0x3333333333333333333333333333333333333333');
const PASS = asAddress('0x4444444444444444444444444444444444444444');
const TX_HASH = `0x${'ab'.repeat(32)}`;

const addressResult = (address: string) => `0x${address.slice(2).padStart(64, '0')}`;
const uintResult = (value: bigint) => `0x${value.toString(16).padStart(64, '0')}`;

class ProviderFixture implements Eip1193Provider {
  readonly requests: Eip1193Request[] = [];
  chainId = 1;

  async request(input: Eip1193Request): Promise<unknown> {
    this.requests.push(input);
    if (input.method === 'eth_requestAccounts' || input.method === 'eth_accounts')
      return ['0x1111111111111111111111111111111111111111'];
    if (input.method === 'eth_chainId') return `0x${this.chainId.toString(16)}`;
    throw new Error('UNEXPECTED_PROVIDER_METHOD');
  }

  on(): void {}
  removeListener(): void {}
}

class ConfiguredProviderFixture extends ProviderFixture {
  override chainId = 46_630;
  usdcAllowance = 0n;
  passAllowance = 0n;
  closed = false;

  override async request(input: Eip1193Request): Promise<unknown> {
    this.requests.push(input);
    if (input.method === 'eth_requestAccounts' || input.method === 'eth_accounts') return [OWNER];
    if (input.method === 'eth_chainId') return `0x${this.chainId.toString(16)}`;
    if (input.method === 'eth_getBlockByNumber') return { number: '0x64', hash: vaultSnapshot.blockHash };
    if (input.method === 'eth_sendTransaction') return TX_HASH;
    if (input.method === 'eth_call') {
      const call = input.params?.[0] as { readonly data?: unknown; readonly to?: unknown } | undefined;
      if (call?.data === encodeM3VaultCall('afUsdc()', [])) return addressResult(AF_USDC);
      if (call?.data === encodeM3VaultCall('pass()', [])) return addressResult(PASS);
      if (call?.data === encodeM3VaultCall('owner()', [])) return addressResult(OWNER);
      if (call?.data === encodeM3VaultCall('closed()', [])) return uintResult(this.closed ? 1n : 0n);
      if (call?.data === encodeM3VaultCall('strategyCreator()', []))
        return addressResult(vaultSnapshot.state.strategyCreator);
      if (call?.data === encodeM3VaultCall('strategyId()', [])) return vaultSnapshot.state.strategyId;
      if (call?.data === encodeM3VaultCall('strategyRef()', [])) return vaultSnapshot.state.strategyRef;
      if (call?.data === encodeM3VaultCall('afEth()', [])) return addressResult(vaultSnapshot.state.afEth);
      if (call?.data === encodeM3VaultCall('afBtc()', [])) return addressResult(vaultSnapshot.state.afBtc);
      if (call?.data === encodeM3VaultCall('passLocker()', []))
        return addressResult(vaultSnapshot.state.passLocker);
      if (
        call?.data === encodeM3VaultCall('principalBasis()', []) ||
        call?.data === encodeM3VaultCall('trackedUsdcBalance()', []) ||
        call?.data === encodeM3VaultCall('realizedProfit()', []) ||
        call?.data === encodeM3VaultCall('withdrawableUsdc()', []) ||
        call?.data === encodeM3VaultCall('openTrackedPositionCount()', []) ||
        String(call?.data).startsWith(encodeM3VaultCall('trackedPosition(address)', [AF_USDC]).slice(0, 10))
      )
        return uintResult(0n);
      if (String(call?.data).startsWith('0xdd62ed3e'))
        return uintResult(call?.to === AF_USDC ? this.usdcAllowance : this.passAllowance);
      return '0x';
    }
    throw new Error('UNEXPECTED_PROVIDER_METHOD');
  }
}

const vaultSnapshot: M3VaultSnapshot = Object.freeze({
  chainId: 46_630,
  owner: OWNER,
  contract: VAULT,
  projectionKey: 'm3-vault',
  blockNumber: '100',
  blockHash: asBlockHash(`0x${'cd'.repeat(32)}`),
  state: Object.freeze({
    owner: OWNER,
    strategyCreator: asAddress('0x5555555555555555555555555555555555555555'),
    strategyId: asHexData(`0x${'01'.repeat(32)}`),
    strategyRef: asHexData(`0x${'02'.repeat(32)}`),
    pass: PASS,
    passStrategyId: asHexData(`0x${'01'.repeat(32)}`),
    afUsdc: AF_USDC,
    afEth: asAddress('0x6666666666666666666666666666666666666666'),
    afBtc: asAddress('0x7777777777777777777777777777777777777777'),
    passLocker: asAddress('0x8888888888888888888888888888888888888888'),
    principalBasis: '0',
    trackedUsdcBalance: '0',
    realizedProfit: '0',
    withdrawableUsdc: '0',
    trackedAfEth: '0',
    trackedAfBtc: '0',
    openTrackedPositionCount: '0',
    closed: false,
  }),
});

const deployment = {
  source: 'reviewed-deployment-manifest' as const,
  chainId: 46_630 as const,
  vaultAddress: VAULT,
  deploymentBlock: '1',
  abiVersion: 'm3-v1',
  manifestDigest: asBlockHash(`0x${'12'.repeat(32)}`),
  runtimeBytecodeHash: asBlockHash(`0x${'34'.repeat(32)}`),
};

test('production browser runtime is inert before connect and reports wrong chain without a deployment', async () => {
  const provider = new ProviderFixture();
  const runtime = createM3BrowserRuntime({ provider });

  assert.equal(provider.requests.length, 0);
  assert.equal(runtime.snapshot.onchain.deployment, 'UNAVAILABLE');
  assert.equal(runtime.snapshot.onchain.writeMode, 'DISABLED');
  const html = renderM3StrategyShell({
    strategyId: 'trend',
    contentProvenance: 'FIXTURE',
    ...runtime.snapshot,
  });
  assert.match(html, /NOT DEPLOYED/);
  for (const action of ['Buy Pass', 'Sell Pass', 'Deposit', 'Withdraw', 'Approve', 'Close']) {
    assert.match(html, new RegExp(`<button[^>]*disabled[^>]*>${action}`));
  }
  await assert.rejects(runtime.connect(), /WALLET_WRONG_CHAIN/);
  assert.equal(runtime.snapshot.wallet.status, 'DISCONNECTED');
  assert.equal(runtime.snapshot.network.status, 'WRONG');
  assert.equal(runtime.snapshot.network.chainId, 1);
});

test('production browser runtime connects the existing EIP-1193 wallet boundary but keeps writes closed', async () => {
  const provider = new ProviderFixture();
  provider.chainId = 46630;
  const runtime = createM3BrowserRuntime({ provider });

  await runtime.connect();
  assert.deepEqual(runtime.snapshot.wallet, {
    status: 'CONNECTED',
    address: '0x1111111111111111111111111111111111111111',
  });
  assert.deepEqual(runtime.snapshot.network, { status: 'CORRECT', chainId: 46630 });
  assert.equal(runtime.snapshot.onchain.deployment, 'UNAVAILABLE');
  await assert.rejects(
    runtime.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1' }),
    /M3_DEPLOYMENT_NOT_CONFIGURED/,
  );
  assert.equal(
    provider.requests.some((request) => request.method === 'eth_sendTransaction'),
    false,
  );
});

test('production browser runtime fails closed when no injected wallet provider exists', async () => {
  const runtime = createM3BrowserRuntime({});

  await assert.rejects(runtime.connect(), /WALLET_PROVIDER_UNAVAILABLE/);
  assert.equal(runtime.snapshot.network.status, 'UNAVAILABLE');
  assert.equal(runtime.snapshot.onchain.deployment, 'UNAVAILABLE');
});

test('configured production runtime uses canonical Vault reads and exact finite two-token approvals', async () => {
  const provider = new ConfiguredProviderFixture();
  const registrations: Array<Record<string, unknown>> = [];
  const runtime = createM3BrowserRuntime({
    provider,
    deployment,
    vaultReader: {
      readSnapshot: async () => vaultSnapshot,
      registerSubmission: async (input) => {
        registrations.push(input);
        return { state: 'SUBMITTED' };
      },
    },
    now: () => '2026-09-20T00:00:00.000Z',
  });

  await runtime.connect();
  assert.equal(runtime.snapshot.onchain.deployment, 'CONFIGURED');
  assert.equal(runtime.snapshot.onchain.writeMode, 'LIVE_AUTHORIZED');
  assert.equal(runtime.snapshot.onchain.depositAuthorization?.approvalCapability, 'AVAILABLE');
  assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'deposit'), true);
  assert.match(
    renderM3StrategyShell({
      strategyId: 'trend',
      contentProvenance: 'FIXTURE',
      ...runtime.snapshot,
    }),
    /Approve · USE DEPOSIT REVIEW/,
  );

  const request = { kind: 'deposit' as const, usdcBaseUnits: '1000001' };
  const approval = await runtime.reviewDepositApprovals!(request);
  assert.deepEqual(
    approval.requirements.map(({ kind, token, spender, requiredRaw, sufficient }) => ({
      kind,
      token,
      spender,
      requiredRaw,
      sufficient,
    })),
    [
      { kind: 'af-usdc', token: AF_USDC, spender: VAULT, requiredRaw: '1000001', sufficient: false },
      {
        kind: 'pass',
        token: PASS,
        spender: VAULT,
        requiredRaw: '1000001000000000000',
        sufficient: false,
      },
    ],
  );
  await runtime.confirmDepositApproval!(approval, 'af-usdc');
  const firstApproval = provider.requests.filter((item) => item.method === 'eth_sendTransaction').at(-1)
    ?.params?.[0] as { readonly to: string; readonly data: string };
  assert.equal(firstApproval.to, AF_USDC);
  assert.equal(
    firstApproval.data,
    `0x095ea7b3${VAULT.slice(2).padStart(64, '0')}${BigInt(1_000_001).toString(16).padStart(64, '0')}`,
  );

  const passApproval = await runtime.reviewDepositApprovals!(request);
  await runtime.confirmDepositApproval!(passApproval, 'pass');
  const secondApproval = provider.requests.filter((item) => item.method === 'eth_sendTransaction').at(-1)
    ?.params?.[0] as { readonly to: string; readonly data: string };
  assert.equal(secondApproval.to, PASS);
  assert.equal(
    secondApproval.data,
    `0x095ea7b3${VAULT.slice(2).padStart(64, '0')}${BigInt('1000001000000000000').toString(16).padStart(64, '0')}`,
  );

  provider.usdcAllowance = 1_000_001n;
  provider.passAllowance = 1_000_001_000_000_000_000n;
  const review = await runtime.reviewAction(request);
  assert.deepEqual(review.request, request);
  await runtime.confirmAction(review);
  const deposit = provider.requests.filter((item) => item.method === 'eth_sendTransaction').at(-1)
    ?.params?.[0] as { readonly to: string; readonly data: string };
  assert.equal(deposit.to, VAULT);
  assert.equal(deposit.data, encodeM3VaultCall('deposit(uint256)', [1_000_001n]));
  assert.deepEqual(registrations, [
    {
      operationId: review.operationId,
      chainId: 46_630,
      owner: OWNER,
      target: VAULT,
      calldata: encodeM3VaultCall('deposit(uint256)', [1_000_001n]),
      txHash: TX_HASH,
    },
  ]);
});

test('configured runtime preserves owner exits through provider reads when the index API is degraded', async () => {
  const provider = new ConfiguredProviderFixture();
  const runtime = createM3BrowserRuntime({
    provider,
    deployment,
    vaultReader: {
      readSnapshot: async () => {
        throw new Error('INDEXER_UNAVAILABLE');
      },
    },
  });

  await runtime.connect();
  assert.equal(runtime.snapshot.onchain.health, 'DEGRADED');
  assert.equal(runtime.snapshot.onchain.owner, 'OWNER');
  assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'deposit'), false);
  assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'withdraw'), true);
  assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'close'), true);
  const review = await runtime.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1' });
  assert.equal(review.request.kind, 'withdraw');
});

test('configured runtime disables writes when the connected provider changes to a wrong network', async () => {
  const provider = new ConfiguredProviderFixture();
  const runtime = createM3BrowserRuntime({
    provider,
    deployment,
    vaultReader: { readSnapshot: async () => vaultSnapshot },
  });
  await runtime.connect();
  assert.equal(runtime.snapshot.onchain.writeMode, 'LIVE_AUTHORIZED');

  provider.chainId = 1;
  await runtime.refresh();
  assert.deepEqual(runtime.snapshot.network, { status: 'WRONG', chainId: 1 });
  assert.equal(runtime.snapshot.onchain.writeMode, 'DISABLED');
  assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'withdraw'), false);

  provider.chainId = 46_630;
  await runtime.refresh();
  assert.deepEqual(runtime.snapshot.network, { status: 'CORRECT', chainId: 46_630 });
  assert.equal(runtime.snapshot.onchain.writeMode, 'LIVE_AUTHORIZED');
});

test('configured runtimes create collision-resistant operation ids across browser reloads', async () => {
  const createRuntime = () => {
    const provider = new ConfiguredProviderFixture();
    return createM3BrowserRuntime({
      provider,
      deployment,
      vaultReader: { readSnapshot: async () => vaultSnapshot },
    });
  };
  const first = createRuntime();
  const second = createRuntime();
  await first.connect();
  await second.connect();

  const firstReview = await first.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1' });
  const secondReview = await second.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1' });

  assert.match(firstReview.operationId, /^m3-withdraw-[0-9a-f]{32}$/);
  assert.match(secondReview.operationId, /^m3-withdraw-[0-9a-f]{32}$/);
  assert.notEqual(firstReview.operationId, secondReview.operationId);
});

test('configured runtime reads registered operation evidence into transaction and readiness state', async () => {
  const provider = new ConfiguredProviderFixture();
  let evidence: ProductOperationEvidence = {
    lifecycle: 'MINED',
    receipt: 'SUCCESS',
    receiptCanonical: true,
    confirmations: 1,
    reconciliation: 'MATCHED',
    projection: 'PENDING',
    chainStatus: 'SOFT_READY',
    l1Status: 'UNKNOWN',
    finalityStatus: 'UNKNOWN',
    indexerStatus: 'HEALTHY',
    degradedReason: null,
    productReady: false,
  };
  const evidenceReads: Array<{ operationId: string; owner: string }> = [];
  const runtime = createM3BrowserRuntime({
    provider,
    deployment,
    vaultReader: {
      readSnapshot: async () => vaultSnapshot,
      registerSubmission: async () => ({ state: 'SUBMITTED' }),
      readOperationEvidence: async (operationId, owner) => {
        evidenceReads.push({ operationId, owner });
        return evidence;
      },
    },
  });
  await runtime.connect();
  const review = await runtime.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1' });
  await runtime.confirmAction(review);

  await runtime.refresh();
  assert.deepEqual(evidenceReads, [{ operationId: review.operationId, owner: OWNER }]);
  assert.deepEqual(runtime.snapshot.transaction, { status: 'CHAIN_CONFIRMED', txHash: TX_HASH });
  assert.equal(runtime.snapshot.onchain.readiness, 'SOFT_READY');

  evidence = {
    ...evidence,
    lifecycle: 'REORGED',
    receipt: 'PENDING',
    receiptCanonical: false,
    reconciliation: 'PENDING',
    chainStatus: 'REORGED',
  };
  await runtime.refresh();
  assert.deepEqual(runtime.snapshot.transaction, {
    status: 'FAILED',
    txHash: TX_HASH,
    errorCode: 'REORGED',
  });
  assert.equal(runtime.snapshot.onchain.readiness, 'REORGED');
});

test('degraded registered evidence keeps owner exit actions while marking the indexer unhealthy', async () => {
  const provider = new ConfiguredProviderFixture();
  const runtime = createM3BrowserRuntime({
    provider,
    deployment,
    vaultReader: {
      readSnapshot: async () => vaultSnapshot,
      registerSubmission: async () => ({ state: 'SUBMITTED' }),
      readOperationEvidence: async () => ({
        lifecycle: 'SUBMITTED',
        receipt: 'PENDING',
        receiptCanonical: false,
        confirmations: 0,
        reconciliation: 'PENDING',
        projection: 'PENDING',
        chainStatus: 'PENDING',
        l1Status: 'UNKNOWN',
        finalityStatus: 'UNKNOWN',
        indexerStatus: 'DEGRADED',
        degradedReason: 'CHAIN_REORG_DEPTH_EXCEEDED',
        productReady: false,
      }),
    },
  });
  await runtime.connect();
  const review = await runtime.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1' });
  await runtime.confirmAction(review);

  await runtime.refresh();

  assert.equal(runtime.snapshot.onchain.health, 'DEGRADED');
  assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'withdraw'), true);
  assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'close'), true);
  assert.equal(runtime.snapshot.transaction.status, 'SUBMITTED');
});

for (const source of ['canonical', 'live-exit'] as const) {
  test(`a closed Vault disables product actions after ${source} refresh`, async () => {
    const provider = new ConfiguredProviderFixture();
    const runtime = createM3BrowserRuntime({
      provider,
      deployment,
      vaultReader: {
        readSnapshot: async () => {
          if (source === 'live-exit') throw new Error('INDEXER_UNAVAILABLE');
          return { ...vaultSnapshot, state: { ...vaultSnapshot.state, closed: provider.closed } };
        },
      },
    });
    await runtime.connect();
    assert.equal(onchainActionEnabled(runtime.snapshot.onchain, 'withdraw'), true);
    provider.closed = true;
    await runtime.refresh();
    for (const action of ['deposit', 'withdraw', 'close'] as const)
      assert.equal(onchainActionEnabled(runtime.snapshot.onchain, action), false, action);
    assert.equal(runtime.snapshot.onchain.writeMode, 'DISABLED');
    const html = renderM3StrategyShell({
      strategyId: 'trend',
      contentProvenance: 'FIXTURE',
      ...runtime.snapshot,
    });
    assert.match(html, /VAULT CLOSED/);
    assert.doesNotMatch(html, /Owner exit remains available/);
    assert.equal(
      provider.requests.some((request) => request.method === 'eth_sendTransaction'),
      false,
    );
  });
}
