const blocked = () => ({ state: 'BLOCKED', reason: 'Scanner process, schema or coverage incomplete' });
const failedProcess = (value) => value.error || value.signal || !Number.isInteger(value.status);
const sameSet = (a, b) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const label = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= 300 && !/[\r\n\0]/.test(value);

export function decodeReport(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function classifySemgrep(value, expectedPaths, version) {
  const r = value.report;
  if (
    failedProcess(value) ||
    ![0, 1].includes(value.status) ||
    !r ||
    r.version !== version ||
    !Array.isArray(r.results) ||
    r.results.length > 2000 ||
    !Array.isArray(r.errors) ||
    r.errors.length ||
    !Array.isArray(r.paths?.scanned) ||
    !sameSet(r.paths.scanned, expectedPaths) ||
    !expectedPaths.length ||
    (r.skipped_rules?.length ?? 0) ||
    (r.time?.fixpoint_timeouts?.length ?? 0) ||
    (r.engine_requested !== undefined && r.engine_requested !== 'OSS')
  )
    return blocked();
  if (value.status !== (r.results.length ? 1 : 0)) return blocked();
  if (
    r.results.some(
      (x) =>
        !label(x.check_id) ||
        !expectedPaths.includes(x.path) ||
        !Number.isInteger(x.start?.line) ||
        x.start.line < 1,
    )
  )
    return blocked();
  return {
    state: r.results.length ? 'FAIL' : 'PASS',
    files: expectedPaths.length,
    findings: r.results.map((x) => ({ rule: x.check_id, file: x.path, line: x.start.line })),
  };
}

export function packageKey(p) {
  if (!p || !label(p.name)) throw new Error('Invalid dependency report identity');
  if (p.commit) {
    if (!/^[a-f0-9]{40}$/.test(p.commit)) throw new Error('Invalid dependency source commit');
    return `GIT:${p.name}:${p.commit}`;
  }
  if (!['npm', 'PyPI'].includes(p.ecosystem) || !label(p.version))
    throw new Error('Unidentified dependency ecosystem');
  return `${p.ecosystem}:${p.ecosystem === 'PyPI' ? p.name.toLowerCase().replace(/[-_.]+/g, '-') : p.name}:${p.version}`;
}

export function classifyOSV(value, expectedPackages) {
  const r = value.report;
  if (
    failedProcess(value) ||
    ![0, 1].includes(value.status) ||
    !r ||
    !Array.isArray(r.results) ||
    !r.results.length ||
    r.error ||
    r.errors?.length ||
    !expectedPackages.length
  )
    return blocked();
  try {
    if (r.results.some((x) => !Array.isArray(x.packages) || x.error || x.errors?.length)) return blocked();
    const rows = r.results.flatMap((x) => x.packages);
    if (
      !sameSet(
        rows.map((x) => packageKey(x.package)),
        expectedPackages.map(packageKey),
      )
    )
      return blocked();
    const findings = [];
    for (const row of rows) {
      if (row.vulnerabilities !== undefined && !Array.isArray(row.vulnerabilities)) return blocked();
      for (const advisory of row.vulnerabilities ?? []) {
        if (!label(advisory.id)) return blocked();
        findings.push({ package: packageKey(row.package), advisory: advisory.id });
      }
    }
    if (findings.length > 2000 || value.status !== (findings.length ? 1 : 0)) return blocked();
    return { state: findings.length ? 'FAIL' : 'PASS', packages: rows.length, findings };
  } catch {
    return blocked();
  }
}

export function classifyGitleaks(value) {
  const rows = value.report;
  if (
    failedProcess(value) ||
    ![0, 10].includes(value.status) ||
    !Array.isArray(rows) ||
    rows.length > 2000 ||
    value.status !== (rows.length ? 10 : 0)
  )
    return blocked();
  if (
    rows.some(
      (x) =>
        !label(x.RuleID) ||
        !label(x.File) ||
        !Number.isInteger(x.StartLine) ||
        x.StartLine < 1 ||
        (x.Commit && !/^[a-f0-9]{40}$/.test(x.Commit)),
    )
  )
    return blocked();
  return {
    state: rows.length ? 'FAIL' : 'PASS',
    findings: rows.map((x) => ({
      rule: x.RuleID,
      file: x.File,
      line: x.StartLine,
      commit: x.Commit || null,
    })),
  };
}
