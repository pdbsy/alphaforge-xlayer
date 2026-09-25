import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/server/src/app.ts';
import { XLAYER_TESTNET } from '../packages/xlayer-chain/src/network.ts';

const env = {
  QP_MODE: 'local',
  QP_ADAPTER: 'mock',
  XLAYER_CHAIN: 'xlayer-testnet',
  XLAYER_CHAIN_ID: '1952',
  XLAYER_RPC_URL: XLAYER_TESTNET.rpcUrl,
  XLAYER_EXPLORER_URL: XLAYER_TESTNET.explorerUrl,
};

test('local XLayer app validates explicit network configuration before building a demo', async () => {
  for (const override of [
    { XLAYER_CHAIN_ID: '196' },
    { XLAYER_CHAIN: 'robinhood-chain-testnet' },
    { XLAYER_RPC_URL: 'http://example.invalid' },
    { XLAYER_CHAIN: undefined },
    { QP_ADAPTER: 'rpc' },
  ]) {
    await assert.rejects(async () => {
      const { app } = await buildApp({
        dbPath: ':memory:',
        env: { ...env, ...override },
        origin: 'http://127.0.0.1:4180',
      });
      await app.close();
    });
  }
});

test('explicit XLayer local config retains mock-only catalog and health without network access', async (t) => {
  const { app } = await buildApp({ dbPath: ':memory:', env, origin: 'http://127.0.0.1:4180' });
  t.after(() => app.close());
  const headers = { host: '127.0.0.1:4180' };
  const health = await app.inject({ url: '/api/health', headers });
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { scope: 'TEST_ONLY', ready: true, realFundsEnabled: false });
  const session = await app.inject({
    method: 'POST',
    url: '/api/demo/session',
    headers: { ...headers, 'x-quantpass-demo': '1' },
    payload: { user: 'alice' },
  });
  assert.equal(session.statusCode, 200);
  const catalog = await app.inject({
    url: '/api/strategies',
    headers: { ...headers, cookie: session.headers['set-cookie']!.toString().split(';')[0]! },
  });
  assert.equal(catalog.statusCode, 200);
  assert.deepEqual(
    catalog.json().map((item: { strategyId: string; scope: string }) => ({
      strategyId: item.strategyId,
      scope: item.scope,
    })),
    [
      { strategyId: 'core-flow-demo', scope: 'TEST_ONLY' },
      { strategyId: 'satellite-flow-demo', scope: 'TEST_ONLY' },
    ],
  );
  const disabled = await app.inject({ url: '/api/v1/chain/runtime-status', headers });
  assert.equal(disabled.statusCode, 404);
});
