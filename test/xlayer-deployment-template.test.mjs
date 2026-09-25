import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const moduleUrl = new URL('../tools/check-xlayer-deployment-template.mjs', import.meta.url);
const templateUrl = new URL('../contracts/deployment/m3-xlayer-testnet.template.json', import.meta.url);
let validate;
let template;

test('preparation accepts the minimal XLayer record without authorizing deployment', async () => {
  await assert.doesNotReject(async () => {
    ({ validateXLayerDeploymentTemplate: validate } = await import(moduleUrl));
    template = JSON.parse(await readFile(templateUrl, 'utf8'));
  });
  assert.equal(validate(template), template);
  assert.deepEqual(template.deploymentOrder, ['afUsdc', 'afEth', 'afBtc', 'strategyPass', 'vault']);
  assert.equal(template.contracts.passLocker.deploymentMode, 'VAULT_CONSTRUCTOR');
  assert.equal(template.tokenMetadata.afUsdc.symbol, 'USDT');
  assert.equal(template.tokenMetadata.afUsdc.decimals, 6);
});

function rejects(change) {
  const input = structuredClone(template);
  change(input);
  assert.throws(() => validate(input), /INVALID_XLAYER_DEPLOYMENT_TEMPLATE/);
}

test('preparation rejects foreign chains, deployment claims and independent Locker deployment', () => {
  assert.equal(typeof validate, 'function');
  for (const chainId of [195, 196, 46630, '1952', null])
    rejects((t) => {
      t.chainId = chainId;
    });
  for (const field of ['network', 'deploymentStatus', 'releaseStage', 'authorization'])
    rejects((t) => {
      t[field] = 'DEPLOYED';
    });
  for (const role of ['testVenue', 'swapAdapter', 'passLocker'])
    rejects((t) => {
      t.deploymentOrder.push(role);
    });
  rejects((t) => {
    t.contracts.passLocker.deploymentMode = 'DIRECT';
  });
  rejects((t) => {
    t.contracts.testVenue = t.contracts.vault;
  });
  rejects((t) => {
    t.contracts.vault.constructorInputs[5].name = 'usdt_';
  });
  rejects((t) => {
    t.contracts.afUsdc.constructorInputs[0].type = 'uint128';
  });
  rejects((t) => {
    t.contracts.afUsdc.contractName = 'AlphaForgeTestUSDC';
  });
  rejects((t) => {
    t.tokenMetadata.afUsdc.decimals = 18;
  });
});

test('every null evidence or constructor field stays unset', () => {
  assert.equal(typeof validate, 'function');
  function walk(value, path = []) {
    for (const [key, child] of Object.entries(value)) {
      const next = [...path, key];
      if (child === null)
        rejects((t) => {
          let parent = t;
          for (const part of next.slice(0, -1)) parent = parent[part];
          parent[key] = '0x1111111111111111111111111111111111111111';
        });
      else if (typeof child === 'object') walk(child, next);
    }
  }
  walk(template);
});

test('strict records reject unknown or missing properties at every object depth', () => {
  assert.equal(typeof validate, 'function');
  function walk(value, path = []) {
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v && typeof v === 'object') walk(v, [...path, i]);
      });
      return;
    }
    rejects((t) => {
      let target = t;
      for (const key of path) target = target[key];
      target.privateKey = 'must-not-be-reflected';
    });
    for (const [key, child] of Object.entries(value)) {
      rejects((t) => {
        let target = t;
        for (const part of path) target = target[part];
        delete target[key];
      });
      if (child && typeof child === 'object') walk(child, [...path, key]);
    }
  }
  walk(template);
  for (const value of [null, [], {}, '1952']) assert.throws(() => validate(value));
});

test('thresholds stay bounded while object key ordering is irrelevant', () => {
  assert.equal(typeof validate, 'function');
  for (const field of ['softReadyDepth', 'reorgSearchLimit']) {
    for (const value of [0, -1, 1.5, '3', 10001, null])
      rejects((t) => {
        t.indexing[field] = value;
      });
    const input = structuredClone(template);
    input.indexing[field] = 10000;
    assert.equal(validate(input), input);
  }
  const reversed = Object.fromEntries(Object.entries(template).reverse());
  assert.equal(validate(reversed), reversed);
});

test('checker CLI is read-only and never reflects rejected input', async () => {
  assert.equal(typeof validate, 'function');
  const before = await readFile(templateUrl);
  const result = spawnSync(process.execPath, [fileURLToPath(moduleUrl)], {
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /5 direct.*1 Vault-created.*NOT_DEPLOYED/);
  assert.deepEqual(await readFile(templateUrl), before);
  const input = structuredClone(template);
  input.rpcUrl = 'https://credential.example/secret';
  assert.throws(
    () => validate(input),
    (error) => {
      assert.equal(error.message, 'INVALID_XLAYER_DEPLOYMENT_TEMPLATE');
      assert.equal(error.input, undefined);
      assert.equal(error.cause, undefined);
      return true;
    },
  );
});
