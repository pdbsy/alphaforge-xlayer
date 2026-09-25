import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readXLayerPublicConfig, startXLayerPublicMain } from '../apps/server/src/xlayer-public-main.ts';
import { deploymentManifestDigest } from '../packages/chain-adapter/src/manifest.ts';
import { M3_VAULT_ABI_HASH, M3_VAULT_ABI_VERSION } from '../packages/chain-adapter/src/vault-abi.ts';
import { M3_STRATEGY_PASS_ABI_HASH } from '../packages/chain-adapter/src/pass-abi.ts';
import { asAddress, asBlockHash } from '../packages/chain-adapter/src/types.ts';

function deployment(byte: string) {
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
    runtimeBytecodeHash: asBlockHash(`0x${'aa'.repeat(32)}`),
    strategyPassAddress: asAddress(`0x${'33'.repeat(20)}`),
    strategyPassDeploymentBlock: '1',
    strategyPassAbiHash: M3_STRATEGY_PASS_ABI_HASH,
    strategyPassRuntimeBytecodeHash: asBlockHash(`0x${'bb'.repeat(32)}`),
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

function fixture(t: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'alphaforge-public-main-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const webRoot = join(root, 'web');
  mkdirSync(webRoot);
  writeFileSync(join(webRoot, 'index.html'), '<h1>AlphaForge</h1>');
  const file = join(root, 'operator.json');
  const config = {
    schemaVersion: 1,
    origin: 'https://alphaforge.example',
    webRoot: './web',
    dataDir: './private-data',
    deployments: [],
    rpcAccess: 'disabled',
    rpcEndpoints: [],
    listen: { host: '127.0.0.1', port: 0 },
  };
  writeFileSync(file, JSON.stringify(config));
  return { root, file, config, webRoot };
}

test('no operator file defaults to loopback rehearsal with no deployments or RPC', () => {
  const config = readXLayerPublicConfig(undefined, '/private/tmp/AlphaForge');
  assert.deepEqual(config.listen, { host: '127.0.0.1', port: 4180 });
  assert.equal(config.origin, 'http://127.0.0.1:4180');
  assert.equal(config.webRoot, '/private/tmp/AlphaForge/dist/xlayer/web');
  assert.equal(config.rpcAccess, 'disabled');
  assert.deepEqual(config.deployments, []);
  assert.deepEqual(config.runtimeDeployments, []);
});

test('operator paths resolve from the config file without creating storage', (t) => {
  const { root, file, webRoot } = fixture(t);
  const config = readXLayerPublicConfig(file);
  assert.equal(config.webRoot, webRoot);
  assert.equal(config.dataDir, join(root, 'private-data'));
  assert.equal(existsSync(config.dataDir), false);
});

test('one deployments array derives pinned runtime manifests and deterministic isolated paths', (t) => {
  const { root, file, config } = fixture(t);
  const deployments = [deployment('11'), deployment('22')];
  writeFileSync(
    file,
    JSON.stringify({ ...config, deployments, rpcAccess: 'read-only', rpcEndpoints: ['https://rpc.example'] }),
  );
  const parsed = readXLayerPublicConfig(file);
  assert.deepEqual(parsed.deployments, deployments);
  assert.equal(parsed.runtimeDeployments.length, 2);
  for (const [index, input] of parsed.runtimeDeployments.entries()) {
    assert.equal(input.deploymentStatus, 'DEPLOYED');
    if (input.deploymentStatus !== 'DEPLOYED') assert.fail();
    const record = deployments[index]!;
    assert.equal(input.dbPath, join(root, 'private-data', `${record.vaultAddress}.sqlite`));
    assert.equal(input.expectedManifestDigest, record.manifestDigest);
    assert.deepEqual(input.expectedNetwork, { environment: 'xlayer-testnet', chainId: 1952 });
    assert.equal(
      (input.manifestDocument as { contractAddress: string }).contractAddress,
      record.vaultAddress,
    );
  }
  assert.equal(existsSync(parsed.dataDir), false);
  writeFileSync(file, JSON.stringify({ ...config, deployments }));
  assert.deepEqual(readXLayerPublicConfig(file).runtimeDeployments, []);
  writeFileSync(file, JSON.stringify({ ...config, deployments: [deployments[0], deployments[0]] }));
  assert.throws(() => readXLayerPublicConfig(file), /INVALID_XLAYER_PUBLIC_CONFIG/);
});

test('strict operator JSON rejects unknown fields, invalid identity and ambiguous RPC access', (t) => {
  const { root, file, config } = fixture(t);
  for (const value of [
    null,
    [],
    { ...config, schemaVersion: 2 },
    { ...config, privateKey: 'DO_NOT_ECHO' },
    { ...config, deployments: [null] },
    { ...config, deployments: {}, rpcAccess: 'read-only' },
    { ...config, listen: { ...config.listen, proxy: true } },
    { ...config, listen: { host: '::', port: 1 } },
    { ...config, listen: { host: '127.0.0.1', port: '4180' } },
    { ...config, rpcAccess: 'enabled' },
    { ...config, rpcAccess: 'read-only', rpcEndpoints: [] },
    { ...config, rpcEndpoints: ['https://rpc.example'] },
    { ...config, rpcAccess: 'read-only', rpcEndpoints: ['https://user:DO_NOT_ECHO@rpc.example'] },
    { ...config, rpcAccess: 'read-only', rpcEndpoints: ['https://rpc.example?key=DO_NOT_ECHO'] },
    { ...config, origin: 'http://public.example' },
    { ...config, dataDir: './web/data' },
    { ...config, dataDir: '' },
    { ...config, webRoot: null },
  ]) {
    writeFileSync(file, JSON.stringify(value));
    assert.throws(() => readXLayerPublicConfig(file), { message: 'INVALID_XLAYER_PUBLIC_CONFIG' });
  }
  for (const text of ['{DO_NOT_ECHO', 'x'.repeat(262145)]) {
    writeFileSync(file, text);
    assert.throws(() => readXLayerPublicConfig(file), { message: 'INVALID_XLAYER_PUBLIC_CONFIG' });
  }
  assert.equal(existsSync(join(root, 'private-data')), false);
});

test('operator config must be a bounded regular file, with redacted errors', (t) => {
  const { root, file } = fixture(t);
  const alias = join(root, 'alias.json');
  symlinkSync(file, alias);
  for (const value of [root, alias, join(root, 'DO_NOT_ECHO'), ''])
    assert.throws(() => readXLayerPublicConfig(value), { message: 'INVALID_XLAYER_PUBLIC_CONFIG' });
});

test('main starts an honest public website and closes its ephemeral listener', async (t) => {
  const { file, root } = fixture(t);
  const server = await startXLayerPublicMain(file);
  t.after(() => server.close());
  const address = server.app.server.address();
  assert.ok(address && typeof address === 'object');
  assert.equal(address.address, '127.0.0.1');
  const headers = { host: 'alphaforge.example' };
  assert.equal((await server.app.inject({ url: '/', headers })).statusCode, 200);
  assert.equal((await server.app.inject({ url: '/api/health', headers })).statusCode, 503);
  assert.equal(
    (await server.app.inject({ url: '/api/xlayer/config', headers: { host: 'attacker.example' } }))
      .statusCode,
    403,
  );
  assert.equal(existsSync(join(root, 'private-data')), false);
  await server.close();
  assert.equal(server.app.server.listening, false);
});

test('actual CLI handles SIGTERM and prints only a fixed startup result', { timeout: 10000 }, async (t) => {
  const { file } = fixture(t);
  const child = spawn(process.execPath, ['apps/server/src/xlayer-public-main.ts'], {
    env: { ...process.env, AF_XLAYER_CONFIG: file },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  });
  let output = '',
    errors = '';
  child.stderr.on('data', (data) => {
    errors += String(data);
  });
  const started = new Promise<void>((resolve, reject) => {
    child.stdout.on('data', (data) => {
      output += String(data);
      if (output.includes('server started.')) resolve();
    });
    child.once('exit', () => reject(new Error(errors)));
  });
  const exited = once(child, 'exit');
  await started;
  child.kill('SIGTERM');
  const [code, signal] = await exited;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.equal(output, 'AlphaForge XLayer server started.\n');
  assert.equal(errors, '');
});

test('actual CLI reports invalid config without raw path, input or stack trace', async (t) => {
  const { file } = fixture(t);
  writeFileSync(file, '{DO_NOT_ECHO');
  const child = spawn(process.execPath, ['apps/server/src/xlayer-public-main.ts'], {
    env: { ...process.env, AF_XLAYER_CONFIG: file },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '',
    errors = '';
  child.stdout.on('data', (data) => {
    output += String(data);
  });
  child.stderr.on('data', (data) => {
    errors += String(data);
  });
  const [code] = await once(child, 'close');
  assert.equal(code, 1);
  assert.equal(output, '');
  assert.equal(errors, 'XLAYER_PUBLIC_STARTUP_FAILED\n');
});
