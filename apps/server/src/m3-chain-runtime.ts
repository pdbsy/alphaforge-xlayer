import { ChainStore } from './chain-store.ts';
import { ChainSynchronizer } from './chain-sync.ts';
import type { ChainSyncResult } from './chain-sync.ts';
import { M3_VAULT_PROJECTION_KEY, M3VaultContractIntegration } from './m3-vault-integration.ts';
import {
  createOperation,
  transitionOperation,
  type ChainOperation,
} from '../../../packages/chain-adapter/src/lifecycle.ts';
import type { DeploymentManifest } from '../../../packages/chain-adapter/src/manifest.ts';
import { validateDeploymentManifest } from '../../../packages/chain-adapter/src/manifest.ts';
import { m3ChainSyncPolicy, type ChainSyncPolicy } from '../../../packages/chain-adapter/src/policy.ts';
import { JsonRpcClient, type ReadonlyRpc } from '../../../packages/chain-adapter/src/rpc.ts';
import {
  decodeM3VaultCalldata,
  M3_VAULT_ABI_VERSION,
} from '../../../packages/chain-adapter/src/vault-abi.ts';
import {
  sameAddress,
  type Address,
  type BlockHash,
  type HexData,
  type TransactionHash,
} from '../../../packages/chain-adapter/src/types.ts';
import type { ChainEvidenceRoutesOptions } from './chain-routes.ts';

export interface ObservedWalletSubmission {
  readonly operationId: string;
  readonly chainId: number;
  readonly owner: Address;
  readonly target: Address;
  readonly calldata: HexData;
  readonly txHash: TransactionHash;
}

export interface M3ChainRuntimeDependencies {
  readonly createRpc?: (endpoints: readonly string[]) => ReadonlyRpc;
}

export interface M3RuntimeSyncResult extends ChainSyncResult {
  readonly trackedOperations: number;
  readonly trackingFailures: number;
}

export type M3ChainRuntimeDeployment =
  | { readonly deploymentStatus: 'NOT_DEPLOYED' }
  | {
      readonly deploymentStatus: 'DEPLOYED';
      readonly dbPath: string;
      readonly rpcEndpoints: readonly string[];
      readonly manifestDocument: unknown;
      readonly expectedManifestDigest: BlockHash;
      readonly expectedContractAddress: Address;
      readonly policy?: ChainSyncPolicy;
      readonly maxBlocksPerSync?: number;
      readonly now?: () => string;
    };

function assertM3VaultManifest(manifest: DeploymentManifest): void {
  if (
    manifest.contractName !== 'AlphaForgeVault' ||
    manifest.contractType !== 'vault' ||
    manifest.abiVersion !== M3_VAULT_ABI_VERSION
  )
    throw new Error('M3_VAULT_ABI_MISMATCH');
}

export class M3ChainRuntime {
  readonly store: ChainStore;
  readonly synchronizer: ChainSynchronizer;
  readonly manifest: DeploymentManifest;
  readonly chainEvidence: ChainEvidenceRoutesOptions;
  #closed = false;
  readonly #now: () => string;
  readonly #maxBlocksPerSync: number;
  #operationCursor: string | null = null;

  constructor(options: {
    readonly dbPath: string;
    readonly rpc: ReadonlyRpc;
    readonly manifest: DeploymentManifest;
    readonly policy?: ChainSyncPolicy;
    readonly maxBlocksPerSync?: number;
    readonly now?: () => string;
  }) {
    assertM3VaultManifest(options.manifest);
    const policy = m3ChainSyncPolicy(options.policy);
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#maxBlocksPerSync = options.maxBlocksPerSync ?? 2_000;
    this.manifest = options.manifest;
    this.store = new ChainStore(options.dbPath);
    try {
      this.synchronizer = new ChainSynchronizer({
        rpc: options.rpc,
        store: this.store,
        manifest: options.manifest,
        integration: new M3VaultContractIntegration(),
        policy,
        ...(options.maxBlocksPerSync === undefined ? {} : { maxBlocksPerSync: options.maxBlocksPerSync }),
        ...(options.now === undefined ? {} : { now: options.now }),
      });
    } catch (error) {
      this.store.close();
      throw error;
    }
    this.chainEvidence = Object.freeze({
      store: this.store,
      chainId: options.manifest.chainId,
      contract: options.manifest.contractAddress,
      projectionKey: M3_VAULT_PROJECTION_KEY,
      recordSubmission: (input: ObservedWalletSubmission) => this.recordSubmission(input),
    });
  }

