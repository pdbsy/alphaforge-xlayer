const version = /^[0-9][A-Za-z0-9.!+_-]*$/;
const canonicalPython = (name) => name.toLowerCase().replace(/[-_.]+/g, '-');
export function parsePythonLock(text) {
  const packages = [];
  const names = new Set();
  for (const line of text.split(/\r?\n/).map((s) => s.trim())) {
    if (!line || line.startsWith('#')) continue;
    const match =
      /^([A-Za-z0-9][A-Za-z0-9_.-]*)==([0-9][A-Za-z0-9.!+_-]*) --hash=sha256:([a-f0-9]{64})$/.exec(line);
    if (!match) throw new Error('Python inventory requires exact hash-locked binary packages');
    const name = canonicalPython(match[1]);
    if (names.has(name)) throw new Error('Duplicate Python package pin');
    names.add(name);
    packages.push({ ecosystem: 'PyPI', name, version: match[2] });
  }
  if (!packages.length) throw new Error('Empty Python inventory');
  return packages;
}

export function buildInventory({ npmLock, pythonLocks, contractLock }) {
  if (
    npmLock.lockfileVersion !== 3 ||
    !npmLock.packages ||
    !Array.isArray(pythonLocks) ||
    !pythonLocks.length
  )
    throw new Error('Missing resolved dependency graphs');
  const packages = [];
  let npmEntries = 0;
  for (const [path, entry] of Object.entries(npmLock.packages)) {
    if (path === '') continue;
    const name = entry.name ?? path.split('node_modules/').at(-1);
    if (
      !path.includes('node_modules/') ||
      !/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name) ||
      !version.test(entry.version ?? '') ||
      entry.link
    )
      throw new Error('Unresolved npm inventory entry');
    packages.push({ ecosystem: 'npm', name, version: entry.version });
    npmEntries++;
  }
  if (!npmEntries) throw new Error('Empty npm graph');
  let pythonEntries = 0;
  for (const text of pythonLocks) {
    const graph = parsePythonLock(text);
    pythonEntries += graph.length;
    packages.push(...graph);
  }
  if (
    !version.test(contractLock.openzeppelin?.version ?? '') ||
    !version.test(contractLock.foundry?.version ?? '') ||
    !/^[a-f0-9]{40}$/.test(contractLock.foundry?.commit ?? '') ||
    !version.test(contractLock.solc?.version ?? '')
  )
    throw new Error('Incomplete custom contract toolchain inventory');
  packages.push(
    { ecosystem: 'npm', name: '@openzeppelin/contracts', version: contractLock.openzeppelin.version },
    { ecosystem: 'npm', name: '@foundry-rs/forge-darwin-arm64', version: contractLock.foundry.version },
    { name: 'https://github.com/foundry-rs/foundry', commit: contractLock.foundry.commit },
  );
  const unique = new Map(packages.map((p) => [JSON.stringify(p), p]));
  return {
    packages: [...unique.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en')),
    npmEntries,
    pythonEntries,
    unmapped: [
      {
        name: 'solc',
        version: contractLock.solc.version,
        reason: 'Native compiler is not an npm/PyPI package',
      },
      {
        name: 'scanner Go binaries and embedded libraries',
        reason: 'Release integrity verified; transitive binary advisory coverage not asserted',
      },
      {
        name: 'GitHub Actions and Node/Python runtimes',
        reason: 'Separate fixed runtime/action qualification, outside this package inventory',
      },
    ],
  };
}

export function scannerTargets(paths) {
  if (
    paths.some(
      (p) => p.startsWith('/') || p.split('/').some((s) => ['..', '.'].includes(s)) || p.includes('\\'),
    )
  )
    throw new Error('Source path escaped checkout');
  const targets = paths
    .filter(
      (path) =>
        /\.(?:js|mjs|cjs|jsx|ts|tsx|py)$/.test(path) &&
        !path
          .split('/')
          .some((p) => ['test', 'tests', 'node_modules', '.checks', 'dist', 'build'].includes(p)),
    )
    .sort();
  if (!targets.length || targets.length > 5000 || new Set(targets).size !== targets.length)
    throw new Error('Invalid Semgrep source coverage');
  return targets;
}
