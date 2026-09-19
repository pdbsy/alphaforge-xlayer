import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = resolve(repositoryRoot, 'contracts/deployment/m3-robinhood-testnet.template.json');

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Invalid M3 deployment template: ${message}`);
}

function visit(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    requireCondition(
      !/(?:private.?key|mnemonic|rpc.?url|broadcast|raw.?transaction|signed.?transaction)/iu.test(key),
      `${path}.${key} is a forbidden signing or network field`,
    );
    visit(item, `${path}.${key}`);
  }
}

export function validateM3DeploymentTemplate(template) {
  requireCondition(template && typeof template === 'object', 'root must be an object');
  requireCondition(template.schemaVersion === 1, 'schemaVersion must be 1');
  requireCondition(template.deploymentStatus === 'NOT_DEPLOYED', 'deploymentStatus must be NOT_DEPLOYED');
  requireCondition(template.chainId === 46630, 'chainId must be 46630');
  requireCondition(template.network === 'Robinhood Chain Testnet', 'network identity is incorrect');
  for (const field of ['branch', 'commit']) {
    requireCondition(template.source?.[field] === null, `source.${field} must remain null before deployment`);
  }

  const expectedContracts = [
    'strategyPass',
    'afUsdc',
    'afEth',
    'afBtc',
    'testVenue',
    'swapAdapter',
    'vault',
    'passLocker',
  ];
  requireCondition(
    JSON.stringify(Object.keys(template.contracts ?? {})) === JSON.stringify(expectedContracts),
    'contracts must contain the complete ordered M3 deployment set',
  );
  for (const [name, contract] of Object.entries(template.contracts)) {
    for (const field of ['address', 'creationCodeHash', 'runtimeCodeHash', 'abiHash']) {
      requireCondition(contract[field] === null, `contracts.${name}.${field} must remain null`);
    }
    if (Array.isArray(contract.constructorInputs)) {
      requireCondition(
        contract.constructorInputs.every((input) => input.value === null),
        `contracts.${name} constructor input values must remain null`,
      );
    }
  }
  requireCondition(
    template.contracts.vault.interfaceStatus === 'IMPLEMENTED_LOCAL_ONLY',
    'Vault interface must identify local implementation, not deployment',
  );
  const constructors = {
    strategyPass: [
      ['name_', 'string'],
      ['symbol_', 'string'],
      ['strategyId_', 'bytes32'],
      ['fixedSupply_', 'uint256'],
      ['recipient_', 'address'],
    ],
    vault: [
      ['owner_', 'address'],
      ['strategyCreator_', 'address'],
      ['strategyId_', 'bytes32'],
      ['strategyRef_', 'bytes32'],
      ['pass_', 'address'],
      ['afUsdc_', 'address'],
      ['afEth_', 'address'],
      ['afBtc_', 'address'],
    ],
  };
  for (const [name, expected] of Object.entries(constructors)) {
    const inputs = template.contracts[name].constructorInputs;
    requireCondition(
      Array.isArray(inputs) &&
        JSON.stringify(inputs.map(({ name: field, type }) => [field, type])) === JSON.stringify(expected),
      `contracts.${name} constructor shape must match the implemented ABI`,
    );
  }
  requireCondition(
    template.authorization === 'DIRECT_IMMUTABLE_OWNER' && !('eip712' in template),
    'business signatures are excluded',
  );
  requireCondition(
    JSON.stringify(Object.keys(template.vaultConfig ?? {})) ===
      JSON.stringify(['owner', 'strategyCreator', 'strategyId', 'strategyRef']),
    'vaultConfig fields must match the direct immutable owner model',
  );
  for (const field of ['deploymentBlock', 'deploymentTransactionHash', 'eventTopics']) {
    requireCondition(template.indexing?.[field] === null, `indexing.${field} must remain null`);
  }
  requireCondition(
    template.indexing?.finalityStatus === 'UNKNOWN' && !('finalityBlocks' in template.indexing),
    'finality must remain unknown',
  );
  for (const field of ['softReadyDepth', 'reorgSearchLimit']) {
    const value = template.indexing?.[field];
    requireCondition(
      Number.isSafeInteger(value) && value >= 1 && value <= 10_000,
      `indexing.${field} must be a bounded configurable threshold`,
    );
  }
  for (const [field, value] of Object.entries(template.vaultConfig ?? {})) {
    requireCondition(value === null, `vaultConfig.${field} must remain null`);
  }
  for (const [field, value] of Object.entries(template.evidence ?? {})) {
    requireCondition(value === null, `evidence.${field} must remain null`);
  }

  visit(template);
  return template;
}

export async function checkM3DeploymentTemplate() {
  const template = JSON.parse(await readFile(templatePath, 'utf8'));
  validateM3DeploymentTemplate(template);
  return { contracts: Object.keys(template.contracts).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkM3DeploymentTemplate();
    console.log(
      `M3 deployment template passed: ${result.contracts} contracts remain explicitly NOT_DEPLOYED.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
