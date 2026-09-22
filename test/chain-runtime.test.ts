import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { JsonRpcClient } from '../packages/chain-adapter/src/rpc.ts';
import type { M3ChainRuntimeDeployment } from '../apps/server/src/m3-chain-runtime.ts';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { M3ChainRuntime, composeM3ChainRuntime } from '../apps/server/src/m3-chain-runtime.ts';
import {
  deploymentManifestDigest,
  validateDeploymentManifest,
} from '../packages/chain-adapter/src/manifest.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';
import { encodeM3VaultCall } from '../packages/chain-adapter/src/vault-abi.ts';
import { asAddress, asBlockHash, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';

const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const TX = asTransactionHash(`0x${'aa'.repeat(32)}`);
const manifestBody = {
  schemaVersion: 1,
  environment: 'robinhood-chain-testnet',
  chainId: 46_630,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: CONTRACT,
  deploymentBlock: '100',
  abiVersion: 'm3-vault-db620d6',
  runtimeBytecodeHash: asBlockHash(`0x${'99'.repeat(32)}`),
} as const;
const manifestDigest = deploymentManifestDigest(manifestBody);
const manifest = validateDeploymentManifest(
  { ...manifestBody, manifestDigest },
  { environment: 'robinhood-chain-testnet', chainId: 46_630, manifestDigest, contractAddress: CONTRACT },
);

class InertRpc implements ReadonlyRpc {
  async chainId() {
    return 46_630;
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
  async call() {
    return asHexData('0x');
  }
}

async function path() {
  await mkdir('.checks', { recursive: true });
  const directory = await mkdtemp(resolve('.checks/m3-runtime-'));
  return resolve(directory, 'chain.sqlite');
}

test('M3 runtime owns one persistent store/synchronizer lifecycle and records only exact Vault calldata', async () => {
  const dbPath = await path();
  let runtime = new M3ChainRuntime({
    dbPath,
    rpc: new InertRpc(),
    manifest,
    now: () => '2026-09-19T12:00:00.000Z',
  });
  const calldata = encodeM3VaultCall('deposit(uint256)', [1_000_000n]);
  const submitted = runtime.recordSubmission({
    operationId: 'runtime-deposit-1',
    chainId: 46_630,
    owner: OWNER,
    target: CONTRACT,
    calldata,
    txHash: TX,
  });
  assert.equal(submitted.state, 'SUBMITTED');
  assert.equal(submitted.calldata, calldata);
  assert.deepEqual(
    runtime.recordSubmission({
      operationId: 'runtime-deposit-1',
      chainId: 46_630,
      owner: OWNER,
      target: CONTRACT,
      calldata,
      txHash: TX,
    }),
    submitted,
  );
  assert.throws(
    () =>
      runtime.recordSubmission({
        operationId: 'runtime-view',
        chainId: 46_630,
        owner: OWNER,
        target: CONTRACT,
        calldata: encodeM3VaultCall('owner()', []),
        txHash: asTransactionHash(`0x${'bb'.repeat(32)}`),
      }),
    /INVALID_M3_WALLET_SUBMISSION/,
  );
  runtime.close();

  runtime = new M3ChainRuntime({ dbPath, rpc: new InertRpc(), manifest });
  assert.equal(runtime.store.operation('runtime-deposit-1')?.calldata, calldata);
  assert.equal(runtime.chainEvidence.store, runtime.store);
  runtime.store.saveOperation({
    ...runtime.store.operation('runtime-deposit-1')!,
    operationId: 'runtime-conflict',
    chainId: 1,
  });
  assert.throws(
    () =>
      runtime.recordSubmission({
        operationId: 'runtime-conflict',
        chainId: 46_630,
        owner: OWNER,
        target: CONTRACT,
        calldata,
        txHash: TX,
      }),
    /OPERATION_IDENTITY_CONFLICT/,
  );
  runtime.close();
});

test('deployment-aware composition stays disabled without evidence and validates the exact ABI before startup', async () => {
  assert.equal(composeM3ChainRuntime({ deploymentStatus: 'NOT_DEPLOYED' }), null);
  const dbPath = await path();
  const runtime = composeM3ChainRuntime({
    deploymentStatus: 'DEPLOYED',
    dbPath,
    rpcEndpoints: ['https://rpc.testnet.chain.robinhood.com'],
    manifestDocument: { ...manifestBody, manifestDigest },
    expectedManifestDigest: manifestDigest,
    expectedContractAddress: CONTRACT,
  });
  assert.ok(runtime instanceof M3ChainRuntime);
  assert.equal(runtime.manifest.abiVersion, 'm3-vault-db620d6');
  runtime.close();

  const wrongBody = { ...manifestBody, abiVersion: 'other-reviewed-abi' };
  const wrongDigest = deploymentManifestDigest(wrongBody);
  const wrongDbPath = await path();
  assert.throws(
    () =>
      composeM3ChainRuntime({
        deploymentStatus: 'DEPLOYED',
        dbPath: wrongDbPath,
        rpcEndpoints: ['https://rpc.testnet.chain.robinhood.com'],
        manifestDocument: { ...wrongBody, manifestDigest: wrongDigest },
        expectedManifestDigest: wrongDigest,
        expectedContractAddress: CONTRACT,
      }),
    /M3_VAULT_ABI_MISMATCH/,
  );
});

const xlayerNetwork = { environment: 'xlayer-testnet', chainId: 1952 } as const;
const xlayerBody = { ...manifestBody, ...xlayerNetwork };
const xlayerDigest = deploymentManifestDigest(xlayerBody);

function xlayerDeployment(dbPath: string) {
  return {
    deploymentStatus: 'DEPLOYED',
    dbPath,
    rpcEndpoints: ['https://testrpc.xlayer.tech/terigon'],
    manifestDocument: { ...xlayerBody, manifestDigest: xlayerDigest },
    expectedNetwork: xlayerNetwork,
    expectedManifestDigest: xlayerDigest,
    expectedContractAddress: CONTRACT,
  } as const;
}

test('X Layer runtime requires explicit trusted selection before constructing RPC or a store', async () => {
  const dbPath = await path();
  const input = xlayerDeployment(dbPath);
  const runtime = composeM3ChainRuntime(input, { createRpc: () => new InertRpc() });
  assert.ok(runtime);
  assert.equal(runtime.chainEvidence.chainId, 1952);
  runtime.close();
  const rejectedPath = await path();
  const implicit: M3ChainRuntimeDeployment = { ...xlayerDeployment(rejectedPath) };
  delete (implicit as { expectedNetwork?: unknown }).expectedNetwork;
  assert.throws(
    () =>
      composeM3ChainRuntime(implicit, {
        createRpc: () => assert.fail('RPC created before trust validation'),
      }),
    /INVALID_DEPLOYMENT_MANIFEST/,
  );
  assert.equal(existsSync(rejectedPath), false);
  for (const expectedNetwork of [
    null,
    { environment: 'xlayer-testnet', chainId: 196 },
    { environment: 'xlayer-testnet', chainId: 195 },
    { environment: 'xlayer-testnet', chainId: 46_630 },
    { environment: 'robinhood-chain-testnet', chainId: 1952 },
  ]) {
    assert.throws(
      () =>
        composeM3ChainRuntime(
          { ...input, dbPath: rejectedPath, expectedNetwork } as unknown as M3ChainRuntimeDeployment,
          { createRpc: () => assert.fail('RPC created for unsupported pair') },
        ),
      /INVALID_DEPLOYMENT_MANIFEST/,
    );
    assert.equal(existsSync(rejectedPath), false);
  }
});

test('X Layer rejects wrong RPC chains before reading blocks or persisting evidence', async () => {
  for (const chainId of [196, 195, 46_630]) {
    const methods: string[] = [];
    const input = xlayerDeployment(await path());
    const runtime = composeM3ChainRuntime(input, {
      createRpc: (endpoints) =>
        new JsonRpcClient(endpoints, {
          transport: async (_endpoint, request) => {
            methods.push(request.method);
            return {
              status: 200,
              body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: `0x${chainId.toString(16)}` }),
            };
          },
        }),
    });
    assert.ok(runtime);
    try {
      await assert.rejects(() => runtime.syncToHead(), /CHAIN_ID_MISMATCH/);
      assert.deepEqual(methods, ['eth_chainId']);
      assert.equal(runtime.store.checkpoint(1952, CONTRACT), null);
      assert.deepEqual(runtime.store.canonicalEvents(1952, CONTRACT), []);
      assert.equal(runtime.chainEvidence.syncStatus?.().lastAttempt, 'FAILED');
    } finally {
      runtime.close();
    }
  }
});

