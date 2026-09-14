import { asAddress, asBlockHash, type Address, type BlockHash } from './types.ts';

export interface DeploymentManifestExpectation {
  readonly environment: 'robinhood-chain-testnet';
  readonly chainId: 46_630;
  readonly manifestDigest: BlockHash;
  readonly contractAddress?: Address;
}

export interface DeploymentManifest {
  readonly schemaVersion: 1;
  readonly environment: 'robinhood-chain-testnet';
  readonly chainId: 46_630;
  readonly contractName: string;
  readonly contractType: string;
  readonly contractAddress: Address;
  readonly deploymentBlock: bigint;
  readonly abiVersion: string;
  readonly manifestDigest: BlockHash;
  readonly runtimeBytecodeHash: BlockHash;
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
    });
  } catch {
    return invalid();
  }
}
