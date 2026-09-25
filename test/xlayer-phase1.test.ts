import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { startM3Server } from '../apps/server/src/m3-startup.ts';
import { ChainStore } from '../apps/server/src/chain-store.ts';
import { deploymentManifestDigest } from '../packages/chain-adapter/src/manifest.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import { keccak256 } from '../packages/chain-adapter/src/keccak.ts';
import {
  encodeM3VaultCall,
  M3_VAULT_ABI_HASH,
  M3_VAULT_ABI_VERSION,
  M3_VAULT_REVIEW_ABI,
} from '../packages/chain-adapter/src/vault-abi.ts';
import {
  encodeM3StrategyPassTransfer,
  M3_STRATEGY_PASS_ABI_HASH,
  M3_STRATEGY_PASS_TRANSFER_TOPIC,
} from '../packages/chain-adapter/src/pass-abi.ts';
import {
  asAddress,
  asBlockHash,
  asTransactionHash,
  asHexData,
  type Address,
  type HexData,
} from '../packages/chain-adapter/src/types.ts';
import type {
  ChainBlock,
  ChainCall,
  ChainCallBlock,
  ChainLog,
  ChainLogFilter,
  ChainReceipt,
  ReadonlyRpc,
} from '../packages/chain-adapter/src/rpc.ts';

const address = (byte: string) => asAddress(`0x${byte.repeat(20)}`);
const owner = address('11'),
  secondOwner = address('33'),
  vault = address('22'),
  secondVault = address('66'),
  pass = address('44');
const passTx = asTransactionHash(`0x${'aa'.repeat(32)}`),
  rescueTx = asTransactionHash(`0x${'bb'.repeat(32)}`);
const network = { environment: 'xlayer-testnet', chainId: 1952 } as const;
const code = asHexData('0x6000');
const strategy = asHexData(`0x${'11'.repeat(32)}`);
const word = (n: bigint) => n.toString(16).padStart(64, '0');
const addressWord = (a: Address) => asHexData(`0x${a.slice(2).padStart(64, '0')}`);
const blocks = new Map<bigint, ChainBlock>(
  [1n, 2n, 3n].map((n) => [
    n,
    {
      number: n,
      hash: asBlockHash(`0x${word(n)}`),
      parentHash: asBlockHash(`0x${word(n - 1n)}`),
      timestamp: n,
    },
  ]),
);

