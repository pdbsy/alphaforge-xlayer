import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateDeploymentManifest,
  deploymentManifestDigest,
} from '../packages/chain-adapter/src/manifest.ts';
import { JsonRpcClient } from '../packages/chain-adapter/src/rpc.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import { ChainStore } from '../apps/server/src/chain-store.ts';
import { ChainSynchronizer } from '../apps/server/src/chain-sync.ts';
import { composeM3ChainRuntime } from '../apps/server/src/m3-chain-runtime.ts';
import { Eip1193Wallet, PreparedActionFactory } from '../apps/web/src/chain-wallet.ts';

// All identities below are synthetic local fixtures, never deployment parameters.
const XLAYER = 1952;
const ROBINHOOD = 46_630;
const OWNER = `0x${'11'.repeat(20)}`;
const CONTRACT = `0x${'22'.repeat(20)}`;
const TX = `0x${'33'.repeat(32)}`;
const HASH = `0x${'44'.repeat(32)}`;
const PARENT = `0x${'55'.repeat(32)}`;
const CODE = `0x${'66'.repeat(32)}`;
const BLOCK = { number: 100n, hash: HASH, parentHash: PARENT, timestamp: 1000n };

function manifestFixture(environment = 'xlayer-testnet', chainId = XLAYER) {
  const body = {
    schemaVersion: 1,
    environment,
    chainId,
    contractName: 'AlphaForgeVault',
    contractType: 'vault',
    contractAddress: CONTRACT,
    deploymentBlock: '100',
    abiVersion: 'm3-owner-v1',
    runtimeBytecodeHash: CODE,
  };
  // Model an externally supplied document, including invalid network pairs.
  // Fixture field order follows the published manifest's canonical format.
  const manifestDigest = `0x${createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex')}`;
  return {
    document: { ...body, manifestDigest },
    expected: { environment, chainId, manifestDigest, contractAddress: CONTRACT },
  };
}

function storeFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-qa-'));
  const path = join(directory, 'chain.sqlite');
  let store = new ChainStore(path);
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    get store() {
      return store;
    },
    reopen() {
      store.close();
      store = new ChainStore(path);
      return store;
    },
  };
}

function event(chainId, amount) {
  return {
    chainId,
    address: CONTRACT,
    blockNumber: BLOCK.number,
    blockHash: HASH,
    transactionHash: TX,
    transactionIndex: 0,
    logIndex: 0,
    data: '0x1234',
    topics: [CODE],
    removed: false,
    eventSignature: CODE,
    eventName: 'OwnerActionObserved',
    normalizedData: { owner: OWNER, amount },
  };
}

function seed(store, chainId, amount) {
  store.recordCanonicalBlock(chainId, CONTRACT, BLOCK, [event(chainId, amount)]);
  store.commitProjections(chainId, CONTRACT, BLOCK, [
    {
      chainId,
      owner: OWNER,
      contract: CONTRACT,
      projectionKey: 'vault',
      blockNumber: BLOCK.number,
      blockHash: HASH,
      state: { principal: amount, unit: 'TEST_ONLY_USDT_UNIT' },
    },
  ]);
  const submitted = transitionOperation(
    createOperation({
      operationId: `qa-${chainId}`,
      chainId,
      owner: OWNER,
      target: CONTRACT,
      state: 'AWAITING_SIGNATURE',
    }),
    { state: 'SUBMITTED', txHash: TX, submittedAt: '2026-09-22T00:00:00.000Z' },
  );
  store.saveOperation(
    transitionOperation(submitted, {
      state: 'MINED',
      blockNumber: BLOCK.number,
      blockHash: HASH,
      receiptStatus: 'SUCCESS',
    }),
  );
}

