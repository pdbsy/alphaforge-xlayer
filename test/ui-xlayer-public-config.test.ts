import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readM3BuildMode,
  readXLayerPublicConfig,
  loadXLayerPublicRuntime,
} from '../apps/web/src/xlayer-public-config.ts';

const empty = {
  schemaVersion: 1,
  environment: 'xlayer-testnet',
  chainId: 1952,
  deploymentStatus: 'NOT_DEPLOYED',
  deployments: [],
};
test('public mode requires an exact trusted testnet build and rejects ambiguous modes', () => {
  assert.equal(readM3BuildMode({}), 'local');
  assert.equal(
    readM3BuildMode({
      VITE_AF_APP_MODE: 'testnet',
      VITE_AF_CHAIN: 'xlayer-testnet',
      VITE_AF_CHAIN_ID: '1952',
    }),
    'testnet',
  );
  for (const env of [
    { VITE_AF_APP_MODE: 'public' },
    { VITE_AF_APP_MODE: '' },
    { VITE_AF_APP_MODE: 'testnet' },
    { VITE_AF_APP_MODE: 'testnet', VITE_AF_CHAIN: 'xlayer-testnet', VITE_AF_CHAIN_ID: '196' },
  ])
    assert.throws(() => readM3BuildMode(env));
});
test('public config fails closed for foreign networks, extra authority and inconsistent deployment status', () => {
  assert.deepEqual(readXLayerPublicConfig(empty), empty);
  for (const value of [
    null,
    [],
    { ...empty, schemaVersion: 2 },
    { ...empty, environment: 'robinhood-chain-testnet' },
    ...[195, 196, 46630, '1952'].map((chainId) => ({ ...empty, chainId })),
    { ...empty, deploymentStatus: 'DEPLOYED' },
    { ...empty, deployments: [{}] },
    { ...empty, runtime: {} },
  ])
    assert.throws(() => readXLayerPublicConfig(value), /INVALID_XLAYER_PUBLIC_CONFIG/);
});
test('public bootstrap reads only same-origin config and creates an inert undeployed runtime', async () => {
  let calls = 0;
  const { runtime, config } = await loadXLayerPublicRuntime(async (url, init) => {
    calls++;
    assert.equal(url, '/api/xlayer/config');
    assert.equal(init?.credentials, 'same-origin');
    assert.equal(init?.cache, 'no-store');
    return new Response(JSON.stringify(empty));
  });
  assert.equal(calls, 1);
  assert.equal(config.deploymentStatus, 'NOT_DEPLOYED');
  assert.equal(runtime.snapshot.onchain.deployment, 'UNAVAILABLE');
  assert.equal(runtime.snapshot.onchain.writeMode, 'DISABLED');
});
test('public bootstrap never substitutes a local deployment after transport or config failure', async () => {
  for (const fetcher of [
    async () => new Response('{}', { status: 503 }),
    async () => new Response('not-json'),
    async () => new Response(JSON.stringify({ ...empty, chainId: 196 })),
    async () => {
      throw Error('private transport detail');
    },
  ])
    await assert.rejects(
      loadXLayerPublicRuntime(fetcher),
      /XLAYER_CONFIG_UNAVAILABLE|INVALID_XLAYER_PUBLIC_CONFIG/,
    );
});

test('deployed public config preserves reviewed bindings and rejects incomplete or foreign deployment authority', async () => {
  const deployment = {
    source: 'reviewed-deployment-manifest',
    chainId: 1952,
    vaultAddress: `0x${'22'.repeat(20)}`,
    deploymentBlock: '1',
    abiVersion: 'm3-vault-db620d6',
    abiHash: '0x264b4498cf396008e4619664c59bf8d8eac0a04f04b80e760df3cfbc00846977',
    manifestDigest: `0x${'12'.repeat(32)}`,
    runtimeBytecodeHash: `0x${'34'.repeat(32)}`,
    strategyPassAddress: `0x${'44'.repeat(20)}`,
    strategyPassDeploymentBlock: '2',
    strategyPassAbiHash: '0xdd989644feeb7798baca69f7391ba75b6f9d09f47fb05bd90184f6072912923f',
    strategyPassRuntimeBytecodeHash: `0x${'56'.repeat(32)}`,
  };
  const body = { ...empty, deploymentStatus: 'DEPLOYED', deployments: [deployment] };
  const config = readXLayerPublicConfig(body);
  assert.deepEqual(config.deployments, [deployment]);
  assert.ok(Object.isFrozen(config.deployments[0]));
  let walletCalls = 0;
  const result = await loadXLayerPublicRuntime(async () => new Response(JSON.stringify(body)), {
    request: async () => {
      walletCalls++;
      throw Error('Must remain inert');
    },
    on() {},
    removeListener() {},
  });
  assert.equal(result.runtime.snapshot.onchain.deployment, 'CONFIGURED');
  assert.equal(walletCalls, 0);
  for (const changed of [
    { chainId: 46630 },
    { abiHash: `0x${'00'.repeat(32)}` },
    { vaultAddress: `0x${'00'.repeat(20)}` },
    { strategyPassAddress: deployment.vaultAddress },
    { deploymentBlock: 1 },
    { passInitialSupplyBaseUnits: '1' },
    { provider: {} },
  ])
    assert.throws(
      () => readXLayerPublicConfig({ ...body, deployments: [{ ...deployment, ...changed }] }),
      /INVALID_XLAYER_PUBLIC_CONFIG/,
    );
  assert.throws(
    () => readXLayerPublicConfig({ ...body, deployments: [deployment, deployment] }),
    /INVALID_XLAYER_PUBLIC_CONFIG/,
  );
});
