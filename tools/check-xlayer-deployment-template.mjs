import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const templateUrl = new URL('../contracts/deployment/m3-xlayer-testnet.template.json', import.meta.url);

function contract(contractName, inputs, deploymentMode = 'DIRECT') {
  return {
    contractName,
    deploymentMode,
    address: null,
    constructorInputs: inputs.map(([name, type]) => ({ name, type, value: null })),
    creationCodeHash: null,
    runtimeCodeHash: null,
    abiHash: null,
    deploymentBlock: null,
    deploymentTransactionHash: null,
  };
}

// A preparation schema, not a deployment manifest or wallet authorization.
// Keep independent of the JSON input so editing the record cannot weaken validation.
export function createXLayerDeploymentTemplate() {
  const assetInputs = [
    ['fixedSupply_', 'uint256'],
    ['recipient_', 'address'],
  ];
  return {
    schemaVersion: 1,
    deploymentStatus: 'NOT_DEPLOYED',
    releaseStage: 'PRE_RELEASE',
    chainId: 1952,
    network: 'X Layer Testnet',
    source: { repository: 'pdbsy/alphaforge-xlayer', branch: null, commit: null },
    toolchain: {
      foundry: '1.5.1',
      solc: '0.8.31',
      openzeppelinContracts: '5.4.0',
      evmVersion: 'paris',
      optimizerEnabled: false,
      viaIR: false,
      bytecodeHash: 'none',
      cborMetadata: false,
    },
    deploymentOrder: ['afUsdc', 'afEth', 'afBtc', 'strategyPass', 'vault'],
    contracts: {
      afUsdc: contract('AlphaForgeTestUSDT', assetInputs),
      afEth: contract('AlphaForgeTestETH', assetInputs),
      afBtc: contract('AlphaForgeTestBTC', assetInputs),
      strategyPass: contract('StrategyPass', [
        ['name_', 'string'],
        ['symbol_', 'string'],
        ['strategyId_', 'bytes32'],
        ['fixedSupply_', 'uint256'],
        ['recipient_', 'address'],
      ]),
      vault: contract('AlphaForgeVault', [
        ['owner_', 'address'],
        ['strategyCreator_', 'address'],
        ['strategyId_', 'bytes32'],
        ['strategyRef_', 'bytes32'],
        ['pass_', 'address'],
        ['afUsdc_', 'address'],
        ['afEth_', 'address'],
        ['afBtc_', 'address'],
      ]),
      passLocker: contract(
        'PassLocker',
        [
          ['vault_', 'address'],
          ['owner_', 'address'],
          ['pass_', 'address'],
        ],
        'VAULT_CONSTRUCTOR',
      ),
    },
    vaultConfig: { owner: null, strategyCreator: null, strategyId: null, strategyRef: null },
    tokenMetadata: {
      strategyPass: { symbol: null, decimals: 18 },
      afUsdc: { symbol: 'USDT', decimals: 6 },
      afEth: { symbol: 'AF-ETH', decimals: 18 },
      afBtc: { symbol: 'AF-BTC', decimals: 18 },
    },
    indexing: {
      deploymentBlock: null,
      deploymentTransactionHash: null,
      eventTopics: null,
      softReadyDepth: 3,
      reorgSearchLimit: 128,
      finalityStatus: 'UNKNOWN',
    },
    evidence: { sourceRef: null, manifestRef: null, snapshotRef: null },
    authorization: 'DIRECT_IMMUTABLE_OWNER',
  };
}

function invalid() {
  throw new Error('INVALID_XLAYER_DEPLOYMENT_TEMPLATE');
}

function exactShape(value, expected) {
  if (expected === null || typeof expected !== 'object') {
    if (value !== expected) invalid();
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) !== Array.isArray(expected)) invalid();
  if (Array.isArray(expected) && value.length !== expected.length) invalid();
  const keys = Object.keys(expected);
  if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) invalid();
  for (const key of keys) exactShape(value[key], expected[key]);
}

export function validateXLayerDeploymentTemplate(template) {
  const expected = createXLayerDeploymentTemplate();
  for (const field of ['softReadyDepth', 'reorgSearchLimit']) {
    const value = template?.indexing?.[field];
    if (!Number.isSafeInteger(value) || value < 1 || value > 10000) invalid();
    expected.indexing[field] = value;
  }
  exactShape(template, expected);
  return template;
}

export async function checkXLayerDeploymentTemplate() {
  validateXLayerDeploymentTemplate(JSON.parse(await readFile(templateUrl, 'utf8')));
  return { directDeployments: 5, vaultCreatedContracts: 1, deploymentStatus: 'NOT_DEPLOYED' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) invalid();
    await checkXLayerDeploymentTemplate();
    console.log('XLayer preparation validated: 5 direct deployments, 1 Vault-created Locker; NOT_DEPLOYED.');
  } catch {
    console.error('INVALID_XLAYER_DEPLOYMENT_TEMPLATE');
    process.exitCode = 1;
  }
}
