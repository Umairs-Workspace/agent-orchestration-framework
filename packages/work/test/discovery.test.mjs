import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm, stat, utimes } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { listItems, findWork, listStream, isLiveStreamRow, readWorkDirectory, readStreamSnapshot, workTreeStatDigest, createWorkTreeWatches } from '@aof/work/discovery';
import { createCostMeter } from '@aof/foundation/cost-meter';
import { ITEM_RE, BACKLOG_ITEM_RE, parseStorySpan, sameNumber } from '@aof/work/identity';

async function fixture(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-discovery-'));
  try {
    const folders = [
      '10_milestone_live/stories/02_story_second',
      '10_milestone_live/stories/00_story_first',
      '11_chore_cleanup',
      'backlog/chore_alpha',
      'backlog/group/milestone_beta/stories/00_story_not-an-item',
      'backlog/12_milestone_group/spike_gamma',
      'archive/05_milestone_old/stories/00_story_old-story',
      'ignored/20_milestone_not-a-root',
    ];
    for (const name of folders) await mkdir(path.join(root, name), { recursive: true });
    await writeFile(path.join(root, '10_milestone_live/SPEC.md'), 'corrupt document');
    await writeFile(path.join(root, '11_chore_cleanup/CHORE.md'), '---\ntitle: Cleanup\nstatus: blocked\n---\n');
    await writeFile(path.join(root, '99_chore_file'), 'not a directory');
    await run(root);
  } finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
}

test('one enumeration discovers live, grouped backlog and archived folders without record content', () => fixture(async root => {
  const items = await listItems(root);
  assert.deepEqual(items.map(i => i.ref).sort(), ['05', '05/00', '10', '10/00', '10/02', '11', 'alpha', 'beta', 'gamma']);
  const live = items.find(i => i.ref === '10');
  assert.deepEqual(Object.keys(live), ['number', 'type', 'slug', 'name', 'dir', 'ref', 'parent']);
  assert.equal(items.find(i => i.ref === 'beta').backlog, 'group');
  assert.equal(items.find(i => i.ref === 'gamma').backlog, '12_milestone_group');
  assert.equal(items.find(i => i.ref === '05/00').archived, true);
  assert.deepEqual(items.filter(isLiveStreamRow).map(i => i.ref).sort(), ['10', '10/00', '10/02', '11']);
}));

test('lookup resolves numeric refs, story spans, archived refs and backlog slugs', () => fixture(async root => {
  assert.equal((await findWork(root, '010'))[0].ref, '10');
  assert.deepEqual((await findWork(root, '10/00-02')).map(i => i.ref), ['10/00', '10/02']);
  assert.deepEqual(await findWork(root, '10/02-00'), []);
  assert.equal((await findWork(root, '10/0'))[0].ref, '10/00');
  assert.equal((await findWork(root, '05'))[0].archived, true);
  assert.equal((await findWork(root, 'BETA'))[0].number, null);
  assert.equal((await findWork(root, 'live'))[0].status, null);
  assert.equal((await findWork(root, 'cleanup'))[0].status, 'blocked');
}));

test('listing preserves stable preorder, seven-field live rows and explicit archive inclusion', () => fixture(async root => {
  const rows = await listStream(root);
  assert.deepEqual(rows.map(i => i.ref), ['10', '10/00', '10/02', '11', 'alpha', 'gamma', 'beta']);
  assert.deepEqual(Object.keys(rows[0]), ['ref', 'type', 'slug', 'status', 'title', 'parent', 'dir']);
  assert.equal(rows[0].dir, path.join(root, '10_milestone_live').replaceAll('\\', '/'));
  assert.deepEqual((await listStream(root, { all: true })).map(i => i.ref), [...rows.map(i => i.ref), '05', '05/00']);
}));

