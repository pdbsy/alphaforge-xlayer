import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { root, run, cleanEnvironment } from '../ci/context.mjs';

export function verifyBytes(bytes, expected) {
  if (!/^[a-f0-9]{64}$/.test(expected) || createHash('sha256').update(bytes).digest('hex') !== expected)
    throw new Error('Scanner artifact SHA-256 mismatch');
}
export function selectPlatform(platform, arch) {
  const key = `${platform}-${arch}`;
  if (!['darwin-arm64', 'linux-x64'].includes(key)) throw new Error('Unsupported scanner host');
  return key;
}

export function scannerEnvironment(directory) {
  return {
    ...cleanEnvironment(),
    HOME: directory,
    XDG_CACHE_HOME: join(directory, 'cache'),
    SEMGREP_SEND_METRICS: 'off',
    SEMGREP_ENABLE_VERSION_CHECK: '0',
    SEMGREP_SETTINGS_FILE: join(directory, 'settings.yml'),
    OTEL_SDK_DISABLED: 'true',
    NO_COLOR: '1',
  };
}

function directory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if (!lstatSync(path).isDirectory() || realpathSync(path) !== path)
    throw new Error('Scanner installation path must not contain symlinks');
  return path;
}

export async function downloadArtifact(artifact, cache) {
  const url = new URL(artifact.url);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['github.com', 'files.pythonhosted.org'].includes(url.hostname) ||
    basename(artifact.filename) !== artifact.filename ||
    artifact.filename.includes('\\')
  )
    throw new Error('Unqualified scanner artifact location');
  const target = join(directory(cache), artifact.filename);
  if (existsSync(target)) {
    if (!lstatSync(target).isFile() || realpathSync(target) !== target)
      throw new Error('Invalid cached scanner asset');
    verifyBytes(readFileSync(target), artifact.sha256);
    return target;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (
    !response.ok ||
    !['github.com', 'release-assets.githubusercontent.com', 'files.pythonhosted.org'].includes(
      new URL(response.url).hostname,
    )
  )
    throw new Error('Scanner artifact download unavailable');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 180 * 1024 * 1024) throw new Error('Scanner artifact exceeds size limit');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  verifyBytes(bytes, artifact.sha256);
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
  renameSync(temporary, target);
  return target;
}

export async function installScanner(name) {
  if (!['semgrep', 'osv', 'gitleaks'].includes(name)) throw new Error('Unknown scanner');
  const platform = selectPlatform(process.platform, process.arch);
  const lockBytes = readFileSync(join(root, 'planning/security-scanners.lock.json'));
  const lock = JSON.parse(lockBytes);
  if (lock.schemaVersion !== 1 || lock.python !== '3.12.9') throw new Error('Unsupported scanner lock');
  const tool = lock[name];
  const selected = tool.platforms[platform];
  const base = directory(resolve(root, '.checks/security-scanners'));
  const cache = directory(join(base, 'downloads'));
  const install = mkdtempSync(join(base, `${name}-`));
  const env = scannerEnvironment(directory(join(install, 'home')));
  let binary;
  try {
    if (name === 'semgrep') {
      const probe = run(
        'python3.12',
        ['-c', 'import platform; print(platform.python_version()); print(platform.machine())'],
        { env },
      );
      if (
        probe.status !== 0 ||
        probe.stdout.trim() !== `${lock.python}\n${platform === 'darwin-arm64' ? 'arm64' : 'x86_64'}`
      )
        throw new Error('Scanner requires exact native CPython 3.12.9');
      const requirements = join(root, selected.requirements);
      if (
        !selected.requirements.startsWith('tools/security/requirements-semgrep-') ||
        resolve(requirements) !== requirements
      )
        throw new Error('Invalid scanner requirements path');
      verifyBytes(readFileSync(requirements), selected.requirementsSha256);
      if (!Array.isArray(selected.wheelFiles) || selected.wheelFiles.length < 1)
        throw new Error('Missing scanner wheel graph');
      for (const filename of selected.wheelFiles) {
        const artifact = tool.wheels[filename];
        if (artifact?.filename !== filename || !filename.endsWith('.whl'))
          throw new Error('Scanner must use qualified binary wheels');
        await downloadArtifact(artifact, cache);
      }
      const venv = join(install, 'venv');
      const create = run('python3.12', ['-m', 'venv', venv], { env });
      if (create.status !== 0 || create.signal || create.error)
        throw new Error('Scanner environment creation failed');
      const pip = run(
        join(venv, 'bin/python'),
        [
          '-m',
          'pip',
          '--isolated',
          'install',
          '--no-index',
          '--find-links',
          cache,
          '--require-hashes',
          '--only-binary=:all:',
          '-r',
          requirements,
        ],
        { env, timeout: 600000 },
      );
      if (pip.status !== 0 || pip.signal || pip.error)
        throw new Error('Hash-locked scanner installation failed');
      const check = run(join(venv, 'bin/python'), ['-m', 'pip', '--isolated', 'check'], { env });
      if (check.status !== 0 || check.signal || check.error)
        throw new Error('Incomplete scanner dependency graph');
      env.SSL_CERT_FILE = join(venv, 'lib/python3.12/site-packages/certifi/cacert.pem');
      binary = join(venv, 'bin/semgrep');
    } else {
      const asset = await downloadArtifact(selected, cache);
      binary = join(install, name);
      if (name === 'gitleaks') {
        const extracted = run('tar', ['-xOf', asset, 'gitleaks'], {
          env,
          encoding: 'buffer',
          maxBuffer: 64 * 1024 * 1024,
        });
        if (extracted.status !== 0 || extracted.signal || extracted.error)
          throw new Error('Gitleaks archive extraction failed');
        writeFileSync(binary, extracted.stdout, { flag: 'wx', mode: 0o700 });
      } else writeFileSync(binary, readFileSync(asset), { flag: 'wx', mode: 0o700 });
      chmodSync(binary, 0o700);
    }
    const probe = run(binary, [name === 'gitleaks' ? 'version' : '--version'], { env });
    const output = probe.stdout?.trim();
    if (
      probe.status !== 0 ||
      probe.signal ||
      probe.error ||
      (name === 'osv'
        ? !output.startsWith(`osv-scanner version: ${tool.version}\n`)
        : output !== tool.version)
    )
      throw new Error('Scanner executable version mismatch');
    return {
      binary,
      env,
      directory: install,
      version: tool.version,
      lockSha256: createHash('sha256').update(lockBytes).digest('hex'),
      cleanup: () => rmSync(install, { recursive: true, force: true }),
    };
  } catch {
    rmSync(install, { recursive: true, force: true });
    throw new Error(`Qualified ${name} bootstrap failed; inspect local installation prerequisites`);
  }
}
