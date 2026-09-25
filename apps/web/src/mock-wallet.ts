import { formatUnits } from '../../../packages/domain/src/money.ts';

export interface MockWalletSnapshot {
  readonly address: string;
  readonly ethBalance?: string;
  readonly holdings?: readonly { readonly id: string; readonly name: string; readonly quantity: number }[];
}
const storageKey = 'alphaforge.mock-wallet.v1';
// A display identifier only. There is no private key, provider or chain authority.
const address = '0x000000000000000000000000000000000000de00';
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const amount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** An explicit local presentation of the existing simulated exchange ledger. */
export function createMockWalletSession(
  readExchange: () => unknown,
  strategies: readonly { readonly id: string; readonly name: string }[],
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
) {
  let connected = false;
  try {
    connected = storage?.getItem(storageKey) === 'connected';
  } catch {
    /* Session-only mode. */
  }
  return {
    connect() {
      connected = true;
      try {
        storage?.setItem(storageKey, 'connected');
      } catch {
        /* Keep the in-memory choice. */
      }
    },
    disconnect() {
      connected = false;
      try {
        storage?.removeItem(storageKey);
      } catch {
        /* Keep the in-memory choice. */
      }
    },
    snapshot(): MockWalletSnapshot | undefined {
      if (!connected) return undefined;
      try {
        const ledger = readExchange();
        if (!record(ledger) || !amount(ledger.cash) || !record(ledger.positions)) return { address };
        const holdings: { id: string; name: string; quantity: number }[] = [];
        for (const strategy of strategies) {
          const position = ledger.positions[strategy.id];
          if (!Object.hasOwn(ledger.positions, strategy.id) || !record(position) || !amount(position.qty))
            return { address };
          if (position.qty > 0)
            holdings.push({ id: strategy.id, name: strategy.name, quantity: position.qty });
        }
        return { address, ethBalance: formatUnits(String(ledger.cash), 2), holdings };
      } catch {
        return { address };
      }
    },
  };
}
