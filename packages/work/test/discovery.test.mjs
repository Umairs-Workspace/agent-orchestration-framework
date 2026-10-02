import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listItems, findWork, listStream, isLiveStreamRow, readWorkDirectory } from '@aof/work/discovery';
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
