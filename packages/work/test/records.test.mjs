import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  recordDoc, typeHasRecordDoc, parseFrontmatter, readItemMeta, readItemSchema,
  readItemVersion, setItemStatus, rollbackItemStatus, applyItemFrontmatter,
} from '@aof/work/records';
import { ITEM_STATUS_EDGES, VALID_STATUS, isOpen, closesEpoch } from '@aof/work/lifecycle';

async function fixture(run) {
  const parent = await realpath(os.tmpdir());
  const dir = await mkdtemp(path.join(parent, 'aof-work-records-'));
  try { await run({ dir, ref: '01', type: 'milestone' }); }
  finally {
    assert.equal(path.dirname(await realpath(dir)), parent);
    await rm(dir, { recursive: true, force: true });
  }
}

const document = (status, newline = '\n') => [
  '---', 'title: "Keep this formatting"', `status: ${status}`, 'updated: 2026-01-01',
  'schema: 3', 'aofVersion: "0.1.0"', '# Keep this comment', '---',
  '# Body', 'status: body text, not frontmatter', '',
].join(newline);

test('record selection prefers the milestone digest and preserves all type mappings', async () => {
  await fixture(async item => {
    assert.equal(recordDoc(item), 'SPEC.md');
    await writeFile(path.join(item.dir, 'AOF.md'), document('not-started'));
    assert.equal(recordDoc(item), 'AOF.md');
    for (const [type, doc] of Object.entries({ story: 'STORY.md', uat: 'SESSION.md', spike: 'SPIKE.md', chore: 'CHORE.md', task: null })) {
      assert.equal(recordDoc({ ...item, type }), doc);
      assert.equal(typeHasRecordDoc(type), doc != null);
    }
    assert.equal(typeHasRecordDoc('milestone'), true);
  });
});

test('metadata retains local fields under overlays and handles remote or absent records', async () => {
  await fixture(async item => {
    assert.deepEqual(await readItemMeta(item), {});
    await writeFile(path.join(item.dir, 'SPEC.md'), document('not-started'));
    const view = { meta: new Map([[item.ref, { status: 'in-progress', title: 'Remote title' }]]) };
    const meta = await readItemMeta(item, view);
    assert.equal(meta.status, 'in-progress');
    assert.equal(meta.title, 'Remote title');
    assert.equal(meta.updated, '2026-01-01');
    assert.deepEqual(await readItemMeta({ ...item, dir: null }, view), view.meta.get(item.ref));
    assert.equal(await readItemSchema(item), 3, 'future schemas are not clamped');
    assert.equal(await readItemVersion(item), '0.1.0');
  });
});

test('frontmatter parser keeps inline lists and treats flow maps as opaque strings', () => {
  assert.deepEqual(parseFrontmatter('---\r\ndepends: ["01", 02]\r\nnotion: { parent: key }\r\n---\r\nbody'), {
    depends: ['01', '02'], notion: '{ parent: key }',
  });
  assert.deepEqual(parseFrontmatter('<!-- leading -->\n---\nstatus: done\n---'), {});
});

test('lifecycle updates preserve document bytes except status and the existing updated field', async () => {
  await fixture(async item => {
    for (const newline of ['\n', '\r\n']) {
      const before = document('not-started', newline);
      await writeFile(path.join(item.dir, 'SPEC.md'), before);
      const result = await setItemStatus(item, 'in-progress', { expectFrom: ['not-started'], now: '2026-09-28T12:00:00Z' });
      assert.deepEqual(result, { ref: item.ref, status: 'in-progress', from: 'not-started' });
      assert.equal(await readFile(path.join(item.dir, 'SPEC.md'), 'utf8'), before.replace('status: not-started', 'status: in-progress').replace('updated: 2026-01-01', 'updated: 2026-09-28'));
    }
  });
});

test('refused status moves preserve bytes and report the actual disk status', async () => {
  await fixture(async item => {
    const file = path.join(item.dir, 'SPEC.md');
    for (const from of VALID_STATUS) {
      const before = document(from);
      await writeFile(file, before);
      for (const to of VALID_STATUS) {
        if (ITEM_STATUS_EDGES[from].includes(to)) continue;
        await assert.rejects(setItemStatus(item, to), error => error.code === 'status-edge-not-applicable' && error.status === 409 && error.detail.status === from);
        assert.equal(await readFile(file, 'utf8'), before);
      }
    }
    await assert.rejects(setItemStatus(item, 'unknown'), { code: 'invalid-status' });
    await writeFile(file, document('blocked'));
    await assert.rejects(setItemStatus(item, 'in-progress', { expectFrom: 'not-started' }), { code: 'status-edge-not-applicable' });
  });
});

test('rollback changes only status and never performs acceptance', async () => {
  await fixture(async item => {
    const file = path.join(item.dir, 'SPEC.md');
    for (const to of ['blocked', 'not-started']) {
      const before = document('in-progress');
      await writeFile(file, before);
      assert.deepEqual(await rollbackItemStatus(item, to), { ref: item.ref, status: to });
      assert.equal(await readFile(file, 'utf8'), before.replace('status: in-progress', `status: ${to}`));
    }
    await assert.rejects(rollbackItemStatus(item, 'done'), { code: 'forbidden-rollback' });
    await assert.rejects(rollbackItemStatus(item, 'blocked'), { code: 'rollback-not-applicable' });
  });
});

test('unusable documents remain faults on both status faces', async () => {
  await fixture(async item => {
    const file = path.join(item.dir, 'SPEC.md');
    for (const contents of [null, 'plain body', '<!-- leading -->\n' + document('in-progress')]) {
      if (contents != null) await writeFile(file, contents);
      for (const action of [() => setItemStatus(item, 'done'), () => rollbackItemStatus(item, 'not-started')]) {
        await assert.rejects(action(), { code: 'record-doc-unusable', status: 422 });
      }
      if (contents != null) assert.equal(await readFile(file, 'utf8'), contents);
    }
  });
});

test('transforms use the chosen digest and preserve its body and the native specification', async () => {
  await fixture(async item => {
    const before = document('in-progress', '\r\n');
    await writeFile(path.join(item.dir, 'SPEC.md'), 'original specification');
    await writeFile(path.join(item.dir, 'AOF.md'), before);
    assert.deepEqual(await applyItemFrontmatter(item, async block => block.replace('schema: 3', 'schema: 4')), { ref: item.ref, doc: 'AOF.md' });
    assert.equal(await readFile(path.join(item.dir, 'AOF.md'), 'utf8'), before.replace('schema: 3', 'schema: 4'));
    assert.equal(await readFile(path.join(item.dir, 'SPEC.md'), 'utf8'), 'original specification');
    assert.equal(isOpen('done'), false);
    assert.equal(closesEpoch('done'), true);
  });
});