class PhaseRpc implements ReadonlyRpc {
  closed = false;
  passReads = 0;
  readonly contract: Address;
  readonly owner: Address;
  constructor(contract: Address, vaultOwner: Address) {
    this.contract = contract;
    this.owner = vaultOwner;
  }
  async chainId() {
    return 1952;
  }
  async code() {
    return code;
  }
  async block(n: bigint | 'latest') {
    return blocks.get(n === 'latest' ? 3n : n) ?? null;
  }
  log(target: Address, hash: typeof passTx, index: number, topics: readonly HexData[]): ChainLog {
    return {
      address: target,
      blockNumber: 1n,
      blockHash: blocks.get(1n)!.hash,
      transactionHash: hash,
      transactionIndex: index,
      logIndex: 0,
      topics,
      data: asHexData(`0x${word(1n)}`),
      removed: false,
    };
  }
  transferLog() {
    return this.log(pass, passTx, 0, [
      M3_STRATEGY_PASS_TRANSFER_TOPIC,
      addressWord(owner),
      addressWord(secondOwner),
    ]);
  }
  rescueLog() {
    return this.log(vault, rescueTx, 1, [
      M3_VAULT_REVIEW_ABI.eventTopics['NativeRescued(address,uint256)'],
      addressWord(owner),
    ]);
  }
  async logs(filter: ChainLogFilter) {
    if (filter.address === pass) this.passReads++;
    if (filter.fromBlock > 1n || filter.toBlock < 1n) return [];
    return filter.address === pass
      ? [this.transferLog()]
      : filter.address === vault
        ? [this.rescueLog()]
        : [];
  }
  async receipt(hash: typeof passTx): Promise<ChainReceipt | null> {
    if (hash !== passTx && hash !== rescueTx) return null;
    return {
      transactionHash: hash,
      blockNumber: 1n,
      blockHash: blocks.get(1n)!.hash,
      transactionIndex: hash === passTx ? 0 : 1,
      from: owner,
      to: hash === passTx ? pass : vault,
      status: 'SUCCESS',
      logs: [hash === passTx ? this.transferLog() : this.rescueLog()],
    };
  }
  async call(request: ChainCall, reference: ChainCallBlock): Promise<HexData> {
    assert.equal(typeof reference, 'object');
    assert.equal((reference as { requireCanonical: boolean }).requireCanonical, true);
    const selector = request.data.slice(0, 10);
    if (request.to === pass) {
      if (selector === '0x313ce567') return asHexData(`0x${word(18n)}`);
      if (selector === '0x492f4e18') return strategy;
      if (selector === '0x70a08231')
        return asHexData(`0x${word(request.data.endsWith(secondOwner.slice(2)) ? 1n : 999n)}`);
      throw new Error('UNEXPECTED_PASS_CALL');
    }
    assert.equal(request.to, this.contract);
    const addresses: Record<string, Address> = {
      '0x8da5cb5b': this.owner,
      '0x499bb2ab': address('55'),
      '0xa7a1ed72': pass,
      '0x8b5a851f': address('77'),
      '0xf20173bc': address('88'),
      '0xa8d937e9': address('99'),
      '0xab88dc4b': address('ab'),
    };
    if (addresses[selector]) return addressWord(addresses[selector]);
    if (selector === '0x492f4e18' || selector === '0xc288f3de') return strategy;
    if (selector === '0x597e1fb5') return asHexData(`0x${word(this.closed ? 1n : 0n)}`);
    assert.ok(
      ['0xad587035', '0x0510ca51', '0x738b74f0', '0x442ad6a0', '0x34dda870', '0xb31ede63'].includes(selector),
    );
    return asHexData(`0x${word(0n)}`);
  }
}
function deployment(directory: string, contract: Address, file: string) {
  const body = {
    schemaVersion: 1 as const,
    ...network,
    contractName: 'AlphaForgeVault',
    contractType: 'vault',
    contractAddress: contract,
    deploymentBlock: '1',
    abiVersion: M3_VAULT_ABI_VERSION,
    abiHash: M3_VAULT_ABI_HASH,
    runtimeBytecodeHash: keccak256(code),
    strategyPassAddress: pass,
    strategyPassDeploymentBlock: '1',
    strategyPassAbiHash: M3_STRATEGY_PASS_ABI_HASH,
    strategyPassRuntimeBytecodeHash: keccak256(code),
  };
  const manifestDigest = deploymentManifestDigest(body);
  return {
    deploymentStatus: 'DEPLOYED' as const,
    dbPath: join(directory, file),
    rpcEndpoints: [`https://rpc.invalid/${file}`],
    manifestDocument: { ...body, manifestDigest },
    expectedManifestDigest: manifestDigest,
    expectedContractAddress: contract,
    expectedNetwork: network,
    maxBlocksPerSync: 3,
  };
}

