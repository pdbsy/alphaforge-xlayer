import test from 'node:test';
import assert from 'node:assert/strict';
import { readXLayerChainConfig, readXLayerLocalConfig } from '../packages/xlayer-chain/src/network.ts';

const valid = {
  XLAYER_CHAIN: 'xlayer-testnet',
  XLAYER_CHAIN_ID: '1952',
  XLAYER_RPC_URL: 'https://testrpc.xlayer.tech/terigon',
  XLAYER_EXPLORER_URL: 'https://www.okx.com/web3/explorer/xlayer-test',
};

test('explicit testnet configuration supplies the wallet chain and public endpoints', () => {
  const config = readXLayerChainConfig(valid);
  assert.equal(config.chainId, 1952);
  assert.equal(config.environment, 'xlayer-testnet');
  assert.equal(config.network.chainIdHex, '0x7a0');
  assert.equal(config.network.nativeCurrency.symbol, 'OKB');
  assert.equal(config.rpcUrl, 'https://testrpc.xlayer.tech/terigon');
  assert.equal(config.rpcFallbackUrl, 'https://xlayertestrpc.okx.com/terigon');
  assert.equal(config.explorerUrl, 'https://www.okx.com/web3/explorer/xlayer-test');
  assert.ok(Object.isFrozen(config));
});

test('missing identity and mismatched, legacy, mainnet and malformed chain ids fail closed', () => {
  for (const chainId of [undefined, '', '195', '196', '46630', '01952', '1952 ', '0x7a0'])
    assert.throws(() => readXLayerChainConfig({ ...valid, XLAYER_CHAIN_ID: chainId }));
  for (const chain of [undefined, '', 'xlayer-mainnet', 'robinhood-chain-testnet'])
    assert.throws(() => readXLayerChainConfig({ ...valid, XLAYER_CHAIN: chain }));
});

test('all public endpoint fields reject malformed, insecure or credential-bearing URLs without disclosure', () => {
  for (const field of ['XLAYER_RPC_URL', 'XLAYER_RPC_FALLBACK_URL', 'XLAYER_EXPLORER_URL']) {
    for (const value of [
      '',
      'broken-private-input',
      'http://example.com',
      'https://user:secret@example.com',
      'https://example.com/?key=private',
      'https://example.com/#private',
    ]) {
      assert.throws(
        () => readXLayerChainConfig({ ...valid, [field]: value }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.match(error.message, new RegExp(field));
          assert.doesNotMatch(error.message, /private|secret|user|example/);
          assert.equal(Object.hasOwn(error, 'input'), false);
          assert.equal(Object.hasOwn(error, 'cause'), false);
          return true;
        },
      );
    }
  }
  for (const field of ['XLAYER_RPC_URL', 'XLAYER_EXPLORER_URL'])
    assert.throws(() => readXLayerChainConfig({ ...valid, [field]: undefined }));
});

test('local configuration cannot unlock RPC access or production despite valid chain metadata', () => {
  const local = { ...valid, QP_MODE: 'local', QP_ADAPTER: 'mock' };
  const config = readXLayerLocalConfig(local);
  assert.equal(config.rpcAccess, 'disabled');
  assert.equal(config.realFundsEnabled, false);
  for (const override of [{ QP_MODE: 'testnet' }, { QP_ADAPTER: 'rpc' }, { NODE_ENV: 'production' }])
    assert.throws(() => readXLayerLocalConfig({ ...local, ...override }));
});
