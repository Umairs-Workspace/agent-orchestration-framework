import assert from 'node:assert/strict';
import test from 'node:test';
import { nextWork } from '@aof/work/readiness';
import {
  isDependTarget, isDependNumber, siblingDependencyNumber, siblingGate,
  storiesByParent, rewriteDependsEntries, rewriteRefEntry,
} from '@aof/work/dependencies';

function view(rows) {
  return {
    items: rows.map(([ref, type, , , extra = {}]) => ({
      ref, type, number: ref.split('/').at(-1), parent: ref.includes('/') ? ref.split('/')[0] : null,
      slug: `item-${ref.replace('/', '-')}`, dir: null, ...extra,
    })),
    meta: new Map(rows.map(([ref, , status, depends = []]) => [ref, { status, depends }])),
  };
}

test('readiness offers an ordered independent set and accepts archived or parentless-story dependencies', async () => {
  const state = view([
    ['01', 'milestone', 'in-progress', ['00', '09']],
    ['01/02', 'story', 'not-started', ['00']],
    ['01/00', 'story', 'done'],
    ['01/01', 'story', 'not-started'],
    ['02', 'chore', 'not-started'],
    ['00', 'milestone', 'done', [], { archived: true }],
    ['09', 'story', 'done'],
    ['waiting', 'milestone', 'not-started', [], { number: null, backlog: '' }],
  ]);
  const result = await nextWork(null, undefined, { view: state });
  assert.equal(result.ref, '01/01');
  assert.deepEqual(result.readySet.map(row => row.ref), ['01/01', '01/02', '02']);
  assert.deepEqual(result.skipped, []);
  assert.ok(result.readySet.every(row => row.path === null));
});

test('candidacy skips routed/live work, annotates stale work and does not mutate supplied data', async () => {
  const state = view([['01', 'chore', 'not-started'], ['02', 'spike', 'not-started'], ['03', 'uat', 'not-started']]);
  const candidacyView = new Map([
    ['01', { routed: 'elsewhere', state: 'leased-stale', holder: 'remote' }],
    ['02', { state: 'leased-live', holder: 'busy' }],
    ['03', { state: 'leased-stale', holder: 'old' }],
  ]);
  const before = JSON.stringify([state.items, [...state.meta], [...candidacyView]]);
  const result = await nextWork(null, undefined, { view: state, candidacyView });
  assert.equal(result.ref, '03');
  assert.equal(result.reclaimable, true);
  assert.equal(result.leasedBy, 'old');
  assert.deepEqual(result.skipped, [{ ref: '01', state: 'routed-elsewhere' }, { ref: '02', state: 'leased-live', holderNode: 'busy' }]);
  assert.equal(JSON.stringify([state.items, [...state.meta], [...candidacyView]]), before);
});

test('mutually waiting stories report a blocker and never offer milestone acceptance', async () => {
  const state = view([['01', 'milestone', 'in-progress'], ['01/00', 'story', 'not-started', ['01']], ['01/01', 'story', 'not-started', ['00']]]);
  const result = await nextWork(null, undefined, { view: state });
  assert.equal(result.state, 'blocked');
  assert.equal(result.ref, '01/00');
  assert.deepEqual(result.waitingOn, ['01/01']);
  assert.deepEqual(result.readySet, []);
});

test('story scope and through-review mode never cross into milestone acceptance', async () => {
  const state = view([['01', 'milestone', 'in-progress'], ['01/00', 'story', 'in-review'], ['01/01', 'story', 'not-started'], ['02', 'chore', 'not-started']]);
  assert.equal((await nextWork(null, '01/00', { view: state })).ref, '01/00');
  assert.deepEqual(await nextWork(null, '01/00', { view: state, throughReview: true }), { state: 'done' });
  assert.deepEqual(await nextWork(null, '01/02-00', { view: state }), { state: 'done' });
  await assert.rejects(nextWork(null, '01/00-bad', { view: state }), { code: 'invalid-scope', status: 400 });
});

test('all stories done offers milestone acceptance independently of candidacy, except in build mode', async () => {
  const state = view([['01', 'milestone', 'in-progress'], ['01/00', 'story', 'done']]);
  const candidacyView = new Map([['01', { routed: 'elsewhere', state: 'leased-live' }]]);
  assert.equal((await nextWork(null, undefined, { view: state, candidacyView })).ref, '01');
  assert.deepEqual(await nextWork(null, undefined, { view: state, throughReview: true }), { state: 'done' });
  assert.deepEqual(await nextWork(null, '01/00', { view: state }), { state: 'done' });
});

test('shared dependency rules distinguish sibling refs, top-level targets and digit-led slugs', () => {
  const siblings = [{ ref: '03/00', parent: '03', number: '00', type: 'story' }, { ref: '03/01', parent: '03', number: '01', type: 'story' }];
  assert.equal(siblingDependencyNumber('3/00', '03'), '00');
  assert.equal(siblingDependencyNumber('4/00', '03'), null);
  assert.deepEqual(siblingGate(['00', '04/00'], siblings[1], siblings, () => 'not-started'), { unmet: ['03/00'], unresolved: ['04/00'] });
  assert.deepEqual(storiesByParent([...siblings].reverse()).get('3'), siblings);
  assert.equal(isDependTarget({ type: 'story', parent: null }), true);
  assert.equal(isDependTarget(siblings[0]), false);
  assert.equal(isDependNumber('007'), true);
  assert.equal(isDependNumber('007-bond'), false);
});

test('dependency rewrites preserve widths, quotes, line endings and body text', () => {
  const text = '---\r\ntitle: Keep\r\ndepends: [ "007", 007-bond, other ]\r\n---\r\ndepends: [007]\r\n';
  const mapping = value => ({ '007': '8', '007-bond': '12' })[value] ?? null;
  assert.equal(rewriteDependsEntries(text, mapping), text.replace('[ "007", 007-bond, other ]', '[ "008", 12, other ]'));
  assert.deepEqual(rewriteRefEntry(" '007' ", mapping), { text: " '008' ", changed: true });
  assert.equal(rewriteDependsEntries(text, () => null), text);
});