test('a supplied view replaces discovery and overlays metadata without inventing local paths', () => fixture(async root => {
  const local = (await listItems(root)).find(i => i.ref === '11');
  const remote = { ref: '20', number: '20', parent: null, type: 'chore', slug: 'remote', dir: null };
  const view = { items: [remote, local], meta: new Map([['11', { status: 'in-progress' }], ['20', { title: 'Remote', status: 'done' }]]) };
  assert.equal(await listItems(null, { view }), view.items);
  const rows = await listStream(null, { view });
  assert.deepEqual(rows.map(i => i.ref), ['11', '20']);
  assert.equal(rows[0].title, 'Cleanup');
  assert.equal(rows[0].status, 'in-progress');
  assert.equal(rows[1].dir, null);
  assert.equal((await findWork(null, 'remote', { view }))[0].title, 'Remote');
  assert.deepEqual(await listItems(root, { view: { items: [] } }), []);
}));

test('invalid, absent and file roots enumerate nothing, preserving the tolerant reader contract', () => fixture(async root => {
  for (const input of [null, undefined, 42, path.join(root, 'absent'), path.join(root, '99_chore_file')]) {
    assert.deepEqual(await listItems(input), []);
    assert.deepEqual(await readWorkDirectory(input), []);
  }
}));

test('identity grammar and numeric/story matching preserve leading zeros and scope semantics', () => {
  assert.ok(ITEM_RE.test('00_milestone_example'));
  assert.equal(ITEM_RE.test('milestone_example'), false);
  assert.ok(BACKLOG_ITEM_RE.test('milestone_example'));
  assert.equal(BACKLOG_ITEM_RE.test('task_example'), false);
  assert.equal(sameNumber('03', 3), true);
  assert.equal(sameNumber(null, '00'), false);
  assert.deepEqual(parseStorySpan(' 03/01-04 '), { driver: 3, lo: 1, hi: 4 });
  assert.deepEqual(parseStorySpan('03/01'), { driver: 3, lo: 1, hi: 1 });
  assert.deepEqual(parseStorySpan('03/04-01'), { driver: 3, lo: 4, hi: 1 });
  assert.equal(parseStorySpan('03'), null);
});

// ── 167/01 — an unchanged work tree costs a stat walk ──────────────────────────────────────
// Traceability: 167_milestone_daemon-stays-within-a-resource-budget/stories/01_story_an-unchanged-tree-costs-a-stat-walk/
//   tasks/00_an-unchanged-tree-is-read-once.feature and tasks/01_the-stat-digest-has-one-home.feature (@executable).
// The Background's tree: 60 milestones of 29 stories each, 1,800 record docs. The meter is the test's own.
async function generatedTree(run, { milestones = 60, stories = 29 } = {}) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-167-01-'));
  const fm = (fields) => `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n`;
  try {
    for (let m = 1; m <= milestones; m++) {
      const number = String(m).padStart(2, '0');
      const dir = path.join(root, `${number}_milestone_m${number}`);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'SPEC.md'), fm({ type: 'milestone', number, slug: `m${number}`, status: 'in-progress', title: `M${number}` }));
      for (let s = 0; s < stories; s++) {
        const sNumber = String(s).padStart(2, '0');
        const sDir = path.join(dir, 'stories', `${sNumber}_story_s${sNumber}`);
        await mkdir(sDir, { recursive: true });
        await writeFile(path.join(sDir, 'STORY.md'), fm({ type: 'story', number: sNumber, slug: `s${sNumber}`, parent: number, status: 'in-progress', title: `S${number}/${sNumber}` }));
      }
    }
    await run(root);
  } finally {
    assert.equal(path.dirname(await realpath(root)), parent);
    await rm(root, { recursive: true, force: true });
  }
}
const storyDoc = (root, m, s) => path.join(root, `${m}_milestone_m${m}`, 'stories', `${s}_story_s${s}`, 'STORY.md');
const readAll = async (snapshot) => Promise.all(snapshot.items.map((item) => snapshot.frontmatter(item)));
const statusOf = async (snapshot, ref) => (await snapshot.frontmatter(snapshot.items.find((item) => item.ref === ref))).status;
const missingDir = async (tag) => path.join(await realpath(os.tmpdir()), `aof-167-01-${tag}-${process.pid}-${Date.now()}`);

