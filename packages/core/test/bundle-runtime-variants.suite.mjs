import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadBundle, readDescriptor, renderBundleOutputs, renderBundleOutputsWithConfig } from '../src/work/bundle.mjs';
import { createWorkflowRoleLauncher } from '../src/work/orchestrator.mjs';
import { synthesizeBundleConfig } from '../src/work/bundle-synthesis.mjs';

const runtimes = ['claude', 'codex'];
const portable = value => value.replaceAll('\\', '/');
const output = (outputs, name) => outputs.find(item => portable(item.path) === name);
const procedurePath = (runtime, id) => runtime === 'codex' ? `.agents/skills/aof-${id}/SKILL.md` : `.claude/commands/aof/${id}.md`;
const command = (id, body, extra = {}) => ({ kind: 'command', id, name: id, runtimes: ['claude'], commandNamespace: 'aof', body, ...extra });
const bundle = resources => ({ resources, templates: [], assets: [], hooks: [] });
const catalog = model => ({ models: [{ id: model, model, isDefault: true, supportedReasoningEfforts: ['high', 'xhigh'] }] });
const provider = (runtime, launch) => ({ launch, independentRoles: true, modelSelection: true, effortSelection: true,
  roles: ['aof-qa', 'aof-architect'],
  capabilities: catalog(runtime === 'codex' ? 'native-codex' : 'opus') });
const fixture = async fn => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aof-variants-'));
  try { return await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
};
const caseOf = (name, run) => ({ name: `154/05 ${name}`, run });
const highRisk = {
  refine: [/decisions/i, /examples/i, /contracts/i, /final review|single review|consolidated review/i],
  continue: [/scope/i, /tests|test gate/i, /independent review|independent reviewer|spawned reviewer/i, /bound/i],
  verify: [/evidence/i, /accept/i, /Blocker/i],
  review: [/independent/i, /rereview|re-review/i, /round/i],
  repair: [/hand.?over/i, /diagnos/i, /bound/i],
  retrospective: [/memory recall/i, /memory ingest/i, /near-miss/i, /Owner/i],
  delegate: [/primary/i, /optional|delegation/i, /runtime/i]
};

