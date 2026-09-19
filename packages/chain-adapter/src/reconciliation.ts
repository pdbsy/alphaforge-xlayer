import type { ChainBlock, ChainLog, ChainReceipt, ReadonlyRpc } from './rpc.ts';
import type { DeploymentManifest } from './manifest.ts';
import type { ChainOperation } from './lifecycle.ts';
import type { Address, BlockHash, HexData } from './types.ts';

/**
 * Final product evidence computed by the server from one canonical database
 * snapshot. Clients consume this result; they do not derive readiness from
 * independently cached operation or projection objects.
 */
export interface ProductOperationEvidence {
  readonly lifecycle: ChainOperation['state'];
  readonly receipt: 'PENDING' | 'SUCCESS' | 'REVERTED';
  readonly receiptCanonical: boolean;
  readonly confirmations: number;
  readonly reconciliation: 'PENDING' | 'MATCHED' | 'FAILED';
  readonly projection: 'PENDING' | 'READY' | 'STALE';
  readonly chainStatus: 'PENDING' | 'INCLUDED' | 'SOFT_READY' | 'REORGED' | 'FAILED' | 'UNKNOWN';
  readonly l1Status: 'UNKNOWN' | 'POSTED';
  readonly finalityStatus: 'UNKNOWN' | 'FINALIZED';
  readonly indexerStatus: 'HEALTHY' | 'SYNCING' | 'DEGRADED';
  readonly degradedReason: 'CHAIN_REORG_DEPTH_EXCEEDED' | 'CHAIN_REORG_NO_COMMON_ANCESTOR' | null;
  readonly productReady: boolean;
}

export interface DecodedContractEvent {
  readonly eventSignature: HexData;
  readonly eventName: string;
  readonly normalizedData: Readonly<Record<string, unknown>>;
}

export interface CanonicalContractEvent extends ChainLog, DecodedContractEvent {
  readonly chainId: number;
}

export interface ProjectionCandidate {
  readonly owner: Address;
  readonly projectionKey: string;
  readonly blockNumber: bigint;
  readonly blockHash: BlockHash;
  readonly state: Readonly<Record<string, unknown>>;
}

export type ReconciliationResult =
  | { readonly status: 'MATCH' }
  | {
      readonly status: 'MISMATCH';
      readonly errorCode: 'EVENT_EVIDENCE_MISMATCH' | 'CONTRACT_STATE_MISMATCH';
    };

interface IntegrationContext {
  readonly rpc: ReadonlyRpc;
  readonly manifest: DeploymentManifest;
}

export interface ContractIntegration {
  decode(log: ChainLog): DecodedContractEvent | null;
  rebuildProjections(
    context: IntegrationContext & {
      readonly events: readonly CanonicalContractEvent[];
      readonly block: ChainBlock;
    },
  ): Promise<readonly ProjectionCandidate[]>;
  reconcileOperation(
    context: IntegrationContext & {
      readonly operation: ChainOperation;
      readonly receipt: ChainReceipt;
      readonly events: readonly CanonicalContractEvent[];
      readonly block: ChainBlock;
    },
  ): Promise<ReconciliationResult>;
}