  recordSubmission(input: ObservedWalletSubmission): ChainOperation {
    if (
      input.chainId !== this.manifest.chainId ||
      !sameAddress(input.target, this.manifest.contractAddress) ||
      !decodeM3VaultCalldata(input.calldata)
    )
      throw new Error('INVALID_M3_WALLET_SUBMISSION');
    const existing = this.store.operation(input.operationId);
    if (existing) {
      if (
        existing.chainId !== input.chainId ||
        existing.txHash?.toLowerCase() !== input.txHash.toLowerCase() ||
        !sameAddress(existing.owner, input.owner) ||
        !sameAddress(existing.target, input.target) ||
        existing.calldata?.toLowerCase() !== input.calldata.toLowerCase()
      )
        throw new Error('OPERATION_IDENTITY_CONFLICT');
      return existing;
    }
    const transaction = this.store.operationByTransaction(input.chainId, input.txHash);
    if (transaction) throw new Error('OPERATION_IDENTITY_CONFLICT');
    const operation = transitionOperation(
      createOperation({
        operationId: input.operationId,
        chainId: input.chainId,
        owner: input.owner,
        target: input.target,
        calldata: input.calldata,
        state: 'AWAITING_SIGNATURE',
      }),
      { state: 'SUBMITTED', txHash: input.txHash, submittedAt: this.#now() },
    );
    this.store.saveOperation(operation);
    return operation;
  }

  async syncToHead(): Promise<M3RuntimeSyncResult> {
    const head = await this.synchronizer.head();
    const checkpoint = this.store.checkpoint(this.manifest.chainId, this.manifest.contractAddress);
    const start = checkpoint ? checkpoint.blockNumber + 1n : this.manifest.deploymentBlock;
    const boundedHead =
      start <= head.number
        ? start + BigInt(this.#maxBlocksPerSync) - 1n < head.number
          ? start + BigInt(this.#maxBlocksPerSync) - 1n
          : head.number
        : head.number;
    const result = await this.synchronizer.syncTo(boundedHead, head.number);
    if (boundedHead < head.number)
      return Object.freeze({ ...result, trackedOperations: 0, trackingFailures: 0 });
    const operations = this.store.trackableOperationIds(
      this.manifest.chainId,
      this.manifest.contractAddress,
      100,
      this.#operationCursor,
    );
    let trackingFailures = 0;
    for (const operationId of operations) {
      try {
        await this.synchronizer.trackOperation(operationId, head);
      } catch {
        trackingFailures++;
      }
    }
    if (operations.length > 0) this.#operationCursor = operations.at(-1)!;
    return Object.freeze({ ...result, trackedOperations: operations.length, trackingFailures });
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.store.close();
  }
}

export function composeM3ChainRuntime(
  input: M3ChainRuntimeDeployment,
  dependencies: M3ChainRuntimeDependencies = {},
): M3ChainRuntime | null {
  if (input.deploymentStatus === 'NOT_DEPLOYED') return null;
  const manifest = validateDeploymentManifest(input.manifestDocument, {
    environment: 'robinhood-chain-testnet',
    chainId: 46_630,
    manifestDigest: input.expectedManifestDigest,
    contractAddress: input.expectedContractAddress,
  });
  assertM3VaultManifest(manifest);
  const rpc = dependencies.createRpc
    ? dependencies.createRpc(input.rpcEndpoints)
    : new JsonRpcClient(input.rpcEndpoints);
  return new M3ChainRuntime({
    dbPath: input.dbPath,
    rpc,
    manifest,
    ...(input.policy === undefined ? {} : { policy: input.policy }),
    ...(input.maxBlocksPerSync === undefined ? {} : { maxBlocksPerSync: input.maxBlocksPerSync }),
    ...(input.now === undefined ? {} : { now: input.now }),
  });
}
