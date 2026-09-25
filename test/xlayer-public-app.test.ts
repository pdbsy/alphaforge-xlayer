import test from 'node:test';
import assert from 'node:assert/strict';
import { asAddress, asBlockHash } from '../packages/chain-adapter/src/types.ts';
import { buildXLayerPublicApp } from '../apps/server/src/xlayer-public-app.ts';
import { deploymentManifestDigest } from '../packages/chain-adapter/src/manifest.ts';
import {
  validateXLayerPublicDeployment,
  type XLayerPublicDeployment,
} from '../apps/server/src/xlayer-public-config.ts';

const origin = 'https://alphaforge.example';
const headers = { host: 'alphaforge.example' };

test('unconfigured public website serves minimal testnet configuration and honest readiness', async () => {
  const app = await buildXLayerPublicApp({ origin, deployments: [] });
  try {
    const config = await app.inject({ url: '/api/xlayer/config', headers });
    assert.equal(config.statusCode, 200);
    assert.deepEqual(config.json(), {
      schemaVersion: 1,
      environment: 'xlayer-testnet',
      chainId: 1952,
      deploymentStatus: 'NOT_DEPLOYED',
      deployments: [],
    });
    const health = await app.inject({ url: '/api/health', headers });
    assert.equal(health.statusCode, 503);
    assert.deepEqual(health.json(), {
      ready: false,
      network: 'xlayer-testnet',
      deploymentStatus: 'NOT_DEPLOYED',
    });
    assert.match(config.headers['content-security-policy']!, /default-src 'self'/);
    assert.equal(config.headers['cache-control'], 'no-store');
  } finally {
    await app.close();
  }
});

test('public website has no local identity or simulated product endpoints', async () => {
  const app = await buildXLayerPublicApp({ origin, deployments: [] });
  try {
    for (const url of ['/api/demo/session', '/api/v1/access/claims', '/api/v1/vaults', '/api/session']) {
      const response = await app.inject({
        method: 'POST',
        url,
        headers: { ...headers, origin },
        payload: { user: 'alice' },
      });
      assert.equal(response.statusCode, 404);
    }
  } finally {
    await app.close();
  }
});

test('public website rejects host spoofing, foreign origins and cross-site requests', async () => {
  const app = await buildXLayerPublicApp({ origin, deployments: [] });
  try {
    for (const extra of [
      { host: 'attacker.example' },
      { origin: 'https://attacker.example' },
      { 'sec-fetch-site': 'cross-site' },
    ]) {
      const response = await app.inject({ url: '/api/xlayer/config', headers: { ...headers, ...extra } });
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().message, 'Request origin is not allowed.');
    }
    const missingOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/chain/operations',
      headers,
      payload: {},
    });
    assert.equal(missingOrigin.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('public origin validation requires HTTPS except explicit loopback rehearsal', async () => {
  for (const value of [
    'http://alphaforge.example',
    'https://user:secret@alphaforge.example',
    'https://alphaforge.example/path',
    'https://alphaforge.example/?key=secret',
  ])
    await assert.rejects(buildXLayerPublicApp({ origin: value, deployments: [] }), /INVALID_PUBLIC_ORIGIN/);
  const app = await buildXLayerPublicApp({ origin: 'http://127.0.0.1:4180', deployments: [] });
  await app.close();
});

const manifest = {
  schemaVersion: 1,
  environment: 'xlayer-testnet',
  chainId: 1952,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: asAddress('0x1111111111111111111111111111111111111111'),
  deploymentBlock: '25',
  abiVersion: 'm3-vault-db620d6',
  abiHash: asBlockHash('0x264b4498cf396008e4619664c59bf8d8eac0a04f04b80e760df3cfbc00846977'),
  runtimeBytecodeHash: asBlockHash(`0x${'2'.repeat(64)}`),
  strategyPassAddress: asAddress('0x3333333333333333333333333333333333333333'),
  strategyPassDeploymentBlock: '24',
  strategyPassAbiHash: asBlockHash('0xdd989644feeb7798baca69f7391ba75b6f9d09f47fb05bd90184f6072912923f'),
  strategyPassRuntimeBytecodeHash: asBlockHash(`0x${'4'.repeat(64)}`),
} as const;
function publicDeployment(): XLayerPublicDeployment {
  return {
    source: 'reviewed-deployment-manifest',
    chainId: 1952,
    vaultAddress: manifest.contractAddress,
    deploymentBlock: manifest.deploymentBlock,
    abiVersion: manifest.abiVersion,
    abiHash: manifest.abiHash,
    runtimeBytecodeHash: manifest.runtimeBytecodeHash,
    strategyPassAddress: manifest.strategyPassAddress,
    strategyPassDeploymentBlock: manifest.strategyPassDeploymentBlock,
    strategyPassAbiHash: manifest.strategyPassAbiHash,
    strategyPassRuntimeBytecodeHash: manifest.strategyPassRuntimeBytecodeHash,
    manifestDigest: deploymentManifestDigest(manifest),
  };
}

test('configured website exposes only manifest-bound public fields without claiming an absent indexer is ready', async () => {
  const deployment = publicDeployment();
  const app = await buildXLayerPublicApp({ origin, deployments: [deployment] });
  try {
    const config = await app.inject({ url: '/api/xlayer/config', headers });
    assert.equal(config.statusCode, 200);
    assert.deepEqual(config.json().deployments, [deployment]);
    assert.equal(config.json().deploymentStatus, 'DEPLOYED');
    const health = await app.inject({ url: '/api/health', headers });
    assert.equal(health.statusCode, 503);
    assert.equal(health.json().ready, false);
  } finally {
    await app.close();
  }
});

test('public deployment rejects cross-chain configuration, mismatched evidence, zero code and unknown fields', () => {
  const deployment = publicDeployment();
  for (const change of [
    { chainId: 196 },
    { chainId: 46630 },
    { source: 'fixture' },
    { deploymentBlock: '26' },
    { vaultAddress: '0x5555555555555555555555555555555555555555' },
    { runtimeBytecodeHash: `0x${'0'.repeat(64)}` },
    { manifestDigest: `0x${'6'.repeat(64)}` },
    { dbPath: '/private/data.sqlite' },
    { passInitialSupplyBaseUnits: '1' },
    { passInitialSupplyBaseUnits: '1', passInitialRecipient: '0x0000000000000000000000000000000000000000' },
  ])
    assert.throws(() =>
      validateXLayerPublicDeployment({ ...deployment, ...change } as XLayerPublicDeployment),
    );
});

test('duplicate public Vault records fail before constructing a server', async () => {
  const deployment = publicDeployment();
  await assert.rejects(
    buildXLayerPublicApp({ origin, deployments: [deployment, deployment] }),
    /INVALID_PUBLIC_DEPLOYMENT_SET/,
  );
});
