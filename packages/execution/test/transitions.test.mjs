import assert from 'node:assert/strict';
import test from 'node:test';
import { createRunTransitions } from '@aof/execution/run-transitions';
import { createRunReconciliation } from '@aof/execution/reconcile';

test('run admission checks the lock before minting and a refusal creates no event', async () => {
  const refusal = new Error('held'), calls = [];
  const api = createRunTransitions({
    guardItemLock: async ref => { calls.push(ref); throw refusal; },
    startRun: () => assert.fail('a held item cannot mint a run'),
    applicableReactors: () => assert.fail('no event for a refused mint'),
  });
  assert.deepEqual(calls, []);
  await assert.rejects(api.transitionRunStart({ ref: '142' }), error => error === refusal);
  assert.deepEqual(calls, ['142']);
});

test('reconciliation heals only the latest unreported run after the journal birth and closes its journal', async () => {
  const items = ['old', 'paid', 'latest'].map(ref => ({ ref, dir: '/fixture/' + ref }));
  const records = {
    old: [{ runId: 'old', state: 'done', updatedAt: '2026-01-01' }],
    paid: [{ runId: 'paid', state: 'done', updatedAt: '2026-02-02' }],
    latest: [{ runId: 'superseded', state: 'done', updatedAt: '2026-02-02' }, { runId: 'new', state: 'running', updatedAt: '2026-02-03' }],
  };
  const events = []; let closed = 0;
  const api = createRunReconciliation({
    openEffectsJournal: async () => ({ close: () => closed++ }),
    oldestEventAt: () => '2026-02-01', readWorkItemView: async () => ({ items }),
    listItems: async (_dir, { view }) => view.items,
    readRuns: async item => records[item.ref], hasEventForRun: (_journal, _name, runId) => runId === 'paid',
    applicableReactors: async () => ['publish'],
    appendEvent: (_journal, event) => { events.push(event); return { eventId: 'healed' }; },
  });
  const result = await api.reconcileRunRecords({ projectRoot: '/fixture', workDir: '/fixture/work' });
  assert.equal(result.scanned, 3);
  assert.deepEqual(result.appended, [{ ref: 'latest', runId: 'new', event: 'run.started', eventId: 'healed' }]);
  assert.equal(events[0].payload.reconciled, true);
  assert.equal(closed, 1);
});

test('208 tracking workspace reaches run reactors without enabling publication or changing lock scope', async () => {
  const trackingWorkspace = { projectRoot: '/selected', workDir: '/selected/work' };
  const record = { itemRef: '1', runId: 'run', attempt: 1 };
  const contexts = [], payloads = [], loci = [], locks = [];
  const api = createRunTransitions({
    startRun: async () => record, completeRun: async () => record, reclaimRun: async () => record,
    guardItemLock: async (_ref, options) => locks.push(options),
    applicableReactors: async (_name, payload, ctx) => { payloads.push(payload); contexts.push(ctx); return []; },
    reachableLoci: workspace => { loci.push(workspace); return []; },
    openEffectsJournal: async () => null, runEffectsEphemeral: async () => [],
  });
  const item = { ref: '1', type: 'chore', dir: '/selected/work/1_chore_one' };
  await api.transitionRunStart(item, {}, { trackingWorkspace });
  await api.transitionRunComplete(item, { outcome: 'failed' }, { trackingWorkspace });
  await api.transitionRunReclaimed(item, {}, { trackingWorkspace });
  assert.ok(contexts.every(ctx => ctx.trackingWorkspace === trackingWorkspace));
  assert.ok(payloads.every(payload => payload.workspaceRoot === null && !('trackingWorkspace' in payload)));
  assert.deepEqual(loci, [null, null, null]);
  assert.equal(locks[0].workspace, null);
});
