// Explicit manager integration assignments; never infer privilege from a prefix.
export const MANAGER_INTEGRATIONS = Object.freeze([
  Object.freeze({ branch: 'macbeth01/m3-phase1-closeout', task: 'M3-01-PHASE1-CLOSEOUT' }),
  Object.freeze({ branch: 'macbeth01/AF-M3-CLOSEOUT', task: 'AF-M3-CLOSEOUT' }),
  Object.freeze({
    branch: 'macbeth01/m3-partial-onchain-integration',
    task: 'M3-01-PARTIAL-ONCHAIN-INTEGRATION',
  }),
]);

// Current XLayer assignments are exact tuples, separate from the historical registry.
export const XLAYER_ASSIGNMENTS = Object.freeze(
  [
    { branch: 'codex/xlayer-r2', agent: 'XLayerPM', task: 'AF-XLAYER-R2', label: 'XLayer' },
    {
      branch: 'macbeth03/xlayer-r2-adapter',
      agent: 'Macbeth03',
      task: 'AF-XLAYER-R2-03-ADAPTER',
      label: 'Macbeth03',
    },
    {
      branch: 'macbeth03/xlayer-r2-public-startup',
      agent: 'Macbeth03',
      task: 'AF-XLAYER-R2-03',
      label: 'XLayer',
      base: '1285830766bf1b410e1f4450b883e03863e2438a',
    },
    { branch: 'macbeth04/xlayer-r2-ui', agent: 'Macbeth04', task: 'AF-XLAYER-R2-04-UI', label: 'Macbeth04' },
    {
      branch: 'macbeth04/xlayer-r2-ui-corrected',
      agent: 'Macbeth04',
      task: 'AF-XLAYER-R2-04-UI',
      label: 'Macbeth04',
    },
    { branch: 'codex/xlayer-r2-contracts', agent: 'Temp-A', task: 'AF-XLAYER-R2-CONTRACTS', label: 'Temp-A' },
    {
      branch: 'codex/xlayer-r2-ci',
      agent: 'TempB',
      task: 'AF-XLAYER-R2-TEMPB',
      label: 'TempB',
      base: '653cd5ed7e97dd4286d98f220c9792a13bf5f664',
    },
    { branch: 'macbeth06/xlayer-r2-ci', agent: 'Macbeth06', task: 'AF-XLAYER-R2-06-CI', label: 'Macbeth06' },
  ].map(Object.freeze),
);
const AGENTS = [1, 2, 3, 4, 5, 6].map((number) => `Macbeth0${number}`);
const AGENT_SET = new Set(AGENTS);
const WORKSPACE_STATUSES = new Set(['NOT_STARTED', 'CONFIG_PREPARED', 'WORKSPACE_PREPARED', 'BLOCKED']);
const SESSION_STATUSES = new Set([
  'NOT_STARTED',
  'USER_ACTION_REQUIRED',
  'SESSION_CREATED',
  'SELF_CONFIRMED',
  'BLOCKED',
]);
const CONFIRMATION_STATUSES = new Set(['UNVERIFIED', 'VERIFIED']);
const COMMUNICATION_STATUSES = new Set(['UNVERIFIED', 'COMMUNICATION_VERIFIED', 'BLOCKED']);
const RUNTIME_STATUSES = new Set(['ACTIVE', 'READY', 'BLOCKED', 'IDLE']);
const LEGACY_TASK_PATTERN = /^AF-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export function agentForBranch(branch) {
  if (typeof branch !== 'string') return null;
  const assigned = XLAYER_ASSIGNMENTS.find((entry) => entry.branch === branch);
  if (assigned) return assigned.agent;
  const match = branch.match(/^(?:macbeth(0[1-6])|(0[2-6]))\//);
  return match ? `Macbeth${match[1] ?? match[2]}` : null;
}

export function taskMatchesAgent(task, agentId) {
  if (typeof task === 'string' && /^AF-XLAYER(?:-|$)/.test(task))
    return XLAYER_ASSIGNMENTS.some((entry) => entry.task === task && entry.agent === agentId);
  if (typeof task !== 'string' || !AGENT_SET.has(agentId)) return false;
  if (LEGACY_TASK_PATTERN.test(task)) return true;
  const match = task.match(/^M3-(0[1-6])-[A-Z0-9]+(?:-[A-Z0-9]+)*$/);
  return Boolean(match && `Macbeth${match[1]}` === agentId);
}

function fail(message) {
  throw new Error(`Agent identity validation failed: ${message}`);
}
function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
}

