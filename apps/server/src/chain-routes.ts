import type { FastifyInstance } from 'fastify';
import { DomainError } from '../../../packages/domain/src/vault.ts';
import { asAddress, sameAddress, type Address } from '../../../packages/chain-adapter/src/types.ts';
import type { ChainStore } from './chain-store.ts';

export interface ChainEvidenceRoutesOptions {
  readonly store: ChainStore;
  readonly chainId: number;
  readonly contract: Address;
  readonly projectionKey: string;
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
