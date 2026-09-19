import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runM3DialogAction } from '../apps/web/src/m3-product-dialog.ts';

test('failed chain review shows its own error and restores the review control', async () => {
  const control = { disabled: false };
  let message = 'stale API error';

  const completed = await runM3DialogAction(
    'review',
    control,
    () => Promise.reject(new Error('INVALID_AF_USDC_AMOUNT')),
    (value) => {
      message = value;
    },
  );

  assert.equal(completed, false);
  assert.equal(control.disabled, false);
  assert.equal(message, 'INVALID_AF_USDC_AMOUNT');

  const corrected = await runM3DialogAction(
    'review',
    control,
    () => Promise.resolve(),
    (value) => {
      message = value;
    },
  );
  assert.equal(corrected, true);
  assert.equal(control.disabled, true);
  assert.equal(message, '');
});

test('failed chain confirmation stays disabled and requires a fresh review', async () => {
  const control = { disabled: false };
  let message = '';
  let attempts = 0;

  const completed = await runM3DialogAction(
    'confirm',
    control,
    () => {
      attempts += 1;
      return Promise.reject(new Error('PROVIDER_RESULT_UNKNOWN'));
    },
    (value) => {
      message = value;
    },
  );

  assert.equal(completed, false);
  assert.equal(attempts, 1);
  assert.equal(control.disabled, true);
  assert.match(message, /PROVIDER_RESULT_UNKNOWN/);
  assert.match(message, /Do not retry automatically/);
  assert.match(message, /new review/);
});