test('X Layer foundation is present and preserves explicit local/mock and sanitized rejection', async () => {
  // Missing foundation is a hard prerequisite failure, never a skipped/PASS X Layer gate.
  const { XLAYER_TESTNET, readXLayerLocalConfig } = await import('../packages/xlayer-chain/src/network.ts');
  const input = {
    QP_MODE: 'local',
    QP_ADAPTER: 'mock',
    QP_CHAIN: 'xlayer-testnet',
    QP_CHAIN_ID: '1952',
    QP_RPC_URL: 'https://testrpc.xlayer.tech/terigon',
    QP_EXPLORER_URL: 'https://www.okx.com/web3/explorer/xlayer-test',
  };
  assert.deepEqual(XLAYER_TESTNET, {
    key: 'xlayer-testnet',
    name: 'X Layer Testnet',
    chainId: XLAYER,
    nativeCurrency: 'OKB',
    rpcUrl: input.QP_RPC_URL,
    explorerUrl: input.QP_EXPLORER_URL,
  });
  assert.ok(Object.isFrozen(XLAYER_TESTNET));
  const config = readXLayerLocalConfig(input);
  assert.ok(Object.isFrozen(config));
  assert.equal(config.network, XLAYER_TESTNET);
  assert.equal(config.mode, 'local');
  assert.equal(config.adapter, 'mock');
  assert.equal(config.realFundsEnabled, false);
  assert.equal(
    readXLayerLocalConfig({ ...input, QP_RPC_URL: 'https://xlayertestrpc.okx.com/terigon' }).network,
    XLAYER_TESTNET,
  );
  for (const changes of [
    { QP_CHAIN_ID: undefined },
    { QP_CHAIN_ID: '195' },
    { QP_CHAIN_ID: '196' },
    { QP_CHAIN_ID: '46630' },
    { QP_CHAIN: 'robinhood-chain-testnet' },
    { QP_MODE: 'testnet' },
    { QP_MODE: 'production' },
    { QP_ADAPTER: 'rpc' },
    { NODE_ENV: 'production' },
    { QP_RPC_URL: 'https://rpc.testnet.chain.robinhood.com' },
  ])
    assert.throws(() => readXLayerLocalConfig({ ...input, ...changes }));
  for (const field of ['QP_RPC_URL', 'QP_EXPLORER_URL']) {
    for (const value of [
      'not-a-url-QA_PRIVATE_MARKER',
      'https://QA_PRIVATE_MARKER@example.invalid/path',
      `${input[field]}?QA_PRIVATE_MARKER`,
      `${input[field]}#QA_PRIVATE_MARKER`,
    ])
      assert.throws(
        () => readXLayerLocalConfig({ ...input, [field]: value }),
        (error) => {
          assert.ok(error instanceof Error);
          assert.equal(error.message.includes('QA_PRIVATE_MARKER'), false);
          assert.equal(JSON.stringify(error).includes('QA_PRIVATE_MARKER'), false);
          return true;
        },
      );
  }
});

for (const [environment, chainId] of [
  ['xlayer-testnet', XLAYER],
  ['robinhood-chain-testnet', ROBINHOOD],
]) {
  test(`trusted manifest pair ${environment}/${chainId} retains its exact identity`, () => {
    const f = manifestFixture(environment, chainId);
    assert.equal(deploymentManifestDigest(f.document), f.document.manifestDigest);
    const manifest = validateDeploymentManifest(f.document, f.expected);
    assert.equal(manifest.chainId, chainId);
    assert.equal(manifest.environment, environment);
    assert.ok(Object.isFrozen(manifest));
    assert.throws(
      () => validateDeploymentManifest({ ...f.document, manifestDigest: HASH }, f.expected),
      /INVALID_DEPLOYMENT_MANIFEST/,
    );
    assert.throws(
      () => validateDeploymentManifest(f.document, { ...f.expected, manifestDigest: HASH }),
      /INVALID_DEPLOYMENT_MANIFEST/,
    );
    assert.throws(
      () => validateDeploymentManifest(f.document, { ...f.expected, contractAddress: OWNER }),
      /INVALID_DEPLOYMENT_MANIFEST/,
    );
  });
}

for (const [environment, chainId] of [
  ['xlayer-testnet', 195],
  ['xlayer-testnet', 196],
  ['xlayer-testnet', ROBINHOOD],
  ['robinhood-chain-testnet', XLAYER],
  ['unreviewed-network', XLAYER],
])
  test(`unapproved manifest expectation ${environment}/${chainId} cannot authorize itself`, () => {
    const f = manifestFixture(environment, chainId);
    assert.throws(() => validateDeploymentManifest(f.document, f.expected), /INVALID_DEPLOYMENT_MANIFEST/);
  });

test('a valid manifest from one chain cannot satisfy the other trusted chain expectation', () => {
  const x = manifestFixture(),
    r = manifestFixture('robinhood-chain-testnet', ROBINHOOD);
  assert.throws(() => validateDeploymentManifest(x.document, r.expected), /INVALID_DEPLOYMENT_MANIFEST/);
  assert.throws(() => validateDeploymentManifest(r.document, x.expected), /INVALID_DEPLOYMENT_MANIFEST/);
});

