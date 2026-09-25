import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync, linkSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { ChainStore } from '../apps/server/src/chain-store.ts';
import {
  publicDeploymentToRuntimeInput,
  startXLayerPublicServer,
  type XLayerPublicStartupOptions,
} from '../apps/server/src/xlayer-public-startup.ts';
import type { XLayerPublicDeployment } from '../apps/server/src/xlayer-public-config.ts';
import { deploymentManifestDigest } from '../packages/chain-adapter/src/manifest.ts';
import { keccak256 } from '../packages/chain-adapter/src/keccak.ts';
import { M3_VAULT_ABI_HASH, M3_VAULT_ABI_VERSION } from '../packages/chain-adapter/src/vault-abi.ts';
import { M3_STRATEGY_PASS_ABI_HASH } from '../packages/chain-adapter/src/pass-abi.ts';
import { asAddress, asBlockHash, asHexData } from '../packages/chain-adapter/src/types.ts';
import type { ChainCall, ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';

const origin = 'https://alphaforge.example';
const headers = { host: 'alphaforge.example' };
const code = asHexData('0x6000');

function publicDeployment(byte = '11'): XLayerPublicDeployment {
  const document = {
    schemaVersion: 1,
    environment: 'xlayer-testnet',
    chainId: 1952,
    contractName: 'AlphaForgeVault',
    contractType: 'vault',
    contractAddress: asAddress(`0x${byte.repeat(20)}`),
    deploymentBlock: '1',
    abiVersion: M3_VAULT_ABI_VERSION,
    abiHash: M3_VAULT_ABI_HASH,
    runtimeBytecodeHash: keccak256(code),
    strategyPassAddress: asAddress(`0x${'33'.repeat(20)}`),
    strategyPassDeploymentBlock: '1',
    strategyPassAbiHash: M3_STRATEGY_PASS_ABI_HASH,
    strategyPassRuntimeBytecodeHash: keccak256(code),
  } as const;
  const { schemaVersion, environment, contractName, contractType, contractAddress, ...fields } = document;
  void [schemaVersion, environment, contractName, contractType];
  return {
    ...fields,
    source: 'reviewed-deployment-manifest',
    vaultAddress: contractAddress,
    manifestDigest: deploymentManifestDigest(document),
  };
}

class OfflineRpc implements ReadonlyRpc {
  failed = false;
  reads = 0;
  gate: Promise<void> | undefined;
  async chainId() {
    if (this.failed) throw new Error('PRIVATE_RPC_ENDPOINT');
    return 1952;
  }
  async code() {
    return code;
  }
  async block(number: bigint | 'latest') {
    this.reads++;
    await this.gate;
    if (this.failed) throw new Error('PRIVATE_RPC_ENDPOINT');
    const n = number === 'latest' ? 1n : number;
    return {
      number: n,
      hash: asBlockHash(`0x${n.toString(16).padStart(64, '0')}`),
      parentHash: asBlockHash(`0x${(n - 1n).toString(16).padStart(64, '0')}`),
      timestamp: n,
    };
  }
  async logs() {
    return [];
  }
  async receipt() {
    return null;
  }
  async call(request: ChainCall) {
    const selector = request.data.slice(0, 10);
    if (selector === '0x313ce567') return asHexData(`0x${18n.toString(16).padStart(64, '0')}`);
    if (selector === '0xa7a1ed72') return asHexData(`0x${'33'.repeat(20).padStart(64, '0')}`);
    if (
      ['0x8da5cb5b', '0x499bb2ab', '0x8b5a851f', '0xf20173bc', '0xa8d937e9', '0xab88dc4b'].includes(selector)
    )
      return asHexData(`0x${'44'.repeat(20).padStart(64, '0')}`);
    if (['0x492f4e18', '0xc288f3de'].includes(selector)) return asHexData(`0x${'55'.repeat(32)}`);
    assert.ok(
      [
        '0x597e1fb5',
        '0xad587035',
        '0x0510ca51',
        '0x738b74f0',
        '0x442ad6a0',
        '0x34dda870',
        '0xb31ede63',
      ].includes(selector),
    );
    return asHexData(`0x${'0'.repeat(64)}`);
  }
}

function fixture(t: test.TestContext, count = 1) {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-public-startup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const deployments = [publicDeployment(), publicDeployment('22')].slice(0, count);
  const runtimeDeployments = deployments.map((record, i) =>
    publicDeploymentToRuntimeInput(record, {
      dbPath: join(directory, `${i}.sqlite`),
      rpcEndpoints: ['https://rpc.example'],
    }),
  );
  return {
    directory,
    options: {
      origin,
      deployments,
      runtimeDeployments,
      rpcAccess: 'read-only',
      syncIntervalMs: null,
    } satisfies XLayerPublicStartupOptions,
  };
}

test('disabled public startup serves the website without constructing RPC or SQLite', async (t) => {
  const { directory } = fixture(t, 0);
  writeFileSync(join(directory, 'index.html'), '<h1>AlphaForge</h1>');
  const server = await startXLayerPublicServer(
    { origin, deployments: [], runtimeDeployments: [], rpcAccess: 'disabled', webRoot: directory },
    {
      createRpc: () => {
        throw new Error('MUST_NOT_CONNECT');
      },
    },
  );
  t.after(() => server.close());
  assert.equal((await server.app.inject({ url: '/', headers })).statusCode, 200);
  assert.equal((await server.app.inject({ url: '/api/health', headers })).statusCode, 503);
  assert.equal(
    (await server.app.inject({ url: '/api/xlayer/config', headers })).json().deploymentStatus,
    'NOT_DEPLOYED',
  );
  assert.equal(await server.syncNow(), null);
  assert.equal(server.runtimes.length, 0);
  assert.equal(existsSync(join(directory, '0.sqlite')), false);
});

test('one validated public record pins runtime identity and excludes browser-only Pass metadata', () => {
  const record = {
    ...publicDeployment(),
    passInitialSupplyBaseUnits: '100',
    passInitialRecipient: asAddress(`0x${'44'.repeat(20)}`),
  };
  const input = publicDeploymentToRuntimeInput(record, {
    dbPath: '/private/tmp/index.sqlite',
    rpcEndpoints: ['https://rpc.example'],
  });
  assert.deepEqual(input.expectedNetwork, { environment: 'xlayer-testnet', chainId: 1952 });
  assert.equal(input.expectedContractAddress, record.vaultAddress);
  assert.equal(input.expectedManifestDigest, record.manifestDigest);
  assert.equal('source' in (input.manifestDocument as object), false);
  assert.equal('passInitialRecipient' in (input.manifestDocument as object), false);
  assert.throws(() =>
    publicDeploymentToRuntimeInput({ ...record, chainId: 196 } as unknown as XLayerPublicDeployment, {
      dbPath: '/private/tmp/index.sqlite',
      rpcEndpoints: ['https://rpc.example'],
    }),
  );
});

test('all deployment, network, RPC, listen and storage inputs fail before resource creation', async (t) => {
  const { directory, options } = fixture(t, 2);
  const first = options.runtimeDeployments[0]!;
  const invalid: XLayerPublicStartupOptions[] = [
    { ...options, rpcAccess: 'disabled' },
    { ...options, deployments: [options.deployments[0]!, options.deployments[0]!] },
    { ...options, runtimeDeployments: [first] },
    { ...options, runtimeDeployments: [first, { ...options.runtimeDeployments[1]!, dbPath: first.dbPath }] },
    {
      ...options,
      runtimeDeployments: [
        first,
        {
          ...options.runtimeDeployments[1]!,
          expectedNetwork: { environment: 'robinhood-chain-testnet', chainId: 46630 },
        },
      ],
    },
    {
      ...options,
      runtimeDeployments: [
        first,
        { ...options.runtimeDeployments[1]!, expectedManifestDigest: first.expectedManifestDigest },
      ],
    },
    {
      ...options,
      runtimeDeployments: [
        first,
        { ...options.runtimeDeployments[1]!, rpcEndpoints: ['https://user:secret@rpc.example'] },
      ],
    },
    { ...options, origin: 'http://public.example' },
    { ...options, listen: { host: '203.0.113.5', port: 4180 } as never },
    { ...options, listen: { host: '127.0.0.1', port: -1 } },
    { ...options, syncIntervalMs: 1 },
    { ...options, webRoot: directory },
  ];
  for (const input of invalid)
    await assert.rejects(
      startXLayerPublicServer(input, {
        createRpc: () => {
          assert.fail('invalid configuration must not construct RPC');
        },
      }),
    );
  assert.equal(existsSync(first.dbPath), false);
});

test('SQLite hardlinks cannot bypass per-Vault storage isolation', async (t) => {
  const { options } = fixture(t, 2);
  const first = options.runtimeDeployments[0]!.dbPath;
  new ChainStore(first).close();
  linkSync(first, options.runtimeDeployments[1]!.dbPath);
  await assert.rejects(startXLayerPublicServer(options), /INVALID_PUBLIC_STORAGE/);
});

test('new database names cannot alias another database or its SQLite sidecars', async (t) => {
  const { options } = fixture(t, 2);
  const first = {
    ...options.runtimeDeployments[0]!,
    dbPath: join(dirname(options.runtimeDeployments[0]!.dbPath), 'State.sqlite'),
  };
  for (const path of [
    join(dirname(first.dbPath), basename(first.dbPath).toLowerCase()),
    first.dbPath + '-wal',
    first.dbPath + '-shm',
  ]) {
    await assert.rejects(
      startXLayerPublicServer(
        { ...options, runtimeDeployments: [first, { ...options.runtimeDeployments[1]!, dbPath: path }] },
        {
          createRpc: () => {
            assert.fail('aliases must fail before resource creation');
          },
        },
      ),
      /INVALID_PUBLIC_STORAGE/,
    );
  }
  assert.equal(existsSync(first.dbPath), false);
});

test('fresh filesystem-normalized Unicode aliases cannot open two runtimes on one database', async (t) => {
  const { directory, options } = fixture(t, 2);
  const first = { ...options.runtimeDeployments[0]!, dbPath: join(directory, 'Caf\u00e9.sqlite') };
  const second = { ...options.runtimeDeployments[1]!, dbPath: join(directory, 'Cafe\u0301.sqlite') };
  await assert.rejects(
    startXLayerPublicServer(
      { ...options, runtimeDeployments: [first, second] },
      {
        createRpc: () => assert.fail('file identities must be isolated before runtime creation'),
      },
    ),
    /INVALID_PUBLIC_STORAGE/,
  );
});

test('all database identities are reserved and separate before the first RPC factory runs', async (t) => {
  const { options } = fixture(t, 2);
  let factories = 0;
  const server = await startXLayerPublicServer(options, {
    createRpc: () => {
      factories++;
      const stats = options.runtimeDeployments.map((item) => statSync(item.dbPath));
      assert.equal(new Set(stats.map((stat) => `${stat.dev}:${stat.ino}`)).size, 2);
      assert.ok(stats.every((stat) => stat.isFile() && stat.nlink === 1));
      return new OfflineRpc();
    },
  });
  t.after(() => server.close());
  assert.equal(factories, 2);
});

test('SQLite symlink sidecars are rejected before runtime construction', async (t) => {
  const { directory, options } = fixture(t);
  const target = join(directory, 'unrelated');
  writeFileSync(target, 'preserve');
  symlinkSync(target, options.runtimeDeployments[0]!.dbPath + '-wal');
  await assert.rejects(startXLayerPublicServer(options), /INVALID_PUBLIC_STORAGE/);
  assert.equal(existsSync(options.runtimeDeployments[0]!.dbPath), false);
});

test('failed initial reads preserve website availability and readiness recovers after a successful sync', async (t) => {
  const { options } = fixture(t);
  const rpc = new OfflineRpc();
  rpc.failed = true;
  const server = await startXLayerPublicServer(options, { createRpc: () => rpc });
  t.after(() => server.close());
  const config = await server.app.inject({ url: '/api/xlayer/config', headers });
  assert.equal(config.statusCode, 200);
  assert.doesNotMatch(config.body, /rpc.example|sqlite|PRIVATE_RPC/);
  assert.equal((await server.app.inject({ url: '/api/health', headers })).statusCode, 503);
  rpc.failed = false;
  await server.syncNow();
  assert.equal((await server.app.inject({ url: '/api/health', headers })).statusCode, 200);
  assert.equal(server.runtimes[0]!.manifest.chainId, 1952);
  rpc.failed = true;
  await assert.rejects(server.syncNow(), /M3_RUNTIME_SYNC_FAILED/);
  assert.equal((await server.app.inject({ url: '/api/health', headers })).statusCode, 503);
});

test('app.close drains active sync before closing SQLite and rejects new sync requests', async (t) => {
  const { options } = fixture(t);
  const rpc = new OfflineRpc();
  const server = await startXLayerPublicServer(options, { createRpc: () => rpc });
  t.after(() => server.close());
  let release!: () => void;
  rpc.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sync = server.syncNow();
  await setImmediate();
  let closed = false;
  const closing = server.app.close().then(() => {
    closed = true;
  });
  await setImmediate();
  try {
    assert.equal(closed, false);
    await assert.rejects(server.syncNow(), /M3_SERVER_CLOSED/);
    assert.ok(server.runtimes[0]!.store.checkpoint(1952, options.deployments[0]!.vaultAddress));
  } finally {
    release();
  }
  await sync;
  await closing;
  assert.throws(() => server.runtimes[0]!.store.checkpoint(1952, options.deployments[0]!.vaultAddress));
  await Promise.all([server.close(), server.close()]);
});

test('partial startup failure closes previously constructed SQLite handles', async (t) => {
  const { options } = fixture(t, 2);
  let calls = 0;
  await assert.rejects(
    startXLayerPublicServer(options, {
      createRpc: () => {
        if (++calls === 2) throw new Error('RPC_FACTORY_FAILED');
        return new OfflineRpc();
      },
    }),
    /RPC_FACTORY_FAILED/,
  );
  // Closing the final WAL connection checkpoints and removes its sidecar.
  assert.equal(existsSync(`${options.runtimeDeployments[0]!.dbPath}-wal`), false);
});

test('public listener uses the selected address and busy bind releases all runtime stores', async (t) => {
  const { directory, options } = fixture(t, 2);
  const first = await startXLayerPublicServer({
    origin,
    deployments: [],
    runtimeDeployments: [],
    rpcAccess: 'disabled',
    listen: { host: '127.0.0.1', port: 0 },
  });
  t.after(() => first.close());
  const address = first.app.server.address();
  assert.ok(address && typeof address === 'object');
  assert.equal(address.address, '127.0.0.1');
  await assert.rejects(
    startXLayerPublicServer(
      { ...options, listen: { host: '127.0.0.1', port: address.port } },
      { createRpc: () => new OfflineRpc() },
    ),
    { code: 'EADDRINUSE' },
  );
  assert.equal(existsSync(join(directory, '0.sqlite-wal')), false);
  assert.equal(existsSync(join(directory, '1.sqlite-wal')), false);
  const container = await startXLayerPublicServer({
    origin,
    deployments: [],
    runtimeDeployments: [],
    rpcAccess: 'disabled',
    listen: { host: '0.0.0.0', port: 0 },
  });
  try {
    const bound = container.app.server.address();
    assert.ok(bound && typeof bound === 'object');
    assert.equal(bound.address, '0.0.0.0');
    assert.equal(
      (await container.app.inject({ url: '/api/health', headers: { host: 'attacker.example' } })).statusCode,
      403,
    );
  } finally {
    await container.close();
  }
});
