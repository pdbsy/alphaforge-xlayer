import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseM3ProductAction, sameM3ProductAction } from '../apps/web/src/m3-product-runtime.ts';

test('deposit and withdraw requests preserve exact AF-USDC six-decimal base units', () => {
  assert.deepEqual(parseM3ProductAction('deposit', '1.000001'), {
    kind: 'deposit',
    usdcBaseUnits: '1000001',
  });
  assert.deepEqual(parseM3ProductAction('withdraw', '0.000001'), {
    kind: 'withdraw',
    usdcBaseUnits: '1',
  });
});

test('chain action input rejects zero, excess precision and noncanonical decimals', () => {
  for (const amount of ['0', '0.0000001', '01', '1e6', '-1', '1.']) {
    assert.throws(() => parseM3ProductAction('deposit', amount));
  }
});

test('close carries no amount or configurable recipient', () => {
  assert.deepEqual(parseM3ProductAction('close'), { kind: 'close' });
  assert.throws(() => parseM3ProductAction('close', '1'), /CLOSE_AMOUNT_FORBIDDEN/);
});

test('review binding compares action kind and exact base units', () => {
  assert.equal(
    sameM3ProductAction(
      { kind: 'deposit', usdcBaseUnits: '1000000' },
      { kind: 'deposit', usdcBaseUnits: '1000000' },
    ),
    true,
  );
  assert.equal(
    sameM3ProductAction(
      { kind: 'deposit', usdcBaseUnits: '1000000' },
      { kind: 'withdraw', usdcBaseUnits: '1000000' },
    ),
    false,
  );
  assert.equal(
    sameM3ProductAction({ kind: 'withdraw', usdcBaseUnits: '1' }, { kind: 'withdraw', usdcBaseUnits: '2' }),
    false,
  );
  assert.equal(sameM3ProductAction({ kind: 'close' }, { kind: 'close' }), true);
});
