import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNotionEffects } from '@aof/integration-notion/effects';

test('registration is inert and local remapping is separate from external synchronization', async () => {
  let loaded = 0; const calls = [];
  const contributions = createNotionEffects(async () => { loaded++; return { remapMappingRefs: async (...args) => { calls.push(args); return { remapped: 1 }; } }; });
  assert.equal(loaded, 0);
  const local = contributions.local.events['stream.reindexed'][0];
  assert.equal(local.locus, 'checkout');
  assert.equal(contributions.integration.events['run.completed'][0].locus, 'integration:notion');
  await local.apply({ eventId: 'event', payload: { workspaceRoot: '/repo', remap: [{ from: '1', to: '2' }] } });
  assert.deepEqual(calls[0], ['/repo', [{ from: '1', to: '2' }], { eventId: 'event' }]);
});

test('applicability uses matching context and sync forwards its milestone and integration options', async () => {
  const config = { work: { integrations: { notion: {} } } }, calls = [], spawn = () => {};
  const contributions = createNotionEffects(async () => ({
    loadWorkspace: async root => { calls.push(root); return { config }; },
    syncMilestoneWork: async (_workspace, options) => { calls.push(options); return { configured: true, items: [{ ref: '2/1', action: 'updated' }] }; },
  }));
  const reactor = contributions.integration.events['run.completed'][0];
  assert.equal(await reactor.applies({ workspaceRoot: '/repo' }, { workspace: { projectRoot: '/repo', config } }), true);
  assert.deepEqual(calls, []);
  const result = await reactor.apply({ payload: { workspaceRoot: '/repo', ref: '2/1' } }, { publisherOptions: { notionSpawn: spawn } });
  assert.equal(calls[1].milestone, '2'); assert.equal(calls[1].notionSpawn, spawn);
  assert.deepEqual(result.items, [{ ref: '2/1', action: 'updated' }]);
});
