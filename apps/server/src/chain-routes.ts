import type { FastifyInstance } from 'fastify';
import { DomainError } from '../../../packages/domain/src/vault.ts';
import {
  asAddress,
  asHexData,
  asTransactionHash,
  sameAddress,
  type Address,
  type HexData,
  type TransactionHash,
} from '../../../packages/chain-adapter/src/types.ts';
import type { ChainOperation } from '../../../packages/chain-adapter/src/lifecycle.ts';
import type { ChainStore } from './chain-store.ts';

export interface ChainEvidenceRoutesOptions {
  readonly store: ChainStore;
  readonly chainId: number;
  readonly contract: Address;
  readonly projectionKey: string;
  readonly syncStatus: () => {
    readonly lastAttempt: 'NOT_RUN' | 'SUCCEEDED' | 'FAILED';
    readonly errorCode: 'M3_INDEXER_SYNC_FAILED' | null;
  };
  readonly recordSubmission: (input: {
    readonly operationId: string;
    readonly chainId: number;
    readonly owner: Address;
    readonly target: Address;
    readonly calldata: HexData;
    readonly txHash: TransactionHash;
  }) => ChainOperation;
}

const operationIdSchema = {
  type: 'string',
  pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$',
  maxLength: 128,
};
const addressSchema = {
  type: 'string',
  pattern: '^0x[0-9a-fA-F]{40}$',
  maxLength: 42,
};

export function registerChainEvidenceRoutes(app: FastifyInstance, options: ChainEvidenceRoutesOptions): void {
  if (!/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(options.projectionKey))
    throw new Error('INVALID_PROJECTION_KEY');
  app.get('/api/v1/chain/runtime-status', async () => options.syncStatus());
  app.post<{
    Body: {
      operationId: string;
      chainId: number;
      owner: string;
      target: string;
      calldata: string;
      txHash: string;
    };
  }>(
    '/api/v1/chain/operations',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['operationId', 'chainId', 'owner', 'target', 'calldata', 'txHash'],
          properties: {
            operationId: operationIdSchema,
            chainId: { type: 'integer', const: options.chainId },
            owner: addressSchema,
            target: addressSchema,
            calldata: {
              type: 'string',
              pattern: '^0x(?:[0-9a-fA-F]{2})+$',
              minLength: 10,
              maxLength: 74,
            },
            txHash: { type: 'string', pattern: '^0x[0-9a-fA-F]{64}$', maxLength: 66 },
          },
        },
      },
    },
    async (request, reply) => {
      let operation: ChainOperation;
      try {
        operation = options.recordSubmission({
          operationId: request.body.operationId,
          chainId: request.body.chainId,
          owner: asAddress(request.body.owner),
          target: asAddress(request.body.target),
          calldata: asHexData(request.body.calldata),
          txHash: asTransactionHash(request.body.txHash),
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'OPERATION_IDENTITY_CONFLICT')
          throw new DomainError('CHAIN_OPERATION_CONFLICT');
        if (error instanceof Error && error.message === 'INVALID_M3_WALLET_SUBMISSION')
          throw new DomainError('CHAIN_SUBMISSION_INVALID');
        throw error;
      }
      return reply.code(202).send({
        operationId: operation.operationId,
        chainId: operation.chainId,
        owner: operation.owner,
        target: operation.target,
        calldata: operation.calldata,
        state: operation.state,
        txHash: operation.txHash,
        submittedAt: operation.submittedAt,
      });
    },
  );
  app.get<{ Params: { operationId: string }; Querystring: { owner: string } }>(
    '/api/v1/chain/operations/:operationId/evidence',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['operationId'],
          properties: { operationId: operationIdSchema },
        },
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['owner'],
          properties: { owner: addressSchema },
        },
      },
    },
    async (request) => {
      if (options.syncStatus().lastAttempt === 'FAILED')
        throw new DomainError('CHAIN_PROJECTION_UNAVAILABLE');
      const operation = options.store.operation(request.params.operationId);
      const owner = asAddress(request.query.owner);
      if (!operation || !sameAddress(operation.owner, owner))
        throw new DomainError('CHAIN_OPERATION_NOT_FOUND');
      const evidence = options.store.operationEvidence(operation.operationId, options.projectionKey);
      if (!evidence) throw new DomainError('CHAIN_OPERATION_NOT_FOUND');
      return { operationId: operation.operationId, ...evidence };
    },
  );
  app.get<{ Params: { owner: string } }>(
    '/api/v1/chain/vaults/:owner',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['owner'],
          properties: { owner: addressSchema },
        },
      },
    },
    async (request) => {
      const owner = asAddress(request.params.owner);
      if (options.syncStatus().lastAttempt === 'FAILED')
        throw new DomainError('CHAIN_PROJECTION_UNAVAILABLE');
      let projection;
      try {
        if (!options.store.checkpoint(options.chainId, options.contract))
          throw new DomainError('CHAIN_PROJECTION_UNAVAILABLE');
        projection = options.store.projection(
          options.chainId,
          owner,
          options.contract,
          options.projectionKey,
        );
      } catch (error) {
        if (error instanceof DomainError) throw error;
        throw new DomainError('CHAIN_PROJECTION_UNAVAILABLE');
      }
      if (!projection) throw new DomainError('CHAIN_PROJECTION_NOT_FOUND');
      return {
        ...projection,
        blockNumber: projection.blockNumber.toString(),
      };
    },
  );
}
