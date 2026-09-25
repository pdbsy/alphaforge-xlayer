import test from 'node:test';
import assert from 'node:assert/strict';
import { M3_XLAYER_NETWORK, M3_ROBINHOOD_NETWORK } from '../apps/web/src/m3-network.ts';
import { createM3InjectedRuntimeFixture } from '../apps/web/src/m3-injected-runtime-fixture.ts';
import { createM3BrowserRuntime } from '../apps/web/src/m3-browser-runtime.ts';
import { asAddress } from '../packages/chain-adapter/src/types.ts';

for (const network of [M3_XLAYER_NETWORK, M3_ROBINHOOD_NETWORK]) {
  test(`${network.chainId} runtime preserves approvals, deposits, Pass, multiple Vaults and closed rescue`, async () => {
    const fixture = createM3InjectedRuntimeFixture(network);
    const runtime = fixture.runtime;
    fixture.setCorrectNetwork();
    await runtime.connect();
    assert.deepEqual(runtime.snapshot.network, { status: 'CORRECT', chainId: network.chainId });
    assert.ok(runtime.vaultSelection.options.every((item) => item.chainId === network.chainId));
    const deposit = { kind: 'deposit', usdcBaseUnits: '1000001' } as const;
    for (const kind of ['af-usdc', 'pass'] as const) {
      const review = await runtime.reviewDepositApprovals!(deposit);
      await runtime.confirmDepositApproval!(review, kind);
    }
    const action = await runtime.reviewAction(deposit);
    await runtime.confirmAction(action);
    assert.equal(fixture.providerRequests.filter((item) => item.method === 'eth_sendTransaction').length, 3);
    await fixture.setSoftReady();
    const transfer = await runtime.reviewPassTransfer!({
      recipient: asAddress(`0x${'99'.repeat(20)}`),
      passBaseUnits: '1',
    });
    await runtime.confirmPassTransfer!(transfer);
    await fixture.setSoftReady();
    const stale = await runtime.reviewAction({ kind: 'close' });
    await fixture.selectSecondVault();
    await fixture.setSecondOwner();
    await runtime.connect();
    await assert.rejects(runtime.confirmAction(stale), /M3_VAULT_SELECTION_CHANGED/);
    assert.equal(runtime.snapshot.network.chainId, network.chainId);
    await fixture.setClosed();
    const rescue = await runtime.reviewAction({ kind: 'rescue-native' });
    await runtime.confirmAction(rescue);
    assert.equal(fixture.providerRequests.filter((item) => item.method === 'eth_sendTransaction').length, 5);
  });

  test(`${network.chainId} runtime refuses every foreign wallet chain before and after review`, async () => {
    for (const foreign of [195, 196, network.chainId === 1952 ? 46630 : 1952]) {
      const runtime = createM3BrowserRuntime({
        networkConfig: network,
        provider: {
          async request({ method }) {
            return method === 'eth_chainId' ? `0x${foreign.toString(16)}` : [`0x${'11'.repeat(20)}`];
          },
          on() {},
          removeListener() {},
        },
      });
      await assert.rejects(runtime.connect(), /WALLET_WRONG_CHAIN/);
      assert.equal(runtime.snapshot.network.status, 'WRONG');
      assert.equal(runtime.snapshot.network.chainId, foreign);
    }
    for (const kind of ['action', 'approval', 'pass'] as const) {
      const fixture = createM3InjectedRuntimeFixture(network);
      fixture.setCorrectNetwork();
      await fixture.runtime.connect();
      const runtime = fixture.runtime;
      const confirmation =
        kind === 'action'
          ? runtime.reviewAction({ kind: 'close' }).then((review) => () => runtime.confirmAction(review))
          : kind === 'approval'
            ? runtime.reviewDepositApprovals!({ kind: 'deposit', usdcBaseUnits: '1' }).then(
                (review) => () => runtime.confirmDepositApproval!(review, 'af-usdc'),
              )
            : runtime.reviewPassTransfer!({
                recipient: asAddress(`0x${'99'.repeat(20)}`),
                passBaseUnits: '1',
              }).then((review) => () => runtime.confirmPassTransfer!(review));
      const confirm = await confirmation;
      await fixture.setWrongNetwork();
      await assert.rejects(confirm());
      assert.equal(
        fixture.providerRequests.filter((item) => item.method === 'eth_sendTransaction').length,
        0,
      );
    }
  });
}
