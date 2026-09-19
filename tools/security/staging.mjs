import { createHash } from 'node:crypto';
import { lstatSync, realpathSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';

export function stageSources(source, destination, paths) {
  if (!paths.length || paths.length > 5000 || new Set(paths).size !== paths.length)
    throw new Error('Invalid scan coverage');
  const actualRoot = realpathSync(source),
    digest = createHash('sha256');
  let bytes = 0;
  for (const path of paths) {
    const file = resolve(source, path),
      rel = relative(source, file);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('Scan target escaped checkout');
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024 || realpathSync(file) !== resolve(actualRoot, rel))
      throw new Error('Scan input must be a bounded regular file without symlinks');
    const data = readFileSync(file);
    bytes += data.length;
    if (bytes > 64 * 1024 * 1024 || data.includes(0))
      throw new Error('Unsupported scan input encoding or size');
    digest.update(path).update('\0').update(data).update('\0');
    const output = resolve(destination, rel);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, data, { flag: 'wx', mode: 0o600 });
  }
  return { files: paths.length, bytes, sourceSha256: digest.digest('hex') };
}