test('167/01 E1 · a second read of an unchanged tree opens no record doc', () => generatedTree(async (root) => {
  const meter = createCostMeter();
  const labels = { workspaceId: 'aof' };
  // A whole-second mtime, so putting it back below restores exactly what the digest saw (NTFS keeps 100 ns).
  const doc = storyDoc(root, '12', '03');
  const mtime = new Date(Date.UTC(2026, 9, 20, 12, 0, 0));
  await utimes(doc, mtime, mtime);
  const first = await readStreamSnapshot(root, { meter, labels });
  assert.equal((await readAll(first)).length, 1800, 'the Background tree holds 1800 record docs');
  // Rewrite one doc's bytes and put its size and mtime back: a read that OPENED it would see the new status.
  const { size } = await stat(doc);
  const rewritten = (await readFile(doc, 'utf8')).replace('status: in-progress', 'status: blocked-xxx');
  assert.equal(Buffer.byteLength(rewritten), size, 'the rewrite keeps the size');
  await writeFile(doc, rewritten);
  await utimes(doc, mtime, mtime);
  const second = await readStreamSnapshot(root, { meter, labels });
  assert.equal(second.fromMemo, true);
  assert.equal(await statusOf(second, '12/03'), 'in-progress', 'no record doc is opened by the second read');
  assert.equal(meter.total('full-disk-read', labels), 1, 'the meter counts 1 full-disk-read for aof');
  assert.equal(meter.total('cache-hit', { ...labels, code: 'memo' }), 1, '…and 1 cache-hit labelled memo');
}));

test('167/01 E2 · an edited status is answered on the next read', () => generatedTree(async (root) => {
  const first = await readStreamSnapshot(root);
  assert.equal(await statusOf(first, '12/03'), 'in-progress');
  const doc = storyDoc(root, '12', '03');
  await writeFile(doc, (await readFile(doc, 'utf8')).replace('status: in-progress', 'status: done'));
  const second = await readStreamSnapshot(root);
  assert.equal(second.fromMemo, false);
  assert.equal(await statusOf(second, '12/03'), 'done', 'story 12/03 reads done');
}, { milestones: 12, stories: 4 }));

test('167/01 E3 · a newly scaffolded item is answered on the next read', () => generatedTree(async (root) => {
  await readStreamSnapshot(root);
  const dir = path.join(root, '12_milestone_m12', 'stories', '04_story_s04');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'STORY.md'), '---\ntype: story\nnumber: 04\nstatus: not-started\n---\n');
  const second = await readStreamSnapshot(root);
  assert.ok(second.items.some((item) => item.ref === '12/04'), 'the items include 12/04');
}, { milestones: 12, stories: 4 }));

test('167/01 the memo is bypassed when the tree cannot be fingerprinted — cannot be listed', async () => {
  const meter = createCostMeter();
  const missing = await missingDir('unlisted');
  for (let read = 0; read < 2; read++) await assert.rejects(readStreamSnapshot(missing, { meter }), (error) => error.code === 'ENOENT', `read ${read + 1} fails`);
  await mkdir(missing);
  try {
    assert.equal((await readStreamSnapshot(missing, { meter })).fromMemo, false, 'the read after the failures walks again: a failure is never remembered');
    assert.equal(meter.total('full-disk-read'), 1);
  } finally {
    await rm(missing, { recursive: true, force: true });
  }
});

test('167/01 the memo is bypassed when the tree cannot be fingerprinted — a doc vanishes mid-walk', () => generatedTree(async (root) => {
  const meter = createCostMeter();
  const vanishing = async (file) => {
    if (file.endsWith(path.join('01_milestone_m01', 'SPEC.md'))) throw Object.assign(new Error('gone'), { code: 'ENOENT' });
    return stat(file);
  };
  for (let read = 0; read < 2; read++) {
    assert.equal((await readStreamSnapshot(root, { meter, statFile: vanishing })).fromMemo, false, `read ${read + 1} is answered from disk without remembering`);
  }
  assert.equal(meter.total('full-disk-read'), 2);
}, { milestones: 3, stories: 2 }));

