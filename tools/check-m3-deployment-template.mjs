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
    template.contracts.vault.interfaceStatus === 'BLOCKED_PENDING_USER_DECISIONS',
    'Vault interface status must preserve the decision gate',
  );
  requireCondition(
    template.contracts.vault.constructorInputs === null,
    'Vault constructor inputs must remain unset until the ABI is frozen',
  );

  for (const field of ['deploymentBlock', 'deploymentTransactionHash', 'finalityBlocks', 'eventTopics']) {
    requireCondition(template.indexing?.[field] === null, `indexing.${field} must remain null`);
  }
  for (const value of Object.values(template.eip712 ?? {})) {
    requireCondition(value === null, 'EIP-712 fields must remain null until the final structs are frozen');
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