for (const remoteChain of [195, 196, ROBINHOOD])
  test(`X Layer synchronizer rejects mock RPC chain ${remoteChain} before block reads`, async (t) => {
    const f = manifestFixture(),
      { store } = storeFixture(t),
      methods = [];
    const rpc = new JsonRpcClient(['https://rpc.qa.invalid'], {
      transport: async (_endpoint, request) => {
        methods.push(request.method);
        assert.equal(request.method, 'eth_chainId');
        return {
          status: 200,
          body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: `0x${remoteChain.toString(16)}` }),
        };
      },
    });
    const synchronizer = new ChainSynchronizer({
      rpc,
      store,
      manifest: validateDeploymentManifest(f.document, f.expected),
      policy: { softReadyDepth: 3, reorgSearchLimit: 128 },
      integration: { decode: () => null, rebuildProjections: async () => [] },
    });
    await assert.rejects(
      () => synchronizer.head(),
      (error) => error.code === 'CHAIN_ID_MISMATCH',
    );
    assert.deepEqual(methods, ['eth_chainId']);
    assert.equal(store.checkpoint(XLAYER, CONTRACT), null);
  });

test('NOT_DEPLOYED composition does not instantiate RPC or a chain runtime', () => {
  let calls = 0;
  assert.equal(
    composeM3ChainRuntime(
      { deploymentStatus: 'NOT_DEPLOYED' },
      {
        createRpc: () => {
          calls++;
          throw new Error('unexpected RPC');
        },
      },
    ),
    null,
  );
  assert.equal(calls, 0);
});

test('same address/hash on X Layer and Robinhood retains isolated amounts, events and transactions across restart', (t) => {
  const f = storeFixture(t);
  seed(f.store, XLAYER, '1000001');
  seed(f.store, ROBINHOOD, '9000009');
  for (const [chainId, amount] of [
    [XLAYER, '1000001'],
    [ROBINHOOD, '9000009'],
  ]) {
    assert.equal(
      f.store.recordCanonicalBlock(chainId, CONTRACT, BLOCK, [event(chainId, amount)]).insertedEvents,
      0,
    );
  }
  const store = f.reopen();
  for (const [chainId, amount] of [
    [XLAYER, '1000001'],
    [ROBINHOOD, '9000009'],
  ]) {
    assert.equal(store.canonicalEvents(chainId, CONTRACT).length, 1);
    assert.equal(store.canonicalEvents(chainId, CONTRACT)[0].normalizedData.amount, amount);
    assert.equal(store.projection(chainId, OWNER, CONTRACT, 'vault').state.principal, amount);
    assert.equal(store.operationByTransaction(chainId, TX).operationId, `qa-${chainId}`);
    assert.deepEqual(store.checkpoint(chainId, CONTRACT), { blockNumber: 100n, blockHash: HASH });
  }
  assert.equal(store.operationByTransaction(196, TX), null);
  assert.equal(store.projection(XLAYER, CONTRACT, CONTRACT, 'vault'), null);
});

test('X Layer reorg rolls back only its events/projection/operations while Robinhood remains canonical', (t) => {
  const { store } = storeFixture(t);
  seed(store, XLAYER, '1000001');
  seed(store, ROBINHOOD, '9000009');
  const before = store.projection(ROBINHOOD, OWNER, CONTRACT, 'vault');
  assert.deepEqual(store.rollbackFromBlock(XLAYER, CONTRACT, 100n), {
    blocks: 1,
    events: 1,
    operations: 1,
    projections: 1,
  });
  assert.equal(store.checkpoint(XLAYER, CONTRACT), null);
  assert.equal(store.projection(XLAYER, OWNER, CONTRACT, 'vault'), null);
  assert.equal(store.operationByTransaction(XLAYER, TX).state, 'REORGED');
  assert.deepEqual(store.canonicalEvents(XLAYER, CONTRACT), []);
  assert.equal(store.operationByTransaction(ROBINHOOD, TX).state, 'MINED');
  assert.equal(store.canonicalEvents(ROBINHOOD, CONTRACT).length, 1);
  assert.deepEqual(store.projection(ROBINHOOD, OWNER, CONTRACT, 'vault'), before);
  assert.deepEqual(store.checkpoint(ROBINHOOD, CONTRACT), { blockNumber: 100n, blockHash: HASH });
});

