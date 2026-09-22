import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildApp } from '../apps/server/src/app.ts';
import { M3ChainRuntime } from '../apps/server/src/m3-chain-runtime.ts';
import {
  deploymentManifestDigest,
  validateDeploymentManifest,
} from '../packages/chain-adapter/src/manifest.ts';
import { M3_VAULT_ABI_VERSION } from '../packages/chain-adapter/src/vault-abi.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';

// Synthetic evidence in a temporary database; no deployed contract or wallet is used.
const OWNER = `0x${'11'.repeat(20)}`;
const VAULT = `0x${'22'.repeat(20)}`;
const OTHER = `0x${'33'.repeat(20)}`;
const TX = `0x${'44'.repeat(32)}`;
const body = {
  schemaVersion: 1,
  environment: 'xlayer-testnet',
  chainId: 1952,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: VAULT,
  deploymentBlock: '1',
  abiVersion: M3_VAULT_ABI_VERSION,
  runtimeBytecodeHash: `0x${'55'.repeat(32)}`,
};
const manifestDigest = deploymentManifestDigest(body);

for (const [scenario, chainId, target, owner, expectedStatus] of [
  ['matching chain and vault', 1952, VAULT, OWNER, 200],
  ['foreign chain with same owner and vault', 46630, VAULT, OWNER, 404],
  ['foreign vault with same owner and chain', 1952, OTHER, OWNER, 404],
  ['foreign owner', 1952, VAULT, OTHER, 404],
]) {
  test(`X Layer evidence GET scopes ${scenario}`, { timeout: 5000 }, async (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-qa-api-'));
    let runtime, app;
    t.after(async () => {
      try {
        if (app) await app.close();
      } finally {
        try {
          runtime?.close();
        } finally {
          rmSync(directory, { recursive: true, force: true });
        }
      }
    });
    const manifest = validateDeploymentManifest(
      { ...body, manifestDigest },
      { environment: 'xlayer-testnet', chainId: 1952, manifestDigest, contractAddress: VAULT },
    );
    const unexpectedRpc = async () => {
      throw new Error('unexpected RPC in offline route test');
    };
    runtime = new M3ChainRuntime({
      dbPath: join(directory, 'chain.sqlite'),
      manifest,
      rpc: {
        chainId: unexpectedRpc,
        block: unexpectedRpc,
        receipt: unexpectedRpc,
        logs: unexpectedRpc,
        call: unexpectedRpc,
      },
    });
    runtime.store.saveOperation(
      transitionOperation(
        createOperation({
          operationId: 'qa-route-control',
          chainId: 1952,
          target: VAULT,
          owner: OWNER,
          state: 'AWAITING_SIGNATURE',
        }),
        { state: 'SUBMITTED', txHash: `0x${'66'.repeat(32)}`, submittedAt: '2026-09-22T00:00:00.000Z' },
      ),
    );
    runtime.store.saveOperation(
      transitionOperation(
        createOperation({
          operationId: 'qa-evidence',
          chainId,
          target,
          owner,
          state: 'AWAITING_SIGNATURE',
        }),
        { state: 'SUBMITTED', txHash: TX, submittedAt: '2026-09-22T00:00:00.000Z' },
      ),
    );
    ({ app } = await buildApp({
      dbPath: join(directory, 'ledger.sqlite'),
      env: { QP_MODE: 'local', QP_ADAPTER: 'mock' },
      origin: 'http://127.0.0.1:4180',
      chainRuntime: runtime,
    }));
    const control = await app.inject({
      url: `/api/v1/chain/operations/qa-route-control/evidence?owner=${OWNER}`,
      headers: { host: '127.0.0.1:4180' },
    });
    assert.equal(control.statusCode, 200);
    assert.equal(control.json().operationId, 'qa-route-control');
    const response = await app.inject({
      url: `/api/v1/chain/operations/qa-evidence/evidence?owner=${OWNER}`,
      headers: { host: '127.0.0.1:4180' },
    });
    assert.equal(response.statusCode, expectedStatus);
    if (expectedStatus === 404) assert.equal(response.json().error, 'CHAIN_OPERATION_NOT_FOUND');
    else assert.equal(response.json().operationId, 'qa-evidence');
  });
}
