import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { delimiter, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createXLayerDeploymentTemplate } from './check-xlayer-deployment-template.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile);
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;
const parameterNames = [
  'DEPLOYER',
  'OWNER',
  'CREATOR',
  'STRATEGY_ID',
  'STRATEGY_REF',
  'PASS_NAME',
  'PASS_SYMBOL',
  'PASS_SUPPLY',
  'PASS_RECIPIENT',
  'USDT_SUPPLY',
  'USDT_RECIPIENT',
  'ETH_SUPPLY',
  'ETH_RECIPIENT',
  'BTC_SUPPLY',
  'BTC_RECIPIENT',
];

function invalid() {
  throw new Error('INVALID_XLAYER_DEPLOYMENT_INPUT');
}

function nonzeroAddress(value) {
  return typeof value === 'string' && addressPattern.test(value) && !/^0x0{40}$/i.test(value);
}

export function prepareXLayerDeployment(args, env) {
  // There is intentionally no RPC, broadcast, key or pass-through CLI capability.
  if (
    args.length !== 2 ||
    args[0] !== '--output' ||
    typeof args[1] !== 'string' ||
    !args[1].trim() ||
    args[1].includes('\0')
  )
    invalid();
  const parameters = {};
  for (const name of parameterNames) {
    const key = `AF_XLAYER_${name}`;
    const value = env[key];
    if (typeof value !== 'string') invalid();
    if (name.endsWith('_SUPPLY')) {
      if (!/^[1-9][0-9]{0,77}$/.test(value) || BigInt(value) >= 2n ** 256n) invalid();
    } else if (name === 'STRATEGY_ID' || name === 'STRATEGY_REF') {
      if (!bytes32Pattern.test(value) || /^0x0{64}$/i.test(value)) invalid();
    } else if (name === 'PASS_NAME' || name === 'PASS_SYMBOL') {
      const limit = name === 'PASS_NAME' ? 64 : 16;
      if (!/^[\x20-\x7e]+$/.test(value) || value !== value.trim() || value.length > limit) invalid();
    } else if (!nonzeroAddress(value)) invalid();
    parameters[key] = value;
  }
  return Object.freeze({
    broadcast: false,
    outputPath: resolve(args[1]),
    parameters: Object.freeze(parameters),
    args: Object.freeze([
      'script',
      'script/SimulateXLayerPhase1.s.sol:SimulateXLayerPhase1',
      '--sig',
      'run()',
      '--offline',
      '--json',
      '--config-path',
      resolve(root, 'contracts/foundry.toml'),
      '--chain',
      '1952',
    ]),
  });
}

export function buildXLayerDeploymentRecord(command, addresses) {
  if (
    !Array.isArray(addresses) ||
    addresses.length !== 6 ||
    !addresses.every(nonzeroAddress) ||
    new Set(addresses.map((a) => a.toLowerCase())).size !== 6
  )
    invalid();
  // Revalidate parameters even when this function is called without the CLI.
  const { parameters: p } = prepareXLayerDeployment(['--output', command.outputPath], command.parameters);
  const result = createXLayerDeploymentTemplate();
  result.executionMode = 'SIMULATION_ONLY';
  result.addressScope = 'LOCAL_SIMULATION_ONLY';
  result.simulatedDeployer = p.AF_XLAYER_DEPLOYER;
  const [usdt, eth, btc, pass, vault, locker] = addresses;
  const values = {
    afUsdc: [p.AF_XLAYER_USDT_SUPPLY, p.AF_XLAYER_USDT_RECIPIENT],
    afEth: [p.AF_XLAYER_ETH_SUPPLY, p.AF_XLAYER_ETH_RECIPIENT],
    afBtc: [p.AF_XLAYER_BTC_SUPPLY, p.AF_XLAYER_BTC_RECIPIENT],
    strategyPass: [
      p.AF_XLAYER_PASS_NAME,
      p.AF_XLAYER_PASS_SYMBOL,
      p.AF_XLAYER_STRATEGY_ID,
      p.AF_XLAYER_PASS_SUPPLY,
      p.AF_XLAYER_PASS_RECIPIENT,
    ],
    vault: [
      p.AF_XLAYER_OWNER,
      p.AF_XLAYER_CREATOR,
      p.AF_XLAYER_STRATEGY_ID,
      p.AF_XLAYER_STRATEGY_REF,
      pass,
      usdt,
      eth,
      btc,
    ],
    passLocker: [vault, p.AF_XLAYER_OWNER, pass],
  };
  const byRole = { afUsdc: usdt, afEth: eth, afBtc: btc, strategyPass: pass, vault, passLocker: locker };
  for (const [role, contract] of Object.entries(result.contracts)) {
    contract.address = byRole[role];
    contract.constructorInputs.forEach((input, index) => {
      input.value = values[role][index];
    });
  }
  result.vaultConfig = {
    owner: p.AF_XLAYER_OWNER,
    strategyCreator: p.AF_XLAYER_CREATOR,
    strategyId: p.AF_XLAYER_STRATEGY_ID,
    strategyRef: p.AF_XLAYER_STRATEGY_REF,
  };
  result.tokenMetadata.strategyPass.symbol = p.AF_XLAYER_PASS_SYMBOL;
  return result;
}

export function simulationAddresses(output) {
  const parsed = JSON.parse(output);
  const row = parsed?.returns?.simulated;
  if (
    parsed.success !== true ||
    row?.internal_type !== 'address[6]' ||
    typeof row.value !== 'string' ||
    !/^\[0x[0-9a-fA-F]{40}(?:, 0x[0-9a-fA-F]{40}){5}\]$/.test(row.value)
  )
    invalid();
  return row.value.slice(1, -1).split(', ');
}

export async function runXLayerPreparation(args, env) {
  const command = prepareXLayerDeployment(args, env);
  // Do not forward RPC/wallet settings, arbitrary Foundry overrides or the user's PATH.
  const childEnv = {
    PATH: [dirname(process.execPath), '/usr/bin', '/bin'].join(delimiter),
    FOUNDRY_PROFILE: 'default',
    ...command.parameters,
  };
  if (process.platform === 'win32' && process.env.SystemRoot) childEnv.SystemRoot = process.env.SystemRoot;
  const { stdout } = await exec(resolve(root, '.checks/af-chain01/toolchain/bin/forge'), command.args, {
    cwd: resolve(root, 'contracts'),
    env: childEnv,
    timeout: 60000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const record = buildXLayerDeploymentRecord(command, simulationAddresses(stdout));
  await writeFile(command.outputPath, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return record;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runXLayerPreparation(process.argv.slice(2), process.env);
    console.log('XLayer simulation record written: LOCAL_SIMULATION_ONLY / NOT_DEPLOYED.');
  } catch {
    console.error('XLAYER_SIMULATION_PREPARATION_FAILED');
    process.exitCode = 1;
  }
}
