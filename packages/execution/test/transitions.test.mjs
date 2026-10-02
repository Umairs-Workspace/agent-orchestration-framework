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
    oldestEventAt: () => '2026-02-01', listItems: async () => items,
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