test('167/01 E4 · two callers at the same moment get one parse', () => generatedTree(async (root) => {
  const meter = createCostMeter();
  const labels = { workspaceId: 'aof' };
  const [tick, poll] = await Promise.all([readStreamSnapshot(root, { meter, labels }), readStreamSnapshot(root, { meter, labels })]);
  assert.equal(meter.total('full-disk-read', labels), 1, 'the meter counts 1 full-disk-read for aof');
  assert.equal(tick.items, poll.items, 'both callers receive the same items');
  const [a, b] = await Promise.all([tick.record(tick.items[0]), poll.record(poll.items[0])]);
  assert.equal(a, b, '…and share one parse of each doc');
}, { milestones: 6, stories: 3 }));

test('167/01 E5 · a shared read that fails is never remembered', async () => {
  const meter = createCostMeter();
  const missing = await missingDir('shared');
  const results = await Promise.allSettled([readStreamSnapshot(missing, { meter }), readStreamSnapshot(missing, { meter })]);
  assert.deepEqual(results.map((result) => result.status), ['rejected', 'rejected'], 'both callers receive the failure');
  await mkdir(missing);
  try {
    assert.equal((await readStreamSnapshot(missing, { meter })).fromMemo, false, 'the next read of aof walks the tree again');
  } finally {
    await rm(missing, { recursive: true, force: true });
  }
});

test('167/01 reads of two different trees do not wait on each other', () => generatedTree(async (aof) => generatedTree(async (testRepo) => {
  const meter = createCostMeter();
  await Promise.all([readStreamSnapshot(aof, { meter, labels: { workspaceId: 'aof' } }), readStreamSnapshot(testRepo, { meter, labels: { workspaceId: 'aof-test-repo' } })]);
  assert.equal(meter.total('full-disk-read', { workspaceId: 'aof' }), 1);
  assert.equal(meter.total('full-disk-read', { workspaceId: 'aof-test-repo' }), 1, 'the meter counts 1 full-disk-read for each of them');
}, { milestones: 2, stories: 19 }), { milestones: 6, stories: 3 }));

test('167/01 E6 · the sync pass and the read memo agree on a tree\'s digest', () => generatedTree(async (root) => {
  const gate = await workTreeStatDigest(root);
  assert.match(gate, /^[0-9a-f]{64}$/);
  assert.equal((await readStreamSnapshot(root)).digest, gate, 'they compute the same digest');
}, { milestones: 6, stories: 3 }));

for (const [change, moves] of [
  ['nothing is changed', false],
  ['one STORY.md is rewritten with different content', true],
  ['one task .feature is added', true],
  ['a file that is neither a .md nor a .feature is added', false],
]) {
  test(`167/01 the digest moves exactly when a record doc's stat moves — ${change}`, () => generatedTree(async (root) => {
    const before = await workTreeStatDigest(root);
    const story = path.dirname(storyDoc(root, '02', '01'));
    if (change.startsWith('one STORY.md')) await writeFile(path.join(story, 'STORY.md'), '---\ntype: story\nstatus: done\ntitle: rewritten with more bytes\n---\n');
    if (change.startsWith('one task')) {
      await mkdir(path.join(story, 'tasks'), { recursive: true });
      await writeFile(path.join(story, 'tasks', '00_new.feature'), 'Feature: new\n');
    }
    if (change.startsWith('a file')) await writeFile(path.join(story, 'notes.txt'), 'not a record\n');
    assert.equal((await workTreeStatDigest(root)) !== before, moves, `the digest ${moves ? 'changes' : 'is unchanged'}`);
  }, { milestones: 3, stories: 2 }));
}

