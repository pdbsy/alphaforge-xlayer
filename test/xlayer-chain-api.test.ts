import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildM3App } from '../apps/server/src/m3-app.ts';
import { composeM3ChainRuntime } from '../apps/server/src/m3-chain-runtime.ts';
import {
  deploymentManifestDigest,
  type DeploymentNetworkExpectation,
} from '../packages/chain-adapter/src/manifest.ts';
import {
  encodeM3VaultCall,
  M3_VAULT_ABI_HASH,
  M3_VAULT_ABI_VERSION,
} from '../packages/chain-adapter/src/vault-abi.ts';
import {
  M3_STRATEGY_PASS_ABI_HASH,
  encodeM3StrategyPassTransfer,
} from '../packages/chain-adapter/src/pass-abi.ts';
import { transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import { asAddress, asBlockHash, asTransactionHash, asHexData } from '../packages/chain-adapter/src/types.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';

const owner = asAddress(`0x${'11'.repeat(20)}`);
const vault = asAddress(`0x${'22'.repeat(20)}`);
const pass = asAddress(`0x${'44'.repeat(20)}`);
const recipient = asAddress(`0x${'55'.repeat(20)}`);
const txHash = asTransactionHash(`0x${'aa'.repeat(32)}`);
const block = {
  number: 1n,
  hash: asBlockHash(`0x${'bb'.repeat(32)}`),
  parentHash: asBlockHash(`0x${'cc'.repeat(32)}`),
  timestamp: 1n,
};
const networks: readonly DeploymentNetworkExpectation[] = [
  { environment: 'robinhood-chain-testnet', chainId: 46630 },
  { environment: 'xlayer-testnet', chainId: 1952 },
];
const headers = { host: '127.0.0.1:4180' };
class OfflineRpc implements ReadonlyRpc {
  async chainId() {
    return 1952;
  }
  async block() {
    return null;
  }
  async receipt() {
    return null;
  }
  async logs() {
    return [];
  }
  async code() {
    return asHexData('0x');
  }
  async call() {
    return asHexData('0x');
  }
}
async function fixture(t: TestContext, selected = networks) {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-r2-api-'));
  const runtimes = selected.map((network) => {
    const body = {
      schemaVersion: 1 as const,
      ...network,
      contractName: 'AlphaForgeVault',
      contractType: 'vault',
      contractAddress: vault,
      deploymentBlock: '1',
      abiVersion: M3_VAULT_ABI_VERSION,
      abiHash: M3_VAULT_ABI_HASH,
      runtimeBytecodeHash: block.hash,
      strategyPassAddress: pass,
      strategyPassDeploymentBlock: '1',
      strategyPassAbiHash: M3_STRATEGY_PASS_ABI_HASH,
      strategyPassRuntimeBytecodeHash: block.hash,
    };
    const digest = deploymentManifestDigest(body);
    const runtime = composeM3ChainRuntime(
      {
        deploymentStatus: 'DEPLOYED',
        dbPath: join(directory, `${network.chainId}.sqlite`),
        rpcEndpoints: ['https://rpc.invalid'],
        manifestDocument: { ...body, manifestDigest: digest },
        expectedNetwork: network,
        expectedManifestDigest: digest,
        expectedContractAddress: vault,
      },
      { createRpc: () => new OfflineRpc() },
    )!;
    for (const [contract, projectionKey] of [
      [vault, 'm3-vault'],
      [pass, 'm3-strategy-pass'],
    ] as const) {
      runtime.store.recordCanonicalBlock(network.chainId, contract, block, []);
      runtime.store.commitProjections(network.chainId, contract, block, [
        {
          chainId: network.chainId,
          owner,
          contract,
          projectionKey,
          blockNumber: 1n,
          blockHash: block.hash,
          state: { balanceRaw: network.chainId === 1952 ? '1' : '2' },
        },
      ]);
    }
    const operation = runtime.recordSubmission({
      operationId: 'same-operation',
      chainId: network.chainId,
      owner,
      target: vault,
      calldata: encodeM3VaultCall('rescueNative()', []),
      txHash,
    });
    if (network.chainId === 46630)
      runtime.store.saveOperation(
        transitionOperation(operation, { state: 'DROPPED', errorCode: 'TRANSACTION_DROPPED' }),
      );
    return runtime;
  });
  const { app } = await buildM3App({
    dbPath: join(directory, 'local.sqlite'),
    env: { QP_MODE: 'local', QP_ADAPTER: 'mock' },
    origin: 'http://127.0.0.1:4180',
    chainRuntimes: runtimes,
  });
  t.after(async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { app, runtimes };
}

test('same-address reads select exact chain and never leak another network projection', async (t) => {
  const { app } = await fixture(t);
  for (const chainId of [1952, 46630]) {
    for (const url of [
      `/api/v1/chain/vaults/${vault}/${owner}`,
      `/api/v1/chain/passes/${pass}/${owner}`,
      `/api/v1/chain/vaults/${owner}`,
    ]) {
      const response = await app.inject({ url: `${url}?chainId=${chainId}`, headers });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.json().chainId, chainId);
      assert.equal(response.json().state.balanceRaw, chainId === 1952 ? '1' : '2');
    }
    for (const url of [
      '/api/v1/chain/runtime-status',
      `/api/v1/chain/runtime-status/${vault}`,
      `/api/v1/chain/runtime-status/${pass}`,
    ]) {
      const response = await app.inject({ url: `${url}?chainId=${chainId}`, headers });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.json().deployment.chainId, chainId);
    }
    const evidence = await app.inject({
      url: `/api/v1/chain/operations/same-operation/evidence?owner=${owner}&chainId=${chainId}`,
      headers,
    });
    assert.equal(evidence.statusCode, 200, evidence.body);
    assert.equal(evidence.json().lifecycle, chainId === 1952 ? 'SUBMITTED' : 'DROPPED');
  }
});