export const bundleRuntimeVariantTests = [
  caseOf('00 E2 common → bundled variant → project override stays runtime-local', () => {
    const source = command('helper', 'common contract', { runtimeVariants: {
      claude: { body: 'bundled Claude body' }, codex: { body: 'native Codex contract' }
    } });
    const original = structuredClone(source);
    const outputs = renderBundleOutputsWithConfig(bundle([source]), { resources: [
      { id: 'helper', kind: 'command', overrides: { claude: { body: 'project final' } } }
    ] }, { runtimes });
    assert.match(output(outputs, procedurePath('claude', 'helper')).content, /project final/u);
    assert.doesNotMatch(output(outputs, procedurePath('claude', 'helper')).content, /native Codex/u);
    assert.match(output(outputs, procedurePath('codex', 'helper')).content, /native Codex contract/u);
    assert.doesNotMatch(output(outputs, procedurePath('codex', 'helper')).content, /project final|bundled Claude/u);
    assert.deepEqual(source, original, 'resolution must not mutate authored common data');
  }),
  ...[
    ['another procedure', '{{procedures.helper}}', '.claude/commands/aof/helper.md', '.agents/skills/aof-helper/SKILL.md'],
    ['a reviewer role', '{{roles.reviewer}}', '.claude/agents/reviewer.md', '.codex/agents/reviewer.toml'],
    ['a supporting reference', '{{references.contract}}', '.claude/aof/workflows/contract.md', '.codex/aof/workflows/contract.md'],
    ['an attached skill file', '{{files.note.md}}', '.claude/commands/aof/note.md', 'note.md']
  ].map(([target, placeholder, claude, codex]) => caseOf(`00 typed reference row: ${target}`, () => {
    const loaded = bundle([
      command('caller', `Read ${placeholder}`, { runtimeVariants: { claude: {}, codex: {} },
        associatedFiles: [{ path: 'note.md', content: 'attached evidence' }] }),
      command('helper', 'helper'), { kind: 'agent', id: 'reviewer', body: 'review only', runtimes }
    ]);
    loaded.workflows = [{ id: 'contract', body: 'support contract', runtimes }];
    const outputs = renderBundleOutputs(loaded, { runtimes });
    for (const [runtime, expected] of [['claude', claude], ['codex', codex]]) {
      const entry = output(outputs, procedurePath(runtime, 'caller'));
      assert.ok(entry.content.includes(expected), `${runtime} names the actual target ${expected}`);
      const native = target === 'an attached skill file' && runtime === 'codex'
        ? portable(path.join(path.dirname(entry.path), expected)) : expected;
      assert.ok(output(outputs, native), `referenced target is actually in the plan: ${native}`);
      assert.doesNotMatch(entry.content, /\{\{/u);
    }
  })),
  caseOf('00 missing file/section/runtime and conflicting target refuse before installation', async () => {
    const descriptor = readDescriptor();
    for (const variant of [{ file: 'variants/codex/missing.md' }, { file: 'variants/codex/workflow.md', section: 'missing' }]) {
      const bad = structuredClone(descriptor);
      const refine = bad.members.find(item => item.id === 'refine');
      refine.variants.codex = variant;
      assert.throws(() => loadBundle({ descriptor: bad }), /refine \(codex\)/u);
    }
    const absent = command('missing', 'common', { runtimeVariants: { claude: {} } });
    assert.throws(() => renderBundleOutputs(bundle([absent]), { runtimes }), /missing.*codex/u);
    assert.throws(() => renderBundleOutputs(bundle([command('collision', 'one'), command('collision', 'two')]), { runtimes }), /collision.*claude/u);
    await fixture(async root => {
      await assert.rejects(() => synthesizeBundleConfig(bundle([absent]), { runtimes, targetDir: root }), /missing.*codex/u);
      await assert.rejects(() => synthesizeBundleConfig(bundle([command('collision', 'one'), command('collision', 'two')]), { runtimes, targetDir: root }), /claude[\s\S]*collision/u);
      await assert.rejects(() => readFile(path.join(root, '.agents/skills/aof-missing/SKILL.md')), /ENOENT/u);
    });
  }),
  caseOf('01 E1 refine entry and its own declared references give native invocation/question handling', () => {
    const outputs = renderBundleOutputs(loadBundle(), { runtimes: ['codex'] });
    const entry = output(outputs, procedurePath('codex', 'refine'));
    const procedure = output(outputs, '.agents/skills/aof-refine/procedure.md');
    const contract = output(outputs, '.codex/aof/workflows/workflow-contract.md');
    for (const item of [entry, procedure, contract]) {
      assert.ok(item, 'every declared supporting document is rendered');
      assert.doesNotMatch(item.content, /\/aof:|(?<!\w)\/effort|AskUserQuestion|SlashCommand/u);
    }
    assert.match(entry.content, /\$aof-refine/u);
    assert.match(entry.content, /Arguments:.*--solo \| --orchestrated/u);
    assert.match(entry.content, /native question tool/u);
    assert.match(entry.content, /Required answers remain pending/u);
    assert.match(procedure.content, /example map|example-map/u);
    assert.match(entry.content + procedure.content + contract.content, /scope[\s\S]*ownership[\s\S]*review/is);
  }),
  ...Object.entries(highRisk).map(([id, obligations]) => caseOf(`01 high-risk row: ${id}`, () => {
    const outputs = renderBundleOutputs(loadBundle(), { runtimes });
    for (const runtime of runtimes) {
      const entry = output(outputs, procedurePath(runtime, id));
      assert.ok(entry);
      const own = runtime === 'codex' ? output(outputs, `.agents/skills/aof-${id}/procedure.md`) : null;
      const contract = runtime === 'codex' ? output(outputs, '.codex/aof/workflows/workflow-contract.md') : null;
      if (runtime === 'codex') assert.ok(own && contract, 'entry has only its own procedure and shared contract');
      // Claude's review explicitly declares continue's related ladder as its supporting source.
      const related = runtime === 'claude' && id === 'review' ? output(outputs, procedurePath(runtime, 'continue')).content : '';
      const context = [entry.content, own?.content, contract?.content, related].filter(Boolean).join('\n');
      for (const obligation of obligations) assert.match(context, obligation, `${runtime}:${id} obligation ${obligation}`);
      if (runtime === 'codex') {
        assert.ok(entry.content.includes('Read procedure.md'));
        assert.doesNotMatch(own.content, /\.codex\/skills\/|\.claude\/commands\/|\/aof:|(?<!\w)\/effort/u);
      }
    }
  })),
  caseOf('01 full shipped prompt audit covers every descriptor role/procedure/skill honestly', async () => {
    const audit = await readFile('wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/PROMPT-AUDIT.md', 'utf8');
    const members = readDescriptor().members.filter(item => ['agent', 'command', 'skill'].includes(item.kind));
    assert.equal(members.length, 43);
    for (const member of members) {
      const row = audit.split('\n').filter(line => line.startsWith(`| ${member.kind}:${member.id} |`));
      assert.equal(row.length, 1, `exactly one decision for ${member.id}`);
      assert.match(row[0], /\| (keep|adapt|extract) \|/u);
      assert.equal(row[0].split('|').length, 9, 'decision, reason, tools, permissions, context and files are recorded');
    }
    assert.match(audit, /NOT correctness/u);
    assert.match(audit, /later repeated behavioral evaluations/u);
  }),
  ...['claude', 'codex'].flatMap(primary => ['off', 'on'].map(delegation => caseOf(`02 primary ${primary}; delegation ${delegation}`, async () => {
    const calls = [];
    const profiles = Object.fromEntries(runtimes.map(runtime => [runtime, provider(runtime, async request => { calls.push(request); return request.runtime; })]));
    const launch = createWorkflowRoleLauncher({ work: { agents: { delegation } } }, { profiles, bound: 2 });
    assert.equal(await launch({ primary, role: 'aof-qa' }), primary);
    assert.equal(calls.length, 1);
    const other = primary === 'claude' ? 'codex' : 'claude';
    await assert.rejects(() => launch({ primary, role: 'aof-qa', crossRuntime: other }), /separate request/u);
    if (delegation === 'on') assert.equal(await launch({ primary, role: 'aof-qa', crossRuntime: other, delegationRequested: true }), other);
    else await assert.rejects(() => launch({ primary, role: 'aof-qa', crossRuntime: other, delegationRequested: true }), /enabled delegation/u);
    assert.equal(calls[0].runtime, primary, 'toggle never changes a native role target');
  }))),
  caseOf('02 missing independent capability refuses before launch or independent-review claim', async () => {
    let calls = 0;
    const profile = provider('codex', async () => { calls += 1; });
    profile.independentRoles = false;
    const launch = createWorkflowRoleLauncher({}, { profiles: { codex: profile }, bound: 1 });
    await assert.rejects(() => launch({ primary: 'codex', role: 'aof-qa' }), error => error.code === 'native-role-capability-unavailable' && /self-review is not independent/u.test(error.message));
    assert.equal(calls, 0);
    profile.independentRoles = true; profile.roles = ['aof-architect'];
    await assert.rejects(() => launch({ primary: 'codex', role: 'aof-qa' }), error => error.code === 'native-role-capability-unavailable');
    assert.equal(calls, 0, 'a launcher unable to supply this configured role is also refused');
  }),
  caseOf('02 a Claude role retains its bundled default independently of the primary session model', async () => {
    const profile = provider('claude', async request => request);
    profile.roles.push('aof-researcher');
    profile.capabilities.models.push({ id: 'sonnet', model: 'sonnet', supportedReasoningEfforts: ['high', 'xhigh'] });
    const launch = createWorkflowRoleLauncher({}, { profiles: { claude: profile }, bound: 1 });
    const actual = await launch({ primary: 'claude', role: 'aof-researcher' });
    assert.equal(actual.model, 'sonnet'); assert.equal(actual.modelSource, 'bundle-role-default');
  }),
  caseOf('02 selected native model/effort reach the role or refuse explicitly', async () => {
    const config = { work: { agents: { runtimes: { codex: { models: { 'aof-qa': 'native-codex', 'aof-architect': 'native-codex' }, effort: { 'aof-qa': 'xhigh' } } } } } };
    const profile = provider('codex', async request => request);
    const launch = createWorkflowRoleLauncher(config, { profiles: { codex: profile }, bound: 1 });
    const actual = await launch({ primary: 'codex', role: 'aof-qa' });
    assert.equal(actual.model, 'native-codex'); assert.equal(actual.effort, 'xhigh');
    profile.effortSelection = false;
    await assert.rejects(() => launch({ primary: 'codex', role: 'aof-qa' }), error => error.code === 'native-role-setting-unsupported');
    profile.effortSelection = true;
    config.work.agents.runtimes.codex.models['aof-qa'] = 'opus';
    await assert.rejects(() => launch({ primary: 'codex', role: 'aof-qa' }), error => error.code === 'unsupported-model');
  }),
  caseOf('02 dispatch concurrency and configured rereview clamp remain bounded', async () => {
    const releases = [];
    const profile = provider('codex', () => new Promise(resolve => releases.push(resolve)));
    const launch = createWorkflowRoleLauncher({ work: { loop: { reviewRounds: 99 } } }, { profiles: { codex: profile }, bound: 2 });
    const first = launch({ primary: 'codex', role: 'aof-qa', reviewRound: 3 });
    const second = launch({ primary: 'codex', role: 'aof-architect' });
    await assert.rejects(() => launch({ primary: 'codex', role: 'aof-qa' }), error => error.code === 'role-concurrency-bound');
    await assert.rejects(() => launch({ primary: 'codex', role: 'aof-qa', reviewRound: 4 }), error => error.code === 'role-review-bound');
    assert.equal(releases.length, 2); for (const release of releases) release('finished');
    await Promise.all([first, second]);
    profile.launch = async () => 'after release';
    assert.equal(await launch({ primary: 'codex', role: 'aof-qa' }), 'after release');
    assert.throws(() => createWorkflowRoleLauncher({}, { profiles: {}, bound: 0 }), /resolved dispatch bound/u);
  }),
  caseOf('02 runtime-scoped role rendering preserves assistant model/effort isolation', () => {
    const config = { work: { agents: { models: { 'aof-qa': 'sonnet' }, runtimes: { codex: {
      models: { 'aof-qa': 'native-codex' }, effort: { 'aof-qa': 'xhigh' }
    } } } } };
    const outputs = renderBundleOutputsWithConfig(loadBundle(), config, { runtimes: [...runtimes, 'opencode'] });
    assert.match(output(outputs, '.codex/agents/aof-qa.toml').content, /model = "native-codex"[\s\S]*model_reasoning_effort = "xhigh"/u);
    assert.match(output(outputs, '.claude/agents/aof-qa.md').content, /model: sonnet/u);
    assert.doesNotMatch(output(outputs, '.opencode/agents/aof-qa.md').content, /^model:/mu, 'OpenCode retains its established unpinned model projection');
    assert.doesNotMatch(output(outputs, '.claude/agents/aof-qa.md').content, /native-codex/u);
  }),
  caseOf('00 real init/update installs native references and honours the final project override', () => fixture(async root => {
    const repo = path.join(root, 'repo'); await mkdir(path.join(repo, '.aof'), { recursive: true });
    const config = { name: 'variants', resources: [{ id: 'refine', kind: 'command', overrides: { claude: { body: 'operator final refine' } } }] };
    config.resources[0].overrides.claude = 'claude-refine-override.json';
    await writeFile(path.join(repo, '.aof/claude-refine-override.json'), JSON.stringify({ body: 'operator final refine' }));
    await writeFile(path.join(repo, '.aof/aof.config.json'), JSON.stringify(config));
    const cli = path.resolve('packages/core/bin/aof.mjs');
    const run = (...args) => JSON.parse(execFileSync(process.execPath, [cli, 'work', ...args, '--json'], { cwd: repo, encoding: 'utf8', env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, 'home') } }));
    run('init', '--runtime', 'claude,codex');
    assert.match(await readFile(path.join(repo, '.claude/commands/aof/refine.md'), 'utf8'), /operator final refine/u);
    const skill = await readFile(path.join(repo, '.agents/skills/aof-refine/SKILL.md'), 'utf8');
    assert.match(skill, /Read procedure.md/u); assert.doesNotMatch(skill, /operator final refine/u);
    await readFile(path.join(repo, '.agents/skills/aof-refine/procedure.md'));
    await readFile(path.join(repo, '.codex/aof/workflows/workflow-contract.md'));
    const update = run('update', '--dry-run');
    assert.equal(update.actions.filter(item => item.runtime === 'codex').every(item => item.action === 'skip'), true);
  }))
];
