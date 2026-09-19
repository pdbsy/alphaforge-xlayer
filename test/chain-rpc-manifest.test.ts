import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  validateDeploymentManifest,
  type DeploymentManifestExpectation,
} from '../packages/chain-adapter/src/manifest.ts';
import {
  createFetchTransport,
  JsonRpcClient,
  RpcFailure,
  type RpcTransport,
} from '../packages/chain-adapter/src/rpc.ts';
import { asAddress, asBlockHash, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';

const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const TX_HASH = asTransactionHash(`0x${'33'.repeat(32)}`);
const BLOCK_HASH = asBlockHash(`0x${'44'.repeat(32)}`);
const PARENT_HASH = asBlockHash(`0x${'55'.repeat(32)}`);
const RUNTIME_HASH = asBlockHash(`0x${'77'.repeat(32)}`);
const ENDPOINT = 'https://rpc.testnet.chain.robinhood.com';

const manifestBody = {
  schemaVersion: 1,
  environment: 'robinhood-chain-testnet',
  chainId: 46_630,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: CONTRACT,
  deploymentBlock: '100',
  abiVersion: 'm3-owner-v1',
  runtimeBytecodeHash: RUNTIME_HASH,
};
const DIGEST = asBlockHash(`0x${createHash('sha256').update(JSON.stringify(manifestBody)).digest('hex')}`);
const manifestInput = { ...manifestBody, manifestDigest: DIGEST };
const expected: DeploymentManifestExpectation = {
  environment: 'robinhood-chain-testnet',
  chainId: 46_630,
  manifestDigest: DIGEST,
};

test('deployment manifest is accepted only when exact trusted identity matches', () => {
  const manifest = validateDeploymentManifest(manifestInput, expected);
  assert.equal(manifest.contractAddress, CONTRACT);
  assert.equal(manifest.deploymentBlock, 100n);
  assert.equal(manifest.runtimeBytecodeHash, RUNTIME_HASH);
  assert.ok(Object.isFrozen(manifest));
  for (const changed of [
    { ...manifestInput, chainId: 1 },
    { ...manifestInput, manifestDigest: BLOCK_HASH },
    { ...manifestInput, deploymentBlock: '-1' },
    { ...manifestInput, contractAddress: OWNER },
    { ...manifestInput, contractName: 'OtherVault' },
    { ...manifestInput, deploymentBlock: '101' },
    { ...manifestInput, runtimeBytecodeHash: BLOCK_HASH },
    { ...manifestInput, unexpected: true },
  ]) {
    const expectation =
      'contractAddress' in changed && changed.contractAddress === OWNER
        ? { ...expected, contractAddress: CONTRACT }
        : expected;
    assert.throws(() => validateDeploymentManifest(changed, expectation));
  }
});

test('deployment manifest rejects missing runtime identity and unsafe identifiers', () => {
  const withoutRuntimeHash = { ...manifestInput } as Partial<typeof manifestInput>;
  delete withoutRuntimeHash.runtimeBytecodeHash;
  assert.throws(
    () => validateDeploymentManifest(withoutRuntimeHash, expected),
    /INVALID_DEPLOYMENT_MANIFEST/,
  );
  assert.throws(
    () => validateDeploymentManifest({ ...manifestInput, abiVersion: '../untrusted' }, expected),
    /INVALID_DEPLOYMENT_MANIFEST/,
  );
});

function transportFor(results: Readonly<Record<string, unknown>>): RpcTransport {
  return async (_endpoint, request) => ({
    status: 200,
    body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: results[request.method] }),
  });
}

test('read-only RPC verifies chain identity and normalizes receipt, block, logs and calls', async () => {
  const rawLog = {
    address: CONTRACT,
    blockNumber: '0x78',
    blockHash: BLOCK_HASH,
    transactionHash: TX_HASH,
    transactionIndex: '0x2',
    logIndex: '0x1',
    data: '0x1234',
    topics: [`0x${'88'.repeat(32)}`],
    removed: false,
  };
  const rpc = new JsonRpcClient([ENDPOINT], {
    transport: transportFor({
      eth_chainId: '0xb626',
      eth_getBlockByNumber: {
        number: '0x78',
        hash: BLOCK_HASH,
        parentHash: PARENT_HASH,
        timestamp: '0x68c69f40',
      },
      eth_getTransactionReceipt: {
        transactionHash: TX_HASH,
        blockNumber: '0x78',
        blockHash: BLOCK_HASH,
        transactionIndex: '0x2',
        from: OWNER,
        to: CONTRACT,
        status: '0x1',
        logs: [rawLog],
      },
      eth_getLogs: [rawLog],
      eth_call: '0x1234',
    }),
  });

  assert.equal(await rpc.chainId(), 46_630);
  assert.deepEqual(await rpc.block(120n), {
    number: 120n,
    hash: BLOCK_HASH,
    parentHash: PARENT_HASH,
    timestamp: 1_757_847_360n,
  });
  const receipt = await rpc.receipt(TX_HASH);
  assert.equal(receipt?.status, 'SUCCESS');
  assert.equal(receipt?.to, CONTRACT);
  assert.equal(receipt?.logs[0]?.logIndex, 1);
  assert.deepEqual(await rpc.logs({ address: CONTRACT, fromBlock: 120n, toBlock: 120n }), receipt?.logs);
  assert.equal(await rpc.call({ to: CONTRACT, data: asHexData('0x1234') }, 120n), '0x1234');
});