test('167/01 E3 · a newly scaffolded item is answered on the next read — even before its record doc is written', () => generatedTree(async (root) => {
  const before = await workTreeStatDigest(root);
  await readStreamSnapshot(root);
  await mkdir(path.join(root, '12_milestone_m12', 'stories', '05_story_s05'), { recursive: true });
  assert.equal(await workTreeStatDigest(root), before, 'the stat gate\'s digest does not see an empty folder (164/ADR-002, unchanged)');
  const second = await readStreamSnapshot(root);
  assert.equal(second.fromMemo, false, 'the memo keys on the tree\'s shape too');
  assert.ok(second.items.some((item) => item.ref === '12/05'), 'the items include 12/05');
}, { milestones: 12, stories: 4 }));
// 168/00 task 00, R1 — a `NN_prototype_<slug>` folder is a work item every ref reader resolves.
test('168/00 a prototype folder resolves by number and by its backlog slug, and only the exact type word admits it', async () => {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, 'aof-discovery-prototype-'));
  try {
    assert.deepEqual('169_prototype_csv-importer'.match(ITEM_RE).slice(1), ['169', 'prototype', 'csv-importer']);
    assert.deepEqual('prototype_csv-importer'.match(BACKLOG_ITEM_RE).slice(1), ['prototype', 'csv-importer']);
    // E1
    await mkdir(path.join(root, '169_prototype_csv-importer'));
    await writeFile(path.join(root, '169_prototype_csv-importer/PROTOTYPE.md'), '---\ntype: prototype\nnumber: 169\nslug: csv-importer\nstatus: active\n---\n');
    const [found] = await findWork(root, '169');
    assert.deepEqual([found.type, found.slug, found.status], ['prototype', 'csv-importer', 'active']);
    await rm(path.join(root, '169_prototype_csv-importer'), { recursive: true });
    // E2
    await mkdir(path.join(root, 'backlog/prototype_csv-importer'), { recursive: true });
    await writeFile(path.join(root, 'backlog/prototype_csv-importer/PROTOTYPE.md'), '---\ntype: prototype\nslug: csv-importer\nstatus: active\n---\n');
    const backlog = await findWork(root, 'csv-importer');
    assert.deepEqual(backlog.map(row => [row.type, row.number]), [['prototype', null]]);
    await rm(path.join(root, 'backlog'), { recursive: true });
    // E3
    for (const [folder, rows] of [['169_prototypes_csv-importer', 0], ['169_Prototype_csv-importer', 0], ['169_prototype_csv-importer', 1]]) {
      await mkdir(path.join(root, folder));
      assert.equal((await findWork(root, '169')).length, rows, folder);
      await rm(path.join(root, folder), { recursive: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ================================ 167/07 — an unchanged watched tree is not walked
// Traceability: 167_milestone_daemon-stays-within-a-resource-budget/stories/07_story_an-idle-tick-walks-nothing/
//   tasks/00_an-unchanged-watched-tree-is-not-walked.feature and tasks/01_the-daemon-holds-a-watch-per-synced-tree.feature
//   (@executable, E10). The watch is INJECTED (its listener fired by hand) and so is the clock; every
//   walk is read off the watch set's meter as `stat-walk`. The Background's tree is the 1,800-doc one.
function fakeTreeWatch() {
  const armed = new Map();
  return {
    watch: (dir, options, listener) => {
      const emitter = new EventEmitter();
      emitter.close = () => armed.delete(dir);
      armed.set(dir, listener);
      return emitter;
    },
    fire: (dir, name) => armed.get(path.resolve(dir))('change', name),
  };
}
async function watchedTree(run) {
  return generatedTree(async (root) => {
    const fake = fakeTreeWatch();
    const clock = { ms: Date.parse('2026-10-22T09:00:00.000Z') };
    const meter = createCostMeter();
    const watches = createWorkTreeWatches({ watch: fake.watch, now: () => clock.ms, meter });
    try {
      watches.retain([root]);
      await workTreeStatDigest(root); // armed and walked once
      assert.equal(meter.total('stat-walk', { code: 'first' }), 1, 'the first walk is counted (non-vacuous)');
      await run({ root, fake, clock, meter, walks: (labels) => meter.total('stat-walk', labels) });
    } finally {
      watches.close();
    }
  });
}

const milestoneDir = (root, m) => path.join(root, `${m}_milestone_m${m}`);
for (const [example, event, write, walks] of [
  ['E4', 'a folder made with no record doc in it', async (root) => { await mkdir(path.join(milestoneDir(root, '07'), 'stories', '29_story_new')); return path.join('07_milestone_m07', 'stories', '29_story_new'); }, true],
  ['E5', 'runs/node-7297/20261022T150000000Z-0000.json', async (root) => { const dir = path.join(milestoneDir(root, '07'), 'runs', 'node-7297'); await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, '20261022T150000000Z-0000.json'), '{}'); return path.join('07_milestone_m07', 'runs', 'node-7297', '20261022T150000000Z-0000.json'); }, false],
  ['', 'a task .feature written', async (root) => { const dir = path.join(milestoneDir(root, '07'), 'stories', '00_story_s00', 'tasks'); await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, '00_x.feature'), 'Feature: x\n'); return path.join('07_milestone_m07', 'stories', '00_story_s00', 'tasks', '00_x.feature'); }, true],
  ['', 'an event with no file name', async () => null, true],
  ['', 'logs/mesh-serve.log appended', async () => path.join('logs', 'mesh-serve.log'), false],
]) {
  test(`167/07 ${example ? `${example} · ` : ''}which events make the tree dirty — ${event}: ${walks ? 'walks the tree' : 'does not walk'}`, () => watchedTree(async ({ root, fake, walks: count }) => {
    const before = count();
    fake.fire(root, await write(root));
    await workTreeStatDigest(root);
    assert.equal(count() - before, walks ? 1 : 0);
    if (walks) assert.equal(count({ code: 'changed' }), 1, 'labelled changed');
  }));
}

