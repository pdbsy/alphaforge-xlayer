import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {
  XLAYER_TESTNET,
  readXLayerChainConfig,
  readXLayerLocalConfig,
} from '../packages/xlayer-chain/src/network.ts';

const valid = {
  QP_MODE: 'local',
  QP_ADAPTER: 'mock',
  QP_CHAIN: 'xlayer-testnet',
  QP_CHAIN_ID: '1952',
  QP_RPC_URL: 'https://testrpc.xlayer.tech/terigon',
  QP_EXPLORER_URL: 'https://www.okx.com/web3/explorer/xlayer-test',
};

test('X Layer Testnet metadata identifies the reviewed network', () => {
  assert.deepEqual(XLAYER_TESTNET, {
    key: 'xlayer-testnet',
    name: 'X Layer Testnet',
    chainId: 1952,
    nativeCurrency: 'OKB',
    rpcUrl: 'https://testrpc.xlayer.tech/terigon',
    explorerUrl: 'https://www.okx.com/web3/explorer/xlayer-test',
  });
  assert.ok(Object.isFrozen(XLAYER_TESTNET));
});

test('chain config accepts each reviewed RPC and a canonical trailing slash', () => {
  for (const rpcUrl of [
    'https://testrpc.xlayer.tech/terigon',
    'https://testrpc.xlayer.tech/terigon/',
    'https://xlayertestrpc.okx.com/terigon',
    'https://xlayertestrpc.okx.com/terigon/',
  ]) {
    const config = readXLayerChainConfig({
      ...valid,
      QP_RPC_URL: rpcUrl,
      QP_EXPLORER_URL: `${valid.QP_EXPLORER_URL}/`,
    });
    assert.equal(config.network, XLAYER_TESTNET);
    assert.equal(config.rpcUrl, rpcUrl.replace(/\/$/, ''));
    assert.equal(config.explorerUrl, valid.QP_EXPLORER_URL);
    assert.ok(Object.isFrozen(config));
  }
});

test('local config composes the existing fail-closed gate with X Layer metadata', () => {
  const config = readXLayerLocalConfig(valid);
  assert.deepEqual(config, {
    mode: 'local',
    adapter: 'mock',
    realFundsEnabled: false,
    network: XLAYER_TESTNET,
    rpcUrl: valid.QP_RPC_URL,
    explorerUrl: valid.QP_EXPLORER_URL,
  });
  assert.ok(Object.isFrozen(config));
});

test('chain config requires the explicit X Layer key and current testnet chain ID', () => {
  const cases: ReadonlyArray<{
    readonly env: Readonly<Record<string, string | undefined>>;
    readonly message: string;
  }> = [
    { env: { ...valid, QP_CHAIN: undefined }, message: 'QP_CHAIN must be xlayer-testnet' },
    { env: { ...valid, QP_CHAIN: 'xlayer-mainnet' }, message: 'QP_CHAIN must be xlayer-testnet' },
    { env: { ...valid, QP_CHAIN_ID: undefined }, message: 'QP_CHAIN_ID must be 1952' },
    { env: { ...valid, QP_CHAIN_ID: '195' }, message: 'QP_CHAIN_ID must be 1952' },
    { env: { ...valid, QP_CHAIN_ID: '196' }, message: 'QP_CHAIN_ID must be 1952' },
    { env: { ...valid, QP_CHAIN_ID: '46630' }, message: 'QP_CHAIN_ID must be 1952' },
  ];

  for (const { env, message } of cases) {
    assert.throws(() => readXLayerChainConfig(env), new Error(message));
  }
});

