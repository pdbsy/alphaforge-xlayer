import {
  validateDeploymentManifest,
  type DeploymentManifestDocument,
} from '../../../packages/chain-adapter/src/manifest.ts';
import { M3_VAULT_ABI_HASH, M3_VAULT_ABI_VERSION } from '../../../packages/chain-adapter/src/vault-abi.ts';
import { M3_STRATEGY_PASS_ABI_HASH } from '../../../packages/chain-adapter/src/pass-abi.ts';
import {
  asAddress,
  asBlockHash,
  type Address,
  type BlockHash,
} from '../../../packages/chain-adapter/src/types.ts';

export type XLayerPublicDeployment = Omit<
  DeploymentManifestDocument,
  'schemaVersion' | 'environment' | 'chainId' | 'contractName' | 'contractType' | 'contractAddress'
> & {
  readonly source: 'reviewed-deployment-manifest';
  readonly chainId: 1952;
  readonly vaultAddress: Address;
  readonly manifestDigest: BlockHash;
  readonly passInitialSupplyBaseUnits?: string;
  readonly passInitialRecipient?: Address;
};

export function validateXLayerPublicDeployment(input: XLayerPublicDeployment): XLayerPublicDeployment {
  const allowed = new Set([
    'source',
    'chainId',
    'vaultAddress',
    'deploymentBlock',
    'abiVersion',
    'abiHash',
    'manifestDigest',
    'runtimeBytecodeHash',
    'strategyPassAddress',
    'strategyPassDeploymentBlock',
    'strategyPassAbiHash',
    'strategyPassRuntimeBytecodeHash',
    'passInitialSupplyBaseUnits',
    'passInitialRecipient',
  ]);
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.has(key)) ||
    input.source !== 'reviewed-deployment-manifest' ||
    input.chainId !== 1952 ||
    input.abiVersion !== M3_VAULT_ABI_VERSION ||
    input.abiHash !== M3_VAULT_ABI_HASH ||
    input.strategyPassAbiHash !== M3_STRATEGY_PASS_ABI_HASH ||
    /^0x0{64}$/i.test(input.runtimeBytecodeHash) ||
    /^0x0{64}$/i.test(input.strategyPassRuntimeBytecodeHash)
  )
    throw new Error('INVALID_PUBLIC_DEPLOYMENT');
  const { vaultAddress, source, passInitialSupplyBaseUnits, passInitialRecipient, ...fields } = input;
  validateDeploymentManifest(
    {
      ...fields,
      schemaVersion: 1,
      environment: 'xlayer-testnet',
      contractName: 'AlphaForgeVault',
      contractType: 'vault',
      contractAddress: vaultAddress,
    },
    {
      environment: 'xlayer-testnet',
      chainId: 1952,
      manifestDigest: asBlockHash(input.manifestDigest),
      contractAddress: asAddress(vaultAddress),
    },
  );
  if ((passInitialSupplyBaseUnits === undefined) !== (passInitialRecipient === undefined))
    throw new Error('INVALID_PUBLIC_DEPLOYMENT');
  if (
    passInitialSupplyBaseUnits !== undefined &&
    passInitialRecipient !== undefined &&
    (!/^[1-9][0-9]{0,77}$/.test(passInitialSupplyBaseUnits) ||
      BigInt(passInitialSupplyBaseUnits) >= 2n ** 256n ||
      /^0x0{40}$/i.test(asAddress(passInitialRecipient)))
  )
    throw new Error('INVALID_PUBLIC_DEPLOYMENT');
  return Object.freeze({
    source,
    ...fields,
    vaultAddress,
    ...(passInitialSupplyBaseUnits === undefined
      ? {}
      : { passInitialSupplyBaseUnits, passInitialRecipient: passInitialRecipient! }),
  });
}
