export interface ChainSyncPolicy {
  readonly softReadyDepth: number;
  readonly reorgSearchLimit: number;
}

function boundedPolicy(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000)
    throw new Error('INVALID_CHAIN_SYNC_POLICY');
  return value;
}

export function m3ChainSyncPolicy(overrides: Partial<ChainSyncPolicy> = {}): Readonly<ChainSyncPolicy> {
  return Object.freeze({
    softReadyDepth: boundedPolicy(overrides.softReadyDepth ?? 3),
    reorgSearchLimit: boundedPolicy(overrides.reorgSearchLimit ?? 128),
  });
}
