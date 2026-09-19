import test from 'node:test';
import assert from 'node:assert/strict';
import { M3VaultApiClient, M3VaultReadFailure } from '../apps/web/src/m3-vault-client.ts';
import { asAddress, asBlockHash, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';
import { encodeM3VaultCall } from '../packages/chain-adapter/src/vault-abi.ts';

const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const CREATOR = asAddress('0x3333333333333333333333333333333333333333');
const PASS = asAddress('0x4444444444444444444444444444444444444444');
const USDC = asAddress('0x5555555555555555555555555555555555555555');
const ETH = asAddress('0x6666666666666666666666666666666666666666');
const BTC = asAddress('0x7777777777777777777777777777777777777777');
const LOCKER = asAddress('0x8888888888888888888888888888888888888888');
const BLOCK_HASH = asBlockHash(`0x${'aa'.repeat(32)}`);
const STRATEGY_ID = asHexData(`0x${'11'.repeat(32)}`);
const STRATEGY_REF = asHexData(`0x${'22'.repeat(32)}`);

function payload() {
  return {
    chainId: 46_630,
    owner: OWNER,
    contract: CONTRACT,
    projectionKey: 'm3-vault',
    blockNumber: '100',
    blockHash: BLOCK_HASH,
    state: {
      owner: OWNER,
      strategyCreator: CREATOR,
      strategyId: STRATEGY_ID,
      strategyRef: STRATEGY_REF,
      pass: PASS,
      passStrategyId: STRATEGY_ID,
      afUsdc: USDC,
      afEth: ETH,
      afBtc: BTC,
      passLocker: LOCKER,
      principalBasis: '1000000',
      trackedUsdcBalance: '1000000',
      realizedProfit: '0',
      withdrawableUsdc: '1000000',
      trackedAfEth: '0',
      trackedAfBtc: '0',
      openTrackedPositionCount: '0',
      closed: false,
    },
  };
}

test('web Vault client reads the canonical owner projection through the same-process API', async () => {
  const requests: Array<{ input: string; init: RequestInit | undefined }> = [];
  const client = new M3VaultApiClient(async (input, init) => {
    requests.push({ input: String(input), init });
    return new Response(JSON.stringify(payload()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.deepEqual(await client.readSnapshot(OWNER), payload());
  assert.deepEqual(requests, [
    {
      input: `/api/v1/chain/vaults/${OWNER}`,
      init: { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } },
    },
  ]);
});

test('web Vault client rejects foreign owners, malformed state and unavailable projections', async () => {
  for (const response of [
    new Response(JSON.stringify({ ...payload(), owner: CREATOR }), { status: 200 }),
    new Response(JSON.stringify({ ...payload(), state: { ...payload().state, principalBasis: '-1' } }), {
      status: 200,
    }),
    new Response(JSON.stringify({ error: 'CHAIN_PROJECTION_UNAVAILABLE' }), { status: 503 }),
  ]) {
    const client = new M3VaultApiClient(async () => response);
    await assert.rejects(
      () => client.readSnapshot(OWNER),
      (error: unknown) => error instanceof M3VaultReadFailure && error.code === 'M3_VAULT_READ_FAILED',
    );
  }
});

test('web Vault client registers exact wallet submission identity through the same-origin API', async () => {
  const calldata = encodeM3VaultCall('deposit(uint256)', [1_000_000n]);
  const txHash = asTransactionHash(`0x${'bb'.repeat(32)}`);
  const input = {
    operationId: 'web-submission-1',
    chainId: 46_630,
    owner: OWNER,
    target: CONTRACT,
    calldata,
    txHash,
  } as const;
  const response = {
    ...input,
    state: 'SUBMITTED',
    submittedAt: '2026-09-20T00:00:00.000Z',
  } as const;
  const requests: Array<{ input: string; init: RequestInit | undefined }> = [];
  const client = new M3VaultApiClient(async (request, init) => {
    requests.push({ input: String(request), init });
    return new Response(JSON.stringify(response), { status: 202 });
  });

  assert.deepEqual(await client.registerSubmission(input), response);
  assert.deepEqual(requests, [
    {
      input: '/api/v1/chain/operations',
      init: {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-QuantPass-Demo': '1',
        },
        body: JSON.stringify(input),
      },
    },
  ]);
});

test('web Vault client reads exact operation evidence for the registered owner', async () => {
  const evidence = {
    lifecycle: 'CONFIRMED',
    receipt: 'SUCCESS',
    receiptCanonical: true,
    confirmations: 3,
    reconciliation: 'MATCHED',
    projection: 'READY',
    chainStatus: 'SOFT_READY',
    l1Status: 'UNKNOWN',
    finalityStatus: 'UNKNOWN',
    indexerStatus: 'HEALTHY',
    degradedReason: null,
    productReady: true,
  } as const;
  const client = new M3VaultApiClient(async (request, init) => {
    assert.equal(String(request), `/api/v1/chain/operations/web-submission-1/evidence?owner=${OWNER}`);
    assert.deepEqual(init, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    return new Response(JSON.stringify({ operationId: 'web-submission-1', ...evidence }), { status: 200 });
  });

  assert.deepEqual(await client.readOperationEvidence('web-submission-1', OWNER), evidence);
});

test('web Vault client rejects evidence with a conflicting operation id or extra authority', async () => {
  for (const body of [
    {
      operationId: 'different-operation',
      lifecycle: 'SUBMITTED',
      receipt: 'PENDING',
      receiptCanonical: false,
      confirmations: 0,
      reconciliation: 'PENDING',
      projection: 'PENDING',
      chainStatus: 'PENDING',
      l1Status: 'UNKNOWN',
      finalityStatus: 'UNKNOWN',
      indexerStatus: 'SYNCING',
      degradedReason: null,
      productReady: false,
    },
    {
      operationId: 'web-submission-1',
      lifecycle: 'SUBMITTED',
      receipt: 'PENDING',
      receiptCanonical: false,
      confirmations: 0,
      reconciliation: 'PENDING',
      projection: 'PENDING',
      chainStatus: 'PENDING',
      l1Status: 'UNKNOWN',
      finalityStatus: 'UNKNOWN',
      indexerStatus: 'SYNCING',
      degradedReason: null,
      productReady: false,
      owner: OWNER,
    },
  ]) {
    const client = new M3VaultApiClient(async () => new Response(JSON.stringify(body), { status: 200 }));
    await assert.rejects(
      () => client.readOperationEvidence('web-submission-1', OWNER),
      /M3_VAULT_READ_FAILED/,
    );
  }
});