test('cross-chain event, projection and operation-ID reuse cannot overwrite existing evidence', (t) => {
  const { store } = storeFixture(t);
  seed(store, XLAYER, '1000001');
  seed(store, ROBINHOOD, '9000009');
  assert.throws(() => store.recordCanonicalBlock(XLAYER, CONTRACT, BLOCK, [event(ROBINHOOD, '9000009')]));
  assert.throws(() =>
    store.commitProjections(XLAYER, CONTRACT, BLOCK, [
      {
        chainId: ROBINHOOD,
        owner: OWNER,
        contract: CONTRACT,
        projectionKey: 'vault',
        blockNumber: 100n,
        blockHash: HASH,
        state: { principal: '0' },
      },
    ]),
  );
  assert.throws(
    () => store.saveOperation({ ...store.operation('qa-1952'), chainId: ROBINHOOD }),
    /OPERATION_IDENTITY_CONFLICT/,
  );
  assert.equal(store.projection(XLAYER, OWNER, CONTRACT, 'vault').state.principal, '1000001');
  assert.equal(store.projection(ROBINHOOD, OWNER, CONTRACT, 'vault').state.principal, '9000009');
  assert.equal(store.operation('qa-1952').chainId, XLAYER);
});

function walletFixture() {
  const methods = [],
    listeners = new EventEmitter(),
    simulation = Promise.withResolvers(),
    entered = Promise.withResolvers();
  const provider = {
    chainId: `0x${XLAYER.toString(16)}`,
    accounts: [OWNER],
    on(name, listener) {
      listeners.on(name, listener);
      return this;
    },
    removeListener(name, listener) {
      listeners.removeListener(name, listener);
      return this;
    },
    emit(name, value) {
      listeners.emit(name, value);
    },
    async request({ method }) {
      methods.push(method);
      if (method === 'eth_accounts') return this.accounts;
      if (method === 'eth_chainId') return this.chainId;
      if (method === 'eth_call') {
        entered.resolve();
        return simulation.promise;
      }
      throw new Error('Unexpected method: local fixture never signs or sends');
    },
  };
  const factory = new PreparedActionFactory({
    chainId: XLAYER,
    target: CONTRACT,
    operationId: () => 'qa-wallet',
    encode: () => ({ data: '0x1234', value: 0n }),
  });
  const wallet = new Eip1193Wallet(provider, {
    chainId: XLAYER,
    target: CONTRACT,
    actionAuthority: factory.authority,
  });
  return {
    provider,
    methods,
    simulation,
    entered,
    listeners,
    submit: () => wallet.submit(factory.prepare({}, OWNER)),
  };
}

for (const chainId of [195, 196, ROBINHOOD])
  test(`X Layer wallet rejects chain ${chainId} without a send request`, async () => {
    const f = walletFixture();
    f.provider.chainId = `0x${chainId.toString(16)}`;
    await assert.rejects(f.submit, (error) => error.code === 'WALLET_WRONG_CHAIN');
    // Session revalidation may repeat reads; wrong-chain actions must never simulate/sign/send.
    assert.deepEqual(new Set(f.methods), new Set(['eth_accounts', 'eth_chainId']));
    assert.deepEqual(f.listeners.eventNames(), []);
  });

for (const scenario of ['chain', 'chain-roundtrip', 'account-roundtrip'])
  test(`X Layer wallet invalidates ${scenario} change during simulation`, { timeout: 5000 }, async () => {
    const f = walletFixture();
    const pending = f.submit();
    const rejected = assert.rejects(pending, (error) =>
      ['WALLET_WRONG_CHAIN', 'WALLET_SESSION_CHANGED'].includes(error.code),
    );
    await f.entered.promise;
    if (scenario === 'account-roundtrip') {
      f.provider.accounts = [CONTRACT];
      f.provider.emit('accountsChanged', f.provider.accounts);
      f.provider.accounts = [OWNER];
      f.provider.emit('accountsChanged', f.provider.accounts);
    } else {
      f.provider.chainId = '0xb626';
      f.provider.emit('chainChanged', f.provider.chainId);
      if (scenario === 'chain-roundtrip') {
        f.provider.chainId = '0x7a0';
        f.provider.emit('chainChanged', f.provider.chainId);
      }
    }
    f.simulation.resolve('0x');
    await rejected;
    assert.deepEqual(new Set(f.methods), new Set(['eth_accounts', 'eth_chainId', 'eth_call']));
    assert.equal(f.methods.filter((method) => method === 'eth_call').length, 1);
    assert.deepEqual(f.listeners.eventNames(), []);
  });