test('167/07 E6 · an event during a walk makes the next ask walk again', () => watchedTree(async ({ root, fake, walks }) => {
  const doc = storyDoc(root, '04', '05');
  fake.fire(root, null);
  const flight = workTreeStatDigest(root);
  await writeFile(doc, (await readFile(doc, 'utf8')).replace('in-progress', 'done'));
  fake.fire(root, path.relative(root, doc));
  await flight;
  const before = walks();
  await workTreeStatDigest(root);
  assert.equal(walks() - before, 1, 'the next ask walks the tree');
}));

test('167/07 two asks while one walk is in flight share it', () => watchedTree(async ({ root, fake, walks }) => {
  fake.fire(root, null);
  const before = walks();
  const [a, b] = await Promise.all([workTreeStatDigest(root), readStreamSnapshot(root)]);
  assert.equal(walks() - before, 1, 'one stat-walk');
  assert.equal(b.digest, a, 'both get the same digest');
}));

for (const [example, ageMs, walked] of [['', 299_000, false], ['E7', 300_000, true]]) {
  test(`167/07 ${example ? `${example} · ` : ''}the safety walk's edge — ${ageMs === 299_000 ? '4 min 59 s' : '5 min 0 s'}`, () => watchedTree(async ({ root, clock, walks }) => {
    clock.ms += ageMs;
    await workTreeStatDigest(root);
    assert.equal(walks({ code: 'safety' }), walked ? 1 : 0);
    assert.equal(walks(), walked ? 2 : 1, walked ? 'one stat-walk labelled safety' : 'no stat-walk is counted');
  }));
}

test('167/07 E10 · a process that arms no watch walks on every read, uncounted', () => generatedTree(async (root) => {
  const meter = createCostMeter();
  const first = await readStreamSnapshot(root, { meter });
  const doc = storyDoc(root, '09', '09');
  await writeFile(doc, `${await readFile(doc, 'utf8')}\n`);
  const second = await readStreamSnapshot(root, { meter });
  assert.notEqual(second.digest, first.digest, 'the second read walked the tree and saw the edit');
  assert.equal(meter.total('stat-walk'), 0, 'and no stat-walk is counted');
}));