test('read-only RPC uses only allowlisted methods and canonical quantity encoding', async () => {
  const requests: { method: string; params: readonly unknown[] }[] = [];
  const transport: RpcTransport = async (_endpoint, request) => {
    requests.push({ method: request.method, params: request.params });
    return { status: 200, body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: [] }) };
  };
  const rpc = new JsonRpcClient([ENDPOINT], { transport });
  await rpc.logs({ address: CONTRACT, fromBlock: 0n, toBlock: 16n, topics: [null] });
  assert.deepEqual(requests, [
    {
      method: 'eth_getLogs',
      params: [{ address: CONTRACT, fromBlock: '0x0', toBlock: '0x10', topics: [null] }],
    },
  ]);
  assert.equal(Object.hasOwn(rpc, 'request'), false, 'raw arbitrary RPC must not be public');
});

test('RPC rotates endpoints for bounded retryable failures', async () => {
  const endpoints: string[] = [];
  let attempts = 0;
  const rpc = new JsonRpcClient(['https://rpc-one.example', 'https://rpc-two.example'], {
    maxAttempts: 2,
    transport: async (endpoint, request) => {
      endpoints.push(endpoint);
      attempts++;
      if (attempts === 1) return { status: 429, body: '' };
      return { status: 200, body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: '0xb626' }) };
    },
  });
  assert.equal(await rpc.chainId(), 46_630);
  assert.deepEqual(endpoints, ['https://rpc-one.example/', 'https://rpc-two.example/']);
});

test('RPC fails closed on JSON-RPC errors, malformed data and oversized responses', async () => {
  const cases: { body: string; code: string }[] = [
    {
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32_000, message: 'bad' } }),
      code: 'RPC_REMOTE_ERROR',
    },
    { body: JSON.stringify({ jsonrpc: '2.0', id: 2, result: '0xb626' }), code: 'RPC_INVALID_ENVELOPE' },
    { body: '{', code: 'RPC_INVALID_RESPONSE' },
    { body: 'x'.repeat(129), code: 'RPC_RESPONSE_TOO_LARGE' },
  ];
  for (const value of cases) {
    const rpc = new JsonRpcClient([ENDPOINT], {
      maxResponseBytes: 128,
      transport: async () => ({ status: 200, body: value.body }),
    });
    await assert.rejects(
      () => rpc.chainId(),
      (error: unknown) => {
        assert.ok(error instanceof RpcFailure);
        assert.equal(error.code, value.code);
        return true;
      },
    );
  }
});

test('RPC errors never expose endpoint paths, query credentials or transport details', async () => {
  const endpoint = 'https://rpc.example/private-provider-key?token=secret-value';
  const rpc = new JsonRpcClient([endpoint], {
    maxAttempts: 1,
    transport: async () => {
      throw new Error(`network failure at ${endpoint}`);
    },
  });
  await assert.rejects(
    () => rpc.chainId(),
    (error: unknown) => {
      assert.ok(error instanceof RpcFailure);
      assert.equal(error.code, 'RPC_UNAVAILABLE');
      assert.equal(error.message, 'RPC_UNAVAILABLE');
      assert.doesNotMatch(String(error), /secret-value|private-provider-key|rpc\.example/);
      return true;
    },
  );
});

test('default fetch transport stops reading once the response byte budget is exceeded', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(80));
    },
    cancel() {
      cancelled = true;
    },
  });
  const fetcher: typeof fetch = async () => new Response(body, { status: 200 });
  const transport = createFetchTransport(fetcher);
  await assert.rejects(
    () =>
      transport(
        ENDPOINT,
        { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
        AbortSignal.timeout(1_000),
        128,
      ),
    (error: unknown) => error instanceof RpcFailure && error.code === 'RPC_RESPONSE_TOO_LARGE',
  );
  assert.equal(cancelled, true);
});
