import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createM3InjectedRuntimeFixture } from '../apps/web/src/m3-injected-runtime-fixture.ts';

test('injected runtime drives wrong-network, owner read, mock submit and recovery states', async () => {
  const fixture = createM3InjectedRuntimeFixture();
  const runtime = fixture.runtime;

  assert.equal(runtime.snapshot.network.status, 'WRONG');
  assert.equal(runtime.snapshot.onchain.writeMode, 'INJECTED_MOCK');
  await assert.rejects(runtime.connect(), /WALLET_WRONG_CHAIN/);
  assert.equal(runtime.snapshot.network.status, 'WRONG');

  fixture.setCorrectNetwork();
  await runtime.connect();
  assert.equal(runtime.snapshot.wallet.status, 'CONNECTED');
  assert.equal(runtime.snapshot.network.status, 'CORRECT');
  assert.equal(runtime.snapshot.onchain.owner, 'OWNER');
  assert.equal(runtime.snapshot.onchain.depositAuthorization?.afUsdcAllowanceBaseUnits, '0');
  assert.equal(runtime.snapshot.onchain.depositAuthorization?.passAllowanceBaseUnits, '0');

  const review = await runtime.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1000001' });
  const submission = await runtime.confirmAction(review);
  assert.equal(submission.state, 'SUBMITTED');
  assert.equal(runtime.snapshot.transaction.status, 'SUBMITTED');
  const expectedWithdrawData = `0x2e1a7d4d${BigInt(1_000_001).toString(16).padStart(64, '0')}`;
  const actionCalls = fixture.providerRequests.filter(
    (request) =>
      request.method === 'eth_call' &&
      (request.params?.[0] as { readonly data?: unknown } | undefined)?.data === expectedWithdrawData,
  );
  const allowanceCalls = fixture.providerRequests.filter(
    (request) =>
      request.method === 'eth_call' &&
      String((request.params?.[0] as { readonly data?: unknown } | undefined)?.data).startsWith('0xdd62ed3e'),
  );
  const submissionRequest = fixture.providerRequests.find(
    (request) => request.method === 'eth_sendTransaction',
  );
  // Review, confirmation, and the wallet's final pre-submit gate each simulate.
  assert.equal(actionCalls.length, 3);
  assert.equal(allowanceCalls.length, 6);
  assert.equal(
    (submissionRequest?.params?.[0] as { readonly data?: unknown } | undefined)?.data,
    expectedWithdrawData,
  );
  assert.equal(
    String((submissionRequest?.params?.[0] as { readonly data?: unknown } | undefined)?.data).startsWith(
      '0xb6b55f25',
    ),
    false,
  );

  fixture.setSoftReady();
  assert.equal(runtime.snapshot.onchain.readiness, 'SOFT_READY');
  assert.equal(runtime.snapshot.transaction.status, 'READY');

  fixture.setReorged();
  assert.equal(runtime.snapshot.onchain.readiness, 'REORGED');
  assert.equal(runtime.snapshot.transaction.status, 'FAILED');

  fixture.setDegraded();
  assert.equal(runtime.snapshot.onchain.health, 'DEGRADED');
  assert.equal(runtime.snapshot.onchain.exitPath, 'SIMULATION');
  assert.equal(runtime.snapshot.transaction.status, 'INDEXING');
});

test('injected runtime reviews bind the exact request and are single-use', async () => {
  const fixture = createM3InjectedRuntimeFixture();
  fixture.setCorrectNetwork();
  await fixture.runtime.connect();
  const review = await fixture.runtime.reviewAction({ kind: 'close' });

  assert.deepEqual(review.request, { kind: 'close' });
  await fixture.runtime.confirmAction(review);
  await assert.rejects(fixture.runtime.confirmAction(review), /INVALID_PRODUCT_REVIEW/);
});
