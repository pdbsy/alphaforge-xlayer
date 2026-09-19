import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateM3DeploymentTemplate } from '../tools/check-m3-deployment-template.mjs';

const template = JSON.parse(
  await readFile(
    new URL('../contracts/deployment/m3-robinhood-testnet.template.json', import.meta.url),
    'utf8',
  ),
);

test('M3 deployment template is safe to prepare without claiming a deployment', () => {
  assert.equal(validateM3DeploymentTemplate(template), template);
});

test('M3 deployment template rejects premature deployment evidence', () => {
  const deployed = structuredClone(template);
  deployed.deploymentStatus = 'DEPLOYED';
  assert.throws(() => validateM3DeploymentTemplate(deployed), /must be NOT_DEPLOYED/);

  const addressed = structuredClone(template);
  addressed.contracts.vault.address = '0x0000000000000000000000000000000000000001';
  assert.throws(() => validateM3DeploymentTemplate(addressed), /vault.address must remain null/);

  const indexed = structuredClone(template);
  indexed.indexing.deploymentBlock = 1;
  assert.throws(() => validateM3DeploymentTemplate(indexed), /deploymentBlock must remain null/);
});

test('M3 deployment template rejects signing and network configuration', () => {
  for (const key of ['privateKey', 'mnemonic', 'rpcUrl', 'broadcast']) {
    const candidate = structuredClone(template);
    candidate[key] = key === 'broadcast' ? false : 'forbidden';
    assert.throws(
      () => validateM3DeploymentTemplate(candidate),
      /forbidden signing or network field/,
      `${key} must stay outside the offline template`,
    );
  }
});

test('M3 deployment template preserves unresolved Vault and EIP-712 gates', () => {
  const vaultAbi = structuredClone(template);
  vaultAbi.contracts.vault.constructorInputs = [];
  assert.throws(() => validateM3DeploymentTemplate(vaultAbi), /constructor inputs must remain unset/);

  const typedData = structuredClone(template);
  typedData.eip712.vaultDomainName = 'AlphaForgeVault';
  assert.throws(() => validateM3DeploymentTemplate(typedData), /EIP-712 fields must remain null/);
});

test('M3 deployment template rejects filled constructor and Vault configuration values', () => {
  const constructorValue = structuredClone(template);
  constructorValue.contracts.strategyPass.constructorInputs[0].value = 'AlphaForge Trend Pass';
  assert.throws(
    () => validateM3DeploymentTemplate(constructorValue),
    /constructor input values must remain null/,
  );

  const owner = structuredClone(template);
  owner.vaultConfig.owner = '0x0000000000000000000000000000000000000001';
  assert.throws(() => validateM3DeploymentTemplate(owner), /vaultConfig.owner must remain null/);
});

test('M3 deployment template rejects source and evidence claims before deployment', () => {
  const source = structuredClone(template);
  source.source.branch = 'macbeth02/M3-02-PROTOCOL';
  assert.throws(() => validateM3DeploymentTemplate(source), /source.branch must remain null/);

  const evidence = structuredClone(template);
  evidence.evidence.sourceRef = 'refs/heads/macbeth02/M3-02-PROTOCOL';
  assert.throws(() => validateM3DeploymentTemplate(evidence), /evidence.sourceRef must remain null/);
});
