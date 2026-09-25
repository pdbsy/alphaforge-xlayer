import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const entry = new URL('../tools/prepare-xlayer-deployment.mjs', import.meta.url);
const address = '0x1111111111111111111111111111111111111111';
const parameters = {
  AF_XLAYER_DEPLOYER: address,
  AF_XLAYER_OWNER: address,
  AF_XLAYER_CREATOR: address,
  AF_XLAYER_STRATEGY_ID: `0x${'22'.repeat(32)}`,
  AF_XLAYER_STRATEGY_REF: `0x${'33'.repeat(32)}`,
  AF_XLAYER_PASS_NAME: 'AlphaForge Pre-release Pass',
  AF_XLAYER_PASS_SYMBOL: 'AF-PASS',
  AF_XLAYER_PASS_SUPPLY: '100000000000000000000',
  AF_XLAYER_PASS_RECIPIENT: address,
  AF_XLAYER_USDT_SUPPLY: '100000000',
  AF_XLAYER_USDT_RECIPIENT: address,
  AF_XLAYER_ETH_SUPPLY: '1000000000000000000',
  AF_XLAYER_ETH_RECIPIENT: address,
  AF_XLAYER_BTC_SUPPLY: '1000000000000000000',
  AF_XLAYER_BTC_RECIPIENT: address,
};
let prepare;
let record;
let addressesFromOutput;

test('operator command defaults to offline simulation without a signer or RPC', async () => {
  await assert.doesNotReject(async () => {
    ({
      prepareXLayerDeployment: prepare,
      buildXLayerDeploymentRecord: record,
      simulationAddresses: addressesFromOutput,
    } = await import(entry));
  });
  const command = prepare(['--output', '/private/tmp/xlayer-record.json'], parameters);
  assert.equal(command.broadcast, false);
  assert.equal(command.args.includes('--broadcast'), false);
  assert.equal(command.args.includes('--rpc-url'), false);
  assert.equal(command.args.includes('--account'), false);
  assert.ok(command.args.includes('--offline'));
  assert.deepEqual(command.args.slice(-2), ['--chain', '1952']);
});

test('operator parameters are mandatory, canonical and never guessed', () => {
  assert.equal(typeof prepare, 'function');
  for (const name of Object.keys(parameters)) {
    const env = { ...parameters };
    delete env[name];
    assert.throws(() => prepare(['--output', 'record.json'], env), /INVALID_XLAYER_DEPLOYMENT_INPUT/);
  }
  for (const value of ['0', '-1', '1.1', '1e6', '01', (2n ** 256n).toString()])
    assert.throws(() =>
      prepare(['--output', 'record.json'], { ...parameters, AF_XLAYER_USDT_SUPPLY: value }),
    );
  assert.throws(() =>
    prepare(['--output', 'record.json'], { ...parameters, AF_XLAYER_OWNER: `0x${'00'.repeat(20)}` }),
  );
  assert.throws(() =>
    prepare(['--output', 'record.json'], { ...parameters, AF_XLAYER_STRATEGY_ID: `0x${'00'.repeat(32)}` }),
  );
});

test('simulation entry rejects broadcast, RPC and wallet arguments regardless of operator flags', () => {
  assert.equal(typeof prepare, 'function');
  const base = ['--output', 'record.json'];
  for (const flags of [
    ['--broadcast'],
    ['--broadcast', '--account', 'operator'],
    ['--account', 'operator'],
    ['--keystore', '/private/tmp/encrypted.json'],
    ['--private-key', 'secret'],
    ['--unlocked'],
    ['--resume'],
    ['--skip-simulation'],
    ['--rpc-url', 'https://testrpc.xlayer.tech/terigon'],
    ['--chain', '196'],
  ])
    assert.throws(() => prepare([...base, ...flags], parameters), /INVALID_XLAYER_DEPLOYMENT_INPUT/);
  const command = prepare(base, {
    ...parameters,
    FOUNDRY_ETH_RPC_URL: 'https://rpc.invalid',
    ETH_KEYSTORE_ACCOUNT: 'operator',
    FOUNDRY_FFI: 'true',
  });
  assert.equal(command.parameters.FOUNDRY_ETH_RPC_URL, undefined);
  assert.equal(command.parameters.ETH_KEYSTORE_ACCOUNT, undefined);
  assert.equal(command.parameters.FOUNDRY_FFI, undefined);
});

test('output retains constructor precision and leaves chain evidence unverified', () => {
  assert.equal(typeof record, 'function');
  const command = prepare(['--output', 'record.json'], parameters);
  const addresses = ['11', '22', '33', '44', '55', '66'].map((byte) => `0x${byte.repeat(20)}`);
  const result = record(command, addresses);
  assert.equal(result.chainId, 1952);
  assert.equal(result.deploymentStatus, 'NOT_DEPLOYED');
  assert.equal(result.executionMode, 'SIMULATION_ONLY');
  assert.equal(result.contracts.afUsdc.constructorInputs[0].value, '100000000');
  assert.equal(result.contracts.strategyPass.constructorInputs[3].value, '100000000000000000000');
  assert.equal(result.contracts.vault.constructorInputs[5].value, addresses[0]);
  assert.equal(result.contracts.passLocker.constructorInputs[0].value, addresses[4]);
  assert.equal(result.contracts.passLocker.address, addresses[5]);
  for (const item of Object.values(result.contracts)) {
    assert.equal(item.deploymentBlock, null);
    assert.equal(item.deploymentTransactionHash, null);
    assert.equal(item.runtimeCodeHash, null);
  }
  assert.throws(() => record(command, Array(6).fill(address)));
  assert.throws(() => record(command, addresses.slice(0, 5)));
  assert.equal(JSON.stringify(result).includes('rpc-url'), false);
  assert.equal(JSON.stringify(result).includes('keystore'), false);
});

test('Forge output must explicitly succeed with six typed simulation addresses', () => {
  const addresses = ['11', '22', '33', '44', '55', '66'].map((byte) => `0x${byte.repeat(20)}`);
  const output = {
    success: true,
    returns: { simulated: { internal_type: 'address[6]', value: `[${addresses.join(', ')}]` } },
  };
  assert.deepEqual(addressesFromOutput(JSON.stringify(output)), addresses);
  for (const invalid of [
    { ...output, success: false },
    { success: true },
    { ...output, returns: { simulated: { internal_type: 'address[6]', value: '[]' } } },
    {
      ...output,
      returns: { simulated: { internal_type: 'address[]', value: output.returns.simulated.value } },
    },
  ])
    assert.throws(() => addressesFromOutput(JSON.stringify(invalid)));
});

test('actual CLI rejects broadcast before tool launch and does not print raw input', () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(entry), '--broadcast', '--private-key', 'must-not-appear'],
    {
      encoding: 'utf8',
      timeout: 10000,
      env: {},
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), 'XLAYER_SIMULATION_PREPARATION_FAILED');
});