test('ambiguous legacy reads fail closed and malformed chain selectors cannot fall back', async (t) => {
  const { app } = await fixture(t);
  for (const url of [
    `/api/v1/chain/vaults/${vault}/${owner}`,
    `/api/v1/chain/passes/${pass}/${owner}`,
    `/api/v1/chain/runtime-status/${vault}`,
  ]) {
    const ambiguous = await app.inject({ url, headers });
    assert.equal(ambiguous.statusCode, 400, ambiguous.body);
    assert.equal(ambiguous.json().error, 'INVALID_REQUEST');
    for (const value of ['196', '1', '01952', '1952.0', '1952&chainId=46630']) {
      const rejected = await app.inject({ url: `${url}?chainId=${value}`, headers });
      assert.equal(rejected.statusCode, 400, rejected.body);
    }
  }
  const evidence = await app.inject({
    url: `/api/v1/chain/operations/same-operation/evidence?owner=${owner}`,
    headers,
  });
  assert.equal(evidence.statusCode, 404);
});

test('single XLayer runtime retains unqualified reads and records only selected-chain transfer/rescue', async (t) => {
  const { app, runtimes } = await fixture(t, [networks[1]!]);
  for (const url of [`/api/v1/chain/vaults/${vault}/${owner}`, `/api/v1/chain/passes/${pass}/${owner}`]) {
    const response = await app.inject({ url, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().chainId, 1952);
  }
  for (const [id, target, calldata] of [
    ['transfer', pass, encodeM3StrategyPassTransfer(recipient, 1n)],
    ['rescue', vault, encodeM3VaultCall('rescueUntrackedToken(address)', [recipient])],
  ] as const) {
    const payload = {
      operationId: id,
      chainId: 1952,
      owner,
      target,
      calldata,
      txHash: asTransactionHash(`0x${(id === 'transfer' ? 'dd' : 'ee').repeat(32)}`),
    };
    const accepted = await app.inject({
      method: 'POST',
      url: '/api/v1/chain/operations',
      headers: { ...headers, 'x-quantpass-demo': '1' },
      payload,
    });
    assert.equal(accepted.statusCode, 202, accepted.body);
    assert.equal(runtimes[0]!.store.operation(id)?.calldata, calldata);
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/v1/chain/operations',
      headers: { ...headers, 'x-quantpass-demo': '1' },
      payload: { ...payload, chainId: 46630 },
    });
    assert.equal(rejected.statusCode, 400);
  }
});
