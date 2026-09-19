import { createHash } from 'node:crypto';
import { asAddress, asBlockHash, type Address, type BlockHash } from './types.ts';

export interface DeploymentManifestExpectation {
  readonly environment: 'robinhood-chain-testnet';
  readonly chainId: 46_630;
  readonly manifestDigest: BlockHash;
  readonly contractAddress?: Address;
}

declare const validatedDeploymentManifest: unique symbol;

export interface DeploymentManifestDocument {
  readonly schemaVersion: 1;
  readonly environment: 'robinhood-chain-testnet';
  readonly chainId: 46_630;
  readonly contractName: string;
  readonly contractType: string;
  readonly contractAddress: Address;
  readonly deploymentBlock: string;
  readonly abiVersion: string;
  readonly runtimeBytecodeHash: BlockHash;
}

export interface DeploymentManifest extends Omit<DeploymentManifestDocument, 'deploymentBlock'> {
  readonly deploymentBlock: bigint;
  readonly manifestDigest: BlockHash;
  readonly [validatedDeploymentManifest]: true;
}

const fields = new Set([
  'schemaVersion',
  'environment',
  'chainId',
  'contractName',
  'contractType',
  'contractAddress',
  'deploymentBlock',
  'abiVersion',
  'manifestDigest',
  'runtimeBytecodeHash',
]);
const identifier = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;

function invalid(): never {
  throw new Error('INVALID_DEPLOYMENT_MANIFEST');
}

function canonicalDocument(input: DeploymentManifestDocument): DeploymentManifestDocument {
  return {
    schemaVersion: input.schemaVersion,
    environment: input.environment,
    chainId: input.chainId,
    contractName: input.contractName,
    contractType: input.contractType,
    contractAddress: input.contractAddress,
    deploymentBlock: input.deploymentBlock,
    abiVersion: input.abiVersion,
    runtimeBytecodeHash: input.runtimeBytecodeHash,
  };
}

export function deploymentManifestDigest(input: DeploymentManifestDocument): BlockHash {
  const digest = createHash('sha256')
    .update(JSON.stringify(canonicalDocument(input)), 'utf8')
    .digest('hex');
  return asBlockHash(`0x${digest}`);
}

export function validateDeploymentManifest(
  input: unknown,
  expected: DeploymentManifestExpectation,
): DeploymentManifest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== fields.size || Object.keys(value).some((key) => !fields.has(key)))
    return invalid();
  if (
    value.schemaVersion !== 1 ||
    value.environment !== expected.environment ||
    value.chainId !== expected.chainId ||
    typeof value.contractName !== 'string' ||
    !identifier.test(value.contractName) ||
    typeof value.contractType !== 'string' ||
    !identifier.test(value.contractType) ||
    typeof value.abiVersion !== 'string' ||
    !identifier.test(value.abiVersion) ||
    typeof value.deploymentBlock !== 'string' ||
    !/^(0|[1-9][0-9]*)$/.test(value.deploymentBlock)
  )
    return invalid();
  try {
    const contractAddress = asAddress(String(value.contractAddress));
    const manifestDigest = asBlockHash(String(value.manifestDigest));
    const runtimeBytecodeHash = asBlockHash(String(value.runtimeBytecodeHash));
    const computedDigest = deploymentManifestDigest({
      schemaVersion: 1,
      environment: expected.environment,
      chainId: expected.chainId,
      contractName: value.contractName,
      contractType: value.contractType,
      contractAddress,
      deploymentBlock: value.deploymentBlock,
      abiVersion: value.abiVersion,
      runtimeBytecodeHash,
    });
    if (manifestDigest.toLowerCase() !== computedDigest.toLowerCase()) return invalid();
    if (manifestDigest.toLowerCase() !== expected.manifestDigest.toLowerCase()) return invalid();
    if (expected.contractAddress && contractAddress.toLowerCase() !== expected.contractAddress.toLowerCase())
      return invalid();
    return Object.freeze({
      schemaVersion: 1,
      environment: expected.environment,
      chainId: expected.chainId,
      contractName: value.contractName,
      contractType: value.contractType,
      contractAddress,
      deploymentBlock: BigInt(value.deploymentBlock),
      abiVersion: value.abiVersion,
      manifestDigest,
      runtimeBytecodeHash,
    }) as DeploymentManifest;
  } catch {
    return invalid();
  }
}
