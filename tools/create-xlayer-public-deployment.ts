import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { validateDeploymentManifest } from '../packages/chain-adapter/src/manifest.ts';
import { asBlockHash } from '../packages/chain-adapter/src/types.ts';
import {
  validateXLayerPublicDeployment,
  type XLayerPublicDeployment,
} from '../apps/server/src/xlayer-public-config.ts';

const maximumBytes = 262_144;

function readManifest(path: string): unknown {
  if (!lstatSync(path).isFile()) throw new Error();
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > maximumBytes) throw new Error();
    const bytes = Buffer.alloc(maximumBytes + 1);
    let count = 0;
    while (count < bytes.length) {
      const size = readSync(fd, bytes, count, bytes.length - count, null);
      if (!size) break;
      count += size;
    }
    if (count > maximumBytes) throw new Error();
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, count)));
  } finally {
    closeSync(fd);
  }
}

/** Offline format conversion only. Independent review of deployment facts is a prerequisite. */
export function createXLayerPublicDeployment(options: {
  readonly manifestPath: string;
  readonly outputPath: string;
}): XLayerPublicDeployment {
  try {
    const input = readManifest(options.manifestPath);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
    const manifest = validateDeploymentManifest(input, {
      environment: 'xlayer-testnet',
      chainId: 1952,
      manifestDigest: asBlockHash(String((input as Record<string, unknown>).manifestDigest)),
    });
    const record = validateXLayerPublicDeployment({
      source: 'reviewed-deployment-manifest',
      chainId: 1952,
      vaultAddress: manifest.contractAddress,
      deploymentBlock: manifest.deploymentBlock.toString(),
      abiVersion: manifest.abiVersion,
      abiHash: manifest.abiHash,
      manifestDigest: manifest.manifestDigest,
      runtimeBytecodeHash: manifest.runtimeBytecodeHash,
      strategyPassAddress: manifest.strategyPassAddress,
      strategyPassDeploymentBlock: manifest.strategyPassDeploymentBlock.toString(),
      strategyPassAbiHash: manifest.strategyPassAbiHash,
      strategyPassRuntimeBytecodeHash: manifest.strategyPassRuntimeBytecodeHash,
    });
    writeFileSync(options.outputPath, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return record;
  } catch {
    throw new Error('XLAYER_PUBLIC_DEPLOYMENT_FAILED');
  }
}

function main() {
  try {
    const { values, tokens } = parseArgs({
      options: { manifest: { type: 'string' }, output: { type: 'string' } },
      strict: true,
      allowPositionals: false,
      tokens: true,
    });
    if (!values.manifest || !values.output || tokens.length !== 2) throw new Error();
    createXLayerPublicDeployment({ manifestPath: values.manifest, outputPath: values.output });
    console.log('XLAYER_PUBLIC_DEPLOYMENT_CREATED');
  } catch {
    console.error('XLAYER_PUBLIC_DEPLOYMENT_FAILED');
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