test('XLayer phase-one multi-Vault Pass ownership, one-wei transfer and rescue reconciliation remain canonical', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-r2-phase1-'));
  const primaryRpc = new PhaseRpc(vault, owner),
    followerRpc = new PhaseRpc(secondVault, secondOwner);
  const server = await startM3Server(
    {
      deployments: [
        deployment(directory, secondVault, 'second.sqlite'),
        deployment(directory, vault, 'first.sqlite'),
      ],
      app: {
        dbPath: join(directory, 'demo.sqlite'),
        env: { QP_MODE: 'local', QP_ADAPTER: 'mock' },
        origin: 'http://127.0.0.1:4180',
      },
      syncIntervalMs: null,
    },
    { createRpc: (endpoints) => (endpoints[0]!.endsWith('first.sqlite') ? primaryRpc : followerRpc) },
  );
  t.after(async () => {
    await server.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const primary = server.runtimes.find((r) => r.manifest.contractAddress === vault)!;
  const follower = server.runtimes.find((r) => r.manifest.contractAddress === secondVault)!;
  assert.ok(primaryRpc.passReads > 0);
  assert.equal(followerRpc.passReads, 0);
  assert.equal(primary.chainEvidence.passContract, pass);
  assert.equal(follower.chainEvidence.passContract, undefined);
  assert.equal(follower.store.checkpoint(1952, pass), null);
  const headers = { host: '127.0.0.1:4180' };
  for (const [contract, holder] of [
    [vault, owner],
    [secondVault, secondOwner],
  ]) {
    const response = await server.app.inject({
      url: `/api/v1/chain/vaults/${contract}/${holder}?chainId=1952`,
      headers,
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().state.owner, holder);
  }
  for (const [id, target, calldata, hash] of [
    ['transfer-one-wei', pass, encodeM3StrategyPassTransfer(secondOwner, 1n), passTx],
    ['rescue-native', vault, encodeM3VaultCall('rescueNative()', []), rescueTx],
  ] as const) {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/chain/operations',
      headers: { ...headers, 'x-quantpass-demo': '1' },
      payload: { operationId: id, chainId: 1952, owner, target, calldata, txHash: hash },
    });
    assert.equal(response.statusCode, 202, response.body);
  }
  await server.syncNow();
  assert.equal(primary.store.operation('transfer-one-wei')?.state, 'CONFIRMED');
  assert.equal(primary.store.operation('rescue-native')?.state, 'RECONCILIATION_FAILED');
  const failed = await server.app.inject({
    url: `/api/v1/chain/operations/rescue-native/evidence?owner=${owner}&chainId=1952`,
    headers,
  });
  assert.equal(failed.json().productReady, false);
  assert.equal(failed.json().reconciliation, 'FAILED');
  primaryRpc.closed = true;
  await server.syncNow();
  assert.equal(primary.store.operation('rescue-native')?.state, 'CONFIRMED');
  const evidence = await server.app.inject({
    url: `/api/v1/chain/operations/rescue-native/evidence?owner=${owner}&chainId=1952`,
    headers,
  });
  assert.equal(evidence.json().reconciliation, 'MATCHED');
  assert.equal(evidence.json().productReady, true);
  const holder = await server.app.inject({
    url: `/api/v1/chain/passes/${pass}/${secondOwner}?chainId=1952`,
    headers,
  });
  assert.equal(holder.json().state.balanceRaw, '1');
  assert.equal(primary.store.projection(46630, secondOwner, pass, 'm3-strategy-pass'), null);
});

test('backup and restore retain separate XLayer and Robinhood rows without promoting pending evidence', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-r2-recovery-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, 'source.sqlite');
  const store = new ChainStore(source);
  for (const chainId of [1952, 46630]) {
    const operation = transitionOperation(
      createOperation({
        operationId: `pending-${chainId}`,
        chainId,
        owner,
        target: vault,
        state: 'AWAITING_SIGNATURE',
        calldata: encodeM3VaultCall('rescueNative()', []),
      }),
      { state: 'SUBMITTED', txHash: rescueTx, submittedAt: '2026-09-25T00:00:00.000Z' },
    );
    store.saveOperation(operation);
    const block = blocks.get(1n)!;
    store.recordCanonicalBlock(chainId, vault, block, []);
    store.commitProjections(chainId, vault, block, [
      {
        chainId,
        owner,
        contract: vault,
        projectionKey: 'm3-vault',
        blockNumber: 1n,
        blockHash: block.hash,
        state: { principalBasis: chainId === 1952 ? '100' : '200' },
      },
    ]);
  }
  store.close();
  const backup = join(directory, 'backup.sqlite'),
    restored = join(directory, 'restored.sqlite');
  for (const [command, from, to] of [
    ['backup', source, backup],
    ['restore', backup, restored],
  ]) {
    const result = spawnSync(process.execPath, ['tools/chain-recovery.ts', command!, from!, to!], {
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).content, 'MATCH');
  }
  const reopened = new ChainStore(restored);
  try {
    for (const chainId of [1952, 46630]) {
      assert.equal(reopened.operation(`pending-${chainId}`)?.chainId, chainId);
      assert.equal(reopened.operationEvidence(`pending-${chainId}`, 'm3-vault')?.productReady, false);
      assert.equal(
        reopened.projection(chainId, owner, vault, 'm3-vault')?.state.principalBasis,
        chainId === 1952 ? '100' : '200',
      );
    }
  } finally {
    reopened.close();
  }
});
