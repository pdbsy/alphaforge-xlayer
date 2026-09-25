import { asAddress } from '../../../packages/chain-adapter/src/types.ts';
import { encodeM3StrategyPassBalanceOf } from '../../../packages/chain-adapter/src/pass-abi.ts';
import { formatUnits } from '../../../packages/domain/src/money.ts';
import type { Eip1193Provider } from './chain-wallet.ts';
import type { WalletPassHolding } from './wallet-account-view.ts';

export interface XLayerWalletBalanceInput {
  readonly provider: Eip1193Provider;
  readonly address: string;
  readonly deployments: readonly { readonly strategyPassAddress: string }[];
}

export interface XLayerWalletBalances {
  readonly balance: string;
  readonly passes: readonly WalletPassHolding[];
}

const MAX = (1n << 256n) - 1n;
function hexQuantity(value: unknown, exactWord = false): bigint {
  if (
    typeof value !== 'string' ||
    !(exactWord ? /^0x[0-9a-fA-F]{64}$/.test(value) : /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value))
  )
    throw new Error('INVALID_WALLET_BALANCE');
  const amount = BigInt(value);
  if (amount > MAX) throw new Error('INVALID_WALLET_BALANCE');
  return amount;
}
function decimal(value: bigint): string {
  return formatUnits(value.toString(), 18).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/u, '');
}
async function assertSession(provider: Eip1193Provider, address: string): Promise<void> {
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (
    !Array.isArray(accounts) ||
    accounts.length === 0 ||
    typeof accounts[0] !== 'string' ||
    asAddress(accounts[0]).toLowerCase() !== address.toLowerCase()
  )
    throw new Error('WALLET_ACCOUNT_CHANGED');
  const chain = await provider.request({ method: 'eth_chainId' });
  if (chain !== '0x7a0') throw new Error('WALLET_WRONG_CHAIN');
}

export async function readXLayerWalletBalances(
  input: XLayerWalletBalanceInput,
): Promise<XLayerWalletBalances> {
  const address = asAddress(input.address);
  await assertSession(input.provider, address);
  const native = hexQuantity(
    await input.provider.request({ method: 'eth_getBalance', params: [address, 'latest'] }),
  );
  const unique = new Set(input.deployments.map((item) => asAddress(item.strategyPassAddress).toLowerCase()));
  const passes: WalletPassHolding[] = [];
  for (const passAddress of unique) {
    const raw = await input.provider.request({
      method: 'eth_call',
      params: [{ to: passAddress, data: encodeM3StrategyPassBalanceOf(address) }, 'latest'],
    });
    const quantity = hexQuantity(raw, true);
    if (quantity > 0n)
      passes.push({
        name: `Pass ${passAddress.slice(0, 8)}…${passAddress.slice(-4)}`,
        quantity: decimal(quantity),
      });
  }
  await assertSession(input.provider, address);
  return Object.freeze({ balance: decimal(native), passes: Object.freeze(passes) });
}
