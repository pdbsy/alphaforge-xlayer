import test from 'node:test';
import assert from 'node:assert/strict';
import { createM3VaultActionFactory } from '../apps/web/src/m3-vault-actions.ts';
import { asAddress } from '../packages/chain-adapter/src/types.ts';

const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');

test('Vault action factory prepares exact deposit, withdraw and close calldata for the configured deployment', () => {
  const factory = createM3VaultActionFactory({ chainId: 46_630, target: CONTRACT });
  const deposit = factory.prepare(
    { operationId: 'deposit-1', type: 'deposit', usdcBaseUnits: '1000000' },
    OWNER,
  );
  const withdraw = factory.prepare(
    { operationId: 'withdraw-1', type: 'withdraw', usdcBaseUnits: '500000' },
    OWNER,
  );
  const close = factory.prepare({ operationId: 'close-1', type: 'close' }, OWNER);
  assert.equal(deposit.data, `0xb6b55f25${1_000_000n.toString(16).padStart(64, '0')}`);
  assert.equal(withdraw.data, `0x2e1a7d4d${500_000n.toString(16).padStart(64, '0')}`);
  assert.equal(close.data, '0x43d726d6');
  for (const prepared of [deposit, withdraw, close]) {
    assert.equal(prepared.chainId, 46_630);
    assert.equal(prepared.owner, OWNER);
    assert.equal(prepared.target, CONTRACT);
    assert.equal(prepared.value, 0n);
  }
});

test('Vault action factory rejects zero, signed, noncanonical and uint256-overflow amounts', () => {
  const factory = createM3VaultActionFactory({ chainId: 46_630, target: CONTRACT });
  for (const usdcBaseUnits of ['0', '-1', '+1', '01', '1.0', `${1n << 256n}`]) {
    assert.throws(
      () => factory.prepare({ operationId: 'bad', type: 'deposit', usdcBaseUnits }, OWNER),
      /INVALID_M3_VAULT_AMOUNT/,
    );
  }
});
