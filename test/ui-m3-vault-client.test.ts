import test from 'node:test';
import assert from 'node:assert/strict';
import { M3VaultApiClient, M3VaultReadFailure } from '../apps/web/src/m3-vault-client.ts';
import { asAddress, asBlockHash, asHexData } from '../packages/chain-adapter/src/types.ts';

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
