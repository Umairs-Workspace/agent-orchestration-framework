import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createNotionMapping, resolvePageId } from '@aof/integration-notion/mapping';
import { createNotionApply } from '@aof/integration-notion/sync';
import { projectMilestone } from '@aof/integration-notion/projection';
import { createNotionCli } from '@aof/integration-notion/cli';
import { createNotionSync } from '@aof/integration-notion/sync-work';
import { createNotionContribution, createNotionAssociateCommand, createNotionSyncWorkCommand } from '@aof/integration-notion/commands';

test('sidecar policy is injected and independent instances preserve board and reindex identities', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aof-notion-package-'));
  try {
    const make = directory => createNotionMapping({ workspacePaths: () => ({ workspaceDir: path.join(root, directory) }) });
    const first = make('first'), second = make('second');
    await first.recordPageId(root, 'board-a', '1', 'page-a');
    await first.recordPageId(root, 'board-b', '1', 'page-b');
    await second.recordPageId(root, 'board-a', '1', 'other-page');
    await first.remapMappingRefs(root, [{ from: '1', to: '2' }], { eventId: 'reindex' });
    const beforeReplay = await readFile(path.join(root, 'first/notion.work-map.json'), 'utf8');
    await first.remapMappingRefs(root, [{ from: '1', to: '2' }], { eventId: 'reindex' });
    assert.equal(await readFile(path.join(root, 'first/notion.work-map.json'), 'utf8'), beforeReplay);
    assert.equal(resolvePageId(await first.readMapping(root, 'board-a'), '2'), 'page-a');
    assert.equal(resolvePageId(await first.readMapping(root, 'board-b'), '2'), 'page-b');
    assert.equal(resolvePageId(await second.readMapping(root, 'board-a'), '1'), 'other-page');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('projection and apply run without core and write a binding only after a successful page creation', async () => {
  const writes = [], calls = [];
  const config = { dataSourceId: 'board', statusProperty: 'Status', statusMap: { done: 'Done' } };
  const plan = projectMilestone({ items: [{ ref: '1', type: 'milestone', slug: 'example', meta: { title: 'Example', status: 'done' } }], config, mapping: { entries: {} } });
  const { applyPlan } = createNotionApply({ recordPageId: async (...args) => writes.push(args) });
  const args = { plan, config, projectRoot: '/fixture', notionSpawn: async argv => { calls.push(argv); return { id: 'page' }; } };
  await applyPlan({ ...args, dryRun: true });
  assert.deepEqual(calls, []); assert.deepEqual(writes, []);
  await assert.rejects(applyPlan({ ...args, notionSpawn: async () => { throw new Error('offline'); } }), /offline/);
  assert.deepEqual(writes, []);
  const result = await applyPlan(args);
  assert.equal(result.items[0].pageId, 'page');
  assert.deepEqual(writes[0].slice(0, 4), ['/fixture', 'board', '1', 'page']);
  assert.ok(calls[0].includes('v1/pages'));
});

test('CLI factories retain independent descriptors and pass synthetic auth through environment only', async () => {
  const make = version => createNotionCli({ descriptorFor: () => ({ name: 'ntn', version, binaries: ['ntn'] }), reportDegrade: () => {} });
  const first = make('1'), second = make('2');
  for (const [cli, version] of [[first, '1'], [second, '2']]) {
    await assert.rejects(cli.makeNotionSpawn({ env: {}, resolveLauncher: () => null })([]), new RegExp('ntn@' + version));
  }
  let call;
  await first.makeNotionSpawn({ config: { tokenEnv: 'FIXTURE_TOKEN' }, env: { FIXTURE_TOKEN: 'synthetic-token' }, resolveLauncher: () => '/fixture/ntn', node: '/fixture/node', spawn: (...args) => { call = args; return { status: 0, stdout: '{"id":"page"}' }; } })(['api', '-X', 'POST', 'v1/pages']);
  assert.equal(call[2].env.FIXTURE_TOKEN, 'synthetic-token');
  assert.equal(call[2].env.NOTION_KEYRING, '0');
  assert.ok(!call[1].includes('synthetic-token'));
});

test('package command contribution preserves no-op and dry-run behavior without opening services', async () => {
  const commandError = (message, code) => Object.assign(new Error(message), { code });
  const { syncMilestoneWork } = createNotionSync({ commandError });
  const syncWork = createNotionSyncWorkCommand({ commandError, syncMilestoneWork });
  const associate = createNotionAssociateCommand({ commandError });
  const contribution = createNotionContribution({ syncWork, associate });
  assert.deepEqual(contribution.commands.map(command => command.id), ['notion:sync-work', 'notion:associate']);
  const input = syncWork.cli.argv(['1'], { 'dry-run': true });
  const result = await syncWork.run(input, { workspace: { config: {} } });
  assert.equal(result.configured, false);
  assert.match(syncWork.cli.render(result), /not configured/);
  assert.throws(() => createNotionContribution({ syncWork }), /both package command descriptors/);
});