test('chain config rejects missing, malformed and unreviewed endpoints with fixed diagnostics', () => {
  const cases: ReadonlyArray<{
    readonly field: 'QP_RPC_URL' | 'QP_EXPLORER_URL';
    readonly value: string | undefined;
    readonly message: string;
  }> = [
    { field: 'QP_RPC_URL', value: undefined, message: 'QP_RPC_URL is required' },
    {
      field: 'QP_RPC_URL',
      value: 'invalid-rpc-value',
      message: 'QP_RPC_URL must be a valid HTTPS URL',
    },
    {
      field: 'QP_RPC_URL',
      value: 'http://testrpc.xlayer.tech/terigon',
      message: 'QP_RPC_URL must use HTTPS',
    },
    {
      field: 'QP_RPC_URL',
      value: 'https://user:secret@testrpc.xlayer.tech/terigon',
      message: 'QP_RPC_URL must not contain credentials',
    },
    {
      field: 'QP_RPC_URL',
      value: 'https://testrpc.xlayer.tech/terigon?token=secret',
      message: 'QP_RPC_URL must not contain query or fragment',
    },
    {
      field: 'QP_RPC_URL',
      value: 'https://testrpc.xlayer.tech/terigon#secret',
      message: 'QP_RPC_URL must not contain query or fragment',
    },
    {
      field: 'QP_RPC_URL',
      value: 'https://example.com/terigon',
      message: 'QP_RPC_URL must be an approved X Layer Testnet endpoint',
    },
    { field: 'QP_EXPLORER_URL', value: undefined, message: 'QP_EXPLORER_URL is required' },
    {
      field: 'QP_EXPLORER_URL',
      value: 'https://user:secret@www.okx.com/web3/explorer/xlayer-test',
      message: 'QP_EXPLORER_URL must not contain credentials',
    },
    {
      field: 'QP_EXPLORER_URL',
      value: 'https://www.okx.com/web3/explorer/xlayer-test?token=secret',
      message: 'QP_EXPLORER_URL must not contain query or fragment',
    },
    {
      field: 'QP_EXPLORER_URL',
      value: 'https://www.okx.com/web3/explorer/xlayer',
      message: 'QP_EXPLORER_URL must be the approved X Layer Testnet explorer',
    },
  ];

  for (const { field, value, message } of cases) {
    assert.throws(
      () => readXLayerChainConfig({ ...valid, [field]: value }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, message);
        assert.equal(Object.hasOwn(error, 'input'), false);
        assert.equal(Object.hasOwn(error, 'cause'), false);
        if (value)
          assert.doesNotMatch(error.message, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        return true;
      },
    );
  }
});

test('local config rejects testnet, production and non-mock runtime modes', () => {
  for (const env of [
    { ...valid, QP_MODE: 'testnet' },
    { ...valid, QP_MODE: 'production' },
    { ...valid, QP_ADAPTER: 'live' },
    { ...valid, NODE_ENV: 'production' },
  ]) {
    assert.throws(() => readXLayerLocalConfig(env));
  }
});

test('configuration CLI prints only safe offline metadata for the checked fixture', () => {
  const result = spawnSync(process.execPath, ['tools/check-xlayer-chain.ts'], {
    cwd: new URL('../', import.meta.url),
    env: valid,
    encoding: 'utf8',
    timeout: 5_000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    network: 'X Layer Testnet',
    chainId: 1952,
    nativeCurrency: 'OKB',
    rpcOrigin: 'https://testrpc.xlayer.tech',
    explorerOrigin: 'https://www.okx.com',
    mode: 'local',
    adapter: 'mock',
    realFundsEnabled: false,
  });
});

test('configuration CLI rejects arguments and sanitizes configuration failures', () => {
  const argumentResult = spawnSync(process.execPath, ['tools/check-xlayer-chain.ts', '--rpc=secret'], {
    cwd: new URL('../', import.meta.url),
    env: valid,
    encoding: 'utf8',
    timeout: 5_000,
  });
  assert.equal(argumentResult.status, 1);
  assert.equal(argumentResult.stderr.trim(), 'X Layer configuration check accepts no arguments');
  assert.doesNotMatch(argumentResult.stderr + argumentResult.stdout, /secret/);

  const invalidValue = 'https://user:do-not-print@example.com/rpc';
  const configResult = spawnSync(process.execPath, ['tools/check-xlayer-chain.ts'], {
    cwd: new URL('../', import.meta.url),
    env: { ...valid, QP_RPC_URL: invalidValue },
    encoding: 'utf8',
    timeout: 5_000,
  });
  assert.equal(configResult.status, 1);
  assert.equal(configResult.stderr.trim(), 'QP_RPC_URL must not contain credentials');
  assert.doesNotMatch(configResult.stderr + configResult.stdout, /do-not-print/);
});
