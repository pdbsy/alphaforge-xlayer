import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Explicit native qualification: requires the installed, independently verified pinned Forge tools.
test('real offline script exports only simulation addresses and cannot overwrite an existing record', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'alphaforge-xlayer-simulation-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = join(dir, 'simulation record.json');
  const owner = '0x1111111111111111111111111111111111111111';
  const params = {
    AF_XLAYER_DEPLOYER: '0x2222222222222222222222222222222222222222',
    AF_XLAYER_OWNER: owner,
    AF_XLAYER_CREATOR: owner,
    AF_XLAYER_STRATEGY_ID: `0x${'33'.repeat(32)}`,
    AF_XLAYER_STRATEGY_REF: `0x${'44'.repeat(32)}`,
    AF_XLAYER_PASS_NAME: 'AlphaForge Pre-release Pass',
    AF_XLAYER_PASS_SYMBOL: 'AF-PASS',
    AF_XLAYER_PASS_SUPPLY: '100000000000000000000',
    AF_XLAYER_PASS_RECIPIENT: owner,
    AF_XLAYER_USDT_SUPPLY: '100000000',
    AF_XLAYER_USDT_RECIPIENT: owner,
    AF_XLAYER_ETH_SUPPLY: '1000000000000000000',
    AF_XLAYER_ETH_RECIPIENT: owner,
    AF_XLAYER_BTC_SUPPLY: '1000000000000000000',
    AF_XLAYER_BTC_RECIPIENT: owner,
    FOUNDRY_ETH_RPC_URL: 'http://127.0.0.1:1/forbidden',
    ETH_RPC_URL: 'http://127.0.0.1:1/forbidden',
    FOUNDRY_FFI: 'true',
    FOUNDRY_PROFILE: 'unreviewed',
    ETH_KEYSTORE_ACCOUNT: 'not-a-wallet',
  };
  const args = [
    fileURLToPath(new URL('../tools/prepare-xlayer-deployment.mjs', import.meta.url)),
    '--output',
    output,
  ];
  const run = () => spawnSync(process.execPath, args, { env: params, encoding: 'utf8', timeout: 70000 });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const original = await readFile(output, 'utf8');
  const record = JSON.parse(original);
  assert.equal(record.chainId, 1952);
  assert.equal(record.deploymentStatus, 'NOT_DEPLOYED');
  assert.equal(record.executionMode, 'SIMULATION_ONLY');
  assert.equal(record.addressScope, 'LOCAL_SIMULATION_ONLY');
  assert.equal(record.contracts.vault.constructorInputs[0].value, owner);
  assert.equal(record.contracts.vault.constructorInputs[5].value, record.contracts.afUsdc.address);
  assert.equal(record.contracts.passLocker.constructorInputs[0].value, record.contracts.vault.address);
  assert.equal(new Set(Object.values(record.contracts).map((c) => c.address.toLowerCase())).size, 6);
  for (const contract of Object.values(record.contracts)) {
    assert.match(contract.address, /^0x[0-9a-fA-F]{40}$/);
    assert.equal(contract.deploymentBlock, null);
    assert.equal(contract.deploymentTransactionHash, null);
    assert.equal(contract.runtimeCodeHash, null);
    assert.equal(contract.creationCodeHash, null);
  }
  assert.equal(run().status, 1);
  assert.equal(await readFile(output, 'utf8'), original);
});
