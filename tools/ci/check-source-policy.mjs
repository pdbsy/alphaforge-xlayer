import { lstat, realpath } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { root, git, inspect, assertUnchanged, emit, main } from './context.mjs';

export const sourcePolicy = {
  files: ['**/*.{js,mjs,ts,tsx}'],
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: { window: 'readonly', document: 'readonly', setTimeout: 'readonly', setInterval: 'readonly' },
  },
  linterOptions: { noInlineConfig: true },
  rules: {
    'no-eval': ['error', { allowIndirect: false }],
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
  },
};
export function sourceTargets(paths) {
  return paths
    .filter(
      (path) =>
        /^(apps|packages|src|tools|docs)\//.test(path) &&
        /\.(?:js|mjs|ts|tsx)$/.test(path) &&
        !path.split('/').some((part) => ['node_modules', '.checks', 'dist'].includes(part)),
    )
    .sort();
}
export async function scanSources(directory, paths) {
  if (!paths.length || paths.length > 5000 || new Set(paths).size !== paths.length)
    throw new Error('Invalid source coverage');
  let bytes = 0;
  const directoryReal = await realpath(directory);
  for (const path of paths) {
    const absolute = resolve(directory, path);
    const rel = relative(directory, absolute);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('Source escaped checkout');
    const info = await lstat(absolute);
    const actual = await realpath(absolute);
    if (!info.isFile() || actual !== resolve(directoryReal, rel) || info.size > 2 * 1024 * 1024)
      throw new Error('Source must be a bounded regular file without symlinks');
    bytes += info.size;
  }
  if (bytes > 32 * 1024 * 1024) throw new Error('Source coverage exceeds limit');
  const eslint = new ESLint({
    cwd: directory,
    overrideConfigFile: true,
    overrideConfig: [sourcePolicy],
    allowInlineConfig: false,
    ignore: false,
  });
  const results = await eslint.lintFiles(paths);
  const expected = paths.map((path) => resolve(directory, path)).sort();
  if (JSON.stringify(results.map((row) => row.filePath).sort()) !== JSON.stringify(expected))
    throw new Error('Incomplete source scan');
  const errors = results.reduce((sum, row) => sum + row.errorCount, 0);
  const warnings = results.reduce((sum, row) => sum + row.warningCount, 0);
  const fatal = results.some((row) => row.fatalErrorCount > 0);
  return {
    state: fatal ? 'BLOCKED' : errors + warnings ? 'FAIL' : 'PASS',
    files: results.length,
    bytes,
    errors,
    warnings,
    findings: results.flatMap((row) =>
      row.messages.map((message) => ({
        file: relative(directory, row.filePath),
        line: message.line,
        rule: message.ruleId,
        fatal: message.fatal === true,
      })),
    ),
  };
}
await main(import.meta.url, async () => {
  const before = inspect();
  assertUnchanged(before, before);
  const paths = sourceTargets(git('ls-files', '-z').split('\0').filter(Boolean));
  const report = await scanSources(root, paths);
  assertUnchanged(before, inspect());
  emit({
    gate: 'source-policy-js',
    ...before,
    ...report,
    boundary:
      'Four syntax rules only; no data-flow, cross-function, HTML inline script, Solidity or native dependency analysis; not CodeQL equivalent',
  });
});