export function validateRegistry(value) {
  assertPlainObject(value, 'registry');
  if (typeof value.protocol_version !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.protocol_version))
    fail('invalid protocol_version');
  const count = { '1.0.0': 5, '1.1.0': 5, '1.2.0': 6 }[value.protocol_version];
  if (!count) fail('unsupported protocol_version');
  if (!Array.isArray(value.agents) || value.agents.length !== count)
    fail(`registry must contain exactly ${count} agents for its protocol version`);
  const seen = new Set();
  const agents = value.agents.map((agent, index) => {
    assertPlainObject(agent, `agents[${index}]`);
    if (agent.agent_id !== AGENTS[index] || !AGENT_SET.has(agent.agent_id))
      fail(`unexpected agent at index ${index}`);
    if (seen.has(agent.agent_id)) fail(`duplicate agent ${agent.agent_id}`);
    seen.add(agent.agent_id);
    if (
      agent.branch_prefix !== `${agent.agent_id.toLowerCase()}/` &&
      !(agent.agent_id !== 'Macbeth01' && agent.branch_prefix === `${agent.agent_id.slice(-2)}/`)
    )
      fail(`${agent.agent_id} has an invalid branch prefix`);
    if (!WORKSPACE_STATUSES.has(agent.workspace_status))
      fail(`${agent.agent_id} has an invalid workspace status`);
    if (!SESSION_STATUSES.has(agent.session_status)) fail(`${agent.agent_id} has an invalid session status`);
    if (!CONFIRMATION_STATUSES.has(agent.self_confirmation))
      fail(`${agent.agent_id} has an invalid confirmation status`);
    if (!COMMUNICATION_STATUSES.has(agent.communication_status))
      fail(`${agent.agent_id} has an invalid communication status`);
    if (agent.current_task !== 'NONE' && !taskMatchesAgent(agent.current_task, agent.agent_id))
      fail(`${agent.agent_id} has an invalid current task`);
    if (!RUNTIME_STATUSES.has(agent.runtime_status)) fail(`${agent.agent_id} has an invalid runtime status`);
    return { ...agent };
  });
  return { ...value, agents };
}

export function validateBootstrapIdentity(text, registry) {
  if (typeof text !== 'string' || text.length > 20_000) fail('bootstrap must be bounded text');
  const agentMatches = [...text.matchAll(/^AGENT_NAME = (\S+)$/gm)];
  const prefixMatches = [...text.matchAll(/^BRANCH_PREFIX = (\S+)$/gm)];
  if (agentMatches.length !== 1 || prefixMatches.length !== 1)
    fail('bootstrap must declare one identity and prefix');
  const agentId = agentMatches[0][1];
  const branchPrefix = prefixMatches[0][1];
  const known = validateRegistry(registry).agents.find((agent) => agent.agent_id === agentId);
  if (!known || known.branch_prefix !== branchPrefix) fail('bootstrap identity does not match registry');
  return { agentId, branchPrefix };
}

function oneMatch(text, pattern, label) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) fail(`${label} must appear exactly once`);
  return matches[0][1];
}