test('X Layer and Robinhood submissions isolate the same transaction hash and reject operation ID reuse', async () => {
  const dbPath = await path();
  const robinhood = new M3ChainRuntime({ dbPath, rpc: new InertRpc(), manifest });
  const xlayer = composeM3ChainRuntime(xlayerDeployment(dbPath), { createRpc: () => new InertRpc() });
  assert.ok(xlayer);
  const identity = {
    owner: OWNER,
    target: CONTRACT,
    txHash: TX,
    calldata: encodeM3VaultCall('deposit(uint256)', [1_000_000n]),
  };
  try {
    const robinhoodInput = { ...identity, chainId: 46_630, operationId: 'rh-deposit' };
    const xlayerInput = { ...identity, chainId: 1952, operationId: 'xl-deposit' };
    robinhood.recordSubmission(robinhoodInput);
    const xl = xlayer.recordSubmission(xlayerInput);
    assert.deepEqual(xlayer.recordSubmission(xlayerInput), xl);
    assert.equal(xlayer.store.operationByTransaction(1952, TX)?.operationId, 'xl-deposit');
    assert.equal(xlayer.store.operationByTransaction(46_630, TX)?.operationId, 'rh-deposit');
    assert.throws(
      () => xlayer.recordSubmission({ ...xlayerInput, operationId: 'rh-deposit' }),
      /OPERATION_IDENTITY_CONFLICT/,
    );
    assert.throws(
      () => xlayer.recordSubmission({ ...xlayerInput, operationId: 'xl-duplicate' }),
      /OPERATION_IDENTITY_CONFLICT/,
    );
    assert.throws(() => xlayer.recordSubmission(robinhoodInput), /INVALID_M3_WALLET_SUBMISSION/);
    assert.throws(() => robinhood.recordSubmission(xlayerInput), /INVALID_M3_WALLET_SUBMISSION/);
  } finally {
    xlayer.close();
    robinhood.close();
  }
  const reopened = composeM3ChainRuntime(xlayerDeployment(dbPath), { createRpc: () => new InertRpc() });
  assert.ok(reopened);
  try {
    assert.equal(reopened.store.operationByTransaction(1952, TX)?.operationId, 'xl-deposit');
    assert.equal(reopened.store.operationByTransaction(46_630, TX)?.operationId, 'rh-deposit');
  } finally {
    reopened.close();
  }
});
