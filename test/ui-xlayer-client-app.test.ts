import { M3VaultApiClient } from '../apps/web/src/m3-vault-client.ts';
import { M3_XLAYER_NETWORK, M3_ROBINHOOD_NETWORK } from '../apps/web/src/m3-network.ts';
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
import { M3_STRATEGY_PASS_ABI_HASH } from '../packages/chain-adapter/src/pass-abi.ts';
import { transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import { asAddress, asBlockHash, asTransactionHash, asHexData } from '../packages/chain-adapter/src/types.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';

const owner = asAddress(`0x${'11'.repeat(20)}`);
const vault = asAddress(`0x${'22'.repeat(20)}`);
const pass = asAddress(`0x${'44'.repeat(20)}`);
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
          state:
            projectionKey === 'm3-strategy-pass'
              ? {
                  owner,
                  pass,
                  strategyId: `0x${'11'.repeat(32)}`,
                  decimals: 18,
                  balanceRaw: network.chainId === 1952 ? '1' : '2',
                }
              : {
                  owner,
                  strategyCreator: asAddress(`0x${'33'.repeat(20)}`),
                  strategyId: `0x${'11'.repeat(32)}`,
                  strategyRef: `0x${'22'.repeat(32)}`,
                  pass,
                  passStrategyId: `0x${'11'.repeat(32)}`,
                  afUsdc: asAddress(`0x${'55'.repeat(20)}`),
                  afEth: asAddress(`0x${'66'.repeat(20)}`),
                  afBtc: asAddress(`0x${'77'.repeat(20)}`),
                  passLocker: asAddress(`0x${'88'.repeat(20)}`),
                  principalBasis: '0',
                  trackedUsdcBalance: '0',
                  realizedProfit: '0',
                  withdrawableUsdc: '0',
                  trackedAfEth: '0',
                  trackedAfBtc: '0',
                  openTrackedPositionCount: '0',
                  closed: false,
                },
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

test('real client and mixed-chain app isolate equal addresses and operation IDs', async (t) => {
  const { app, runtimes } = await fixture(t);
  runtimes[0]!.recordSubmission({
    operationId: 'foreign-only',
    chainId: 46630,
    owner,
    target: vault,
    calldata: encodeM3VaultCall('close()', []),
    txHash: asTransactionHash(`0x${'dd'.repeat(32)}`),
  });
  const fetcher: typeof fetch = async (url) => {
    const response = await app.inject({ url: String(url), headers });
    return new Response(response.body, { status: response.statusCode });
  };
  for (const network of [M3_XLAYER_NETWORK, M3_ROBINHOOD_NETWORK]) {
    const client = new M3VaultApiClient(fetcher, { vaultAddress: vault, passAddress: pass }, network);
    assert.equal((await client.readSnapshot(owner)).chainId, network.chainId);
    assert.equal(
      (await client.readPassSnapshot(owner)).state.balanceRaw,
      network.chainId === 1952 ? '1' : '2',
    );
    assert.equal((await client.readRuntimeStatus()).deployment.chainId, network.chainId);
    assert.equal(
      (await client.readOperationEvidence('same-operation', owner)).lifecycle,
      network.chainId === 1952 ? 'SUBMITTED' : 'DROPPED',
    );
    if (network.chainId === 1952)
      await assert.rejects(client.readOperationEvidence('foreign-only', owner), /M3_VAULT_READ_FAILED/);
    else assert.equal((await client.readOperationEvidence('foreign-only', owner)).lifecycle, 'SUBMITTED');
  }
});