export function validateCommitProvenance({ subject, body }) {
  for (const [label, value] of Object.entries({ subject, body }))
    if (typeof value !== 'string' || !value.trim()) fail(`${label} is required`);
  if (
    /\[(?:XLayer|Temp-?A|TempB)\]/i.test(subject) ||
    /^Manager-ID:/im.test(body) ||
    /^Task-ID:\s*AF-XLAYER(?:-|\s*$)/im.test(body)
  ) {
    const taskId = oneMatch(body, /^Task-ID:\s*(\S+)\s*$/gm, 'commit body Task-ID');
    const profile = XLAYER_ASSIGNMENTS.find((entry) => entry.task === taskId);
    if (!profile) fail('unassigned XLayer task');
    const manager = profile.agent === 'XLayerPM';
    const agentId = oneMatch(
      body,
      manager ? /^Manager-ID:\s*(\S+)\s*$/gm : /^Agent-ID:\s*(\S+)\s*$/gm,
      'commit identity',
    );
    if (agentId !== profile.agent || (manager ? /^Agent-ID:/im : /^Manager-ID:/im).test(body))
      fail('XLayer identity does not match assignment');
    if (
      !subject.startsWith(`[${profile.label}][${taskId}] `) ||
      !subject.slice(`[${profile.label}][${taskId}] `.length).trim()
    )
      fail('XLayer subject does not match assignment');
    if ([...subject.matchAll(/\[(?:Macbeth\d{2}|XLayer|Temp-?A|TempB)\]/g)].length !== 1)
      fail('ambiguous XLayer subject identity');
    return { agentId, taskId };
  }
  const subjectAgent = oneMatch(subject, /\[(Macbeth\d{2})\]/g, 'commit subject Agent-ID');
  const bodyAgent = oneMatch(body, /^Agent-ID:\s*(\S+)\s*$/gm, 'commit body Agent-ID');
  const bodyTask = oneMatch(body, /^Task-ID:\s*(\S+)\s*$/gm, 'commit body Task-ID');
  if (!AGENT_SET.has(subjectAgent) || !AGENT_SET.has(bodyAgent)) fail('commit contains an unknown agent');
  if (!taskMatchesAgent(bodyTask, bodyAgent)) fail('commit contains an invalid task ID');
  const subjectTasks = [...subject.matchAll(/(?:\[|\()((?:AF|M3)-[A-Z0-9]+(?:-[A-Z0-9]+)*)(?:\]|\))/g)];
  if (subjectTasks.some((match) => match[1] !== bodyTask))
    fail('commit subject and trailer task IDs do not match');
  if (subjectAgent !== bodyAgent) fail('subject and body agent do not match');
  return { agentId: subjectAgent, taskId: bodyTask };
}

export function validateCommitIdentity({ branch, prTitle = null, subject, body }) {
  if (typeof branch !== 'string') fail('branch is required');
  const branchAgent = agentForBranch(branch);
  if (!branchAgent) fail('branch must use a registered worker prefix');
  const { agentId, taskId: bodyTask } = validateCommitProvenance({ subject, body });
  if (agentId !== branchAgent) fail('branch and commit agent do not match');
  const xlayer = XLAYER_ASSIGNMENTS.find((entry) => entry.branch === branch);
  if (xlayer || bodyTask.startsWith('AF-XLAYER')) {
    if (!xlayer || xlayer.agent !== agentId || xlayer.task !== bodyTask)
      fail('XLayer branch/task is not assigned');
    if (
      prTitle !== null &&
      (typeof prTitle !== 'string' ||
        !prTitle.startsWith(`[${xlayer.label}][${bodyTask}] `) ||
        !prTitle.slice(`[${xlayer.label}][${bodyTask}] `.length).trim())
    )
      fail('XLayer PR title does not match assignment');
    return { agentId, taskId: bodyTask };
  }
  if (prTitle !== null) {
    if (typeof prTitle !== 'string') fail('PR title must be text');
    const match = prTitle.match(/^\[(Macbeth\d{2})\]\[((?:AF|M3)-[A-Z0-9]+(?:-[A-Z0-9]+)*)\]\s+\S/);
    if (!match || !AGENT_SET.has(match[1])) fail('PR title does not use the required format');
    if (match[1] !== branchAgent || match[2] !== bodyTask)
      fail('PR, branch and commit metadata do not match');
  }
  return { agentId: branchAgent, taskId: bodyTask };
}

export const REGISTERED_AGENTS = Object.freeze([...AGENTS]);
