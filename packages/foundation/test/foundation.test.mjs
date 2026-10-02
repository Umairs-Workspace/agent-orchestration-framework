import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readdir, readFile, writeFile, utimes, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDegradeReporter } from '@aof/foundation/degrade';
import { createJsonlLogSink, readJsonlLog } from '@aof/foundation/log';
import { readJson, writeText, normalizeId, createTempFileSweeper } from '@aof/foundation/fs';
import { gitPositional } from '@aof/foundation/git-args';

async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aof-foundation-'));
  try { await run(root); }
  finally {
    assert.equal(path.dirname(await realpath(root)), await realpath(os.tmpdir()));
    await rm(root, { recursive: true, force: true });
  }
}

test('reporters are inert, instance-scoped, and throttle by code and optional key', () => {
  let now = 10_000, opened = 0;
  const first = [], second = [];
  const make = events => createDegradeReporter({ clock: () => now, createSink: proc => {
    assert.equal(proc, 'degrade'); opened++; return { write: event => events.push(event) };
  } });
  const a = make(first), b = make(second);
  assert.equal(opened, 0);
  a.reportDegrade('read', new Error('missing'));
  a.reportDegrade('read', new Error('repeated'));
  b.reportDegrade('read', new Error('independent'));
  a.reportDegrade('read', 'session a', { key: 'a', path: '/fixture', screen: { rows: ['ready'] } });
  a.reportDegrade('read', 'session b', { key: 'b', screen: [] });
  assert.equal(first.length, 3); assert.equal(second.length, 1); assert.equal(opened, 2);
  assert.deepEqual(first[1], { level: 'degrade', code: 'read', message: 'session a', path: '/fixture', screen: { rows: ['ready'] } });
  assert.ok(!Object.hasOwn(first[2], 'screen'));
  now += 5_000;
  a.reportDegrade('read', 'next window');
  assert.equal(first.length, 4); assert.equal(opened, 2);
});

test('reporting contains sink, serialization input and clock faults without recursion', () => {
  let now = 10_000, attempts = 0;
  const reporter = createDegradeReporter({ clock: () => now, createSink: () => { attempts++; throw new Error('disk unavailable'); } });
  assert.doesNotThrow(() => reporter.reportDegrade('disk', new Error('original')));
  reporter.reportDegrade('disk', 'still throttled'); assert.equal(attempts, 1);
  now += 5_000; reporter.reportDegrade('disk', 'retry'); assert.equal(attempts, 2);
  const broken = createDegradeReporter({ createSink: () => ({ write: () => { throw new Error('write failed'); } }) });
  assert.doesNotThrow(() => broken.reportDegrade('sink', 'original'));
  assert.doesNotThrow(() => broken.reportDegrade('getter', { get message() { throw new Error('bad input'); } }));
  const badClock = createDegradeReporter({ clock: () => { throw new Error('clock failed'); }, createSink: () => assert.fail('must not open') });
  assert.doesNotThrow(() => badClock.reportDegrade('clock', 'original'));
});

test('JSON reads distinguish malformed content from missing files', () => fixture(async root => {
  const file = path.join(root, 'data.json');
  await assert.rejects(readJson(file), error => error.code === 'ENOENT');
  await writeFile(file, '{broken');
  await assert.rejects(readJson(file), error => error.code === 'malformed-json');
  await writeText(file, '{"value":42}');
  assert.deepEqual(await readJson(file), { value: 42 });
}));

test('dry-run creates no directories and concurrent writes leave complete content without temp files', () => fixture(async root => {
  const file = path.join(root, 'nested/data.txt');
  assert.deepEqual(await writeText(file, 'preview', { dryRun: true }), { path: file, action: 'write' });
  assert.deepEqual(await readdir(root), []);
  const contents = Array.from({ length: 8 }, (_, i) => `${i}:` + 'x'.repeat(4096));
  await Promise.all(contents.map(content => writeText(file, content)));
  assert.ok(contents.includes(await readFile(file, 'utf8')));
  assert.deepEqual(await readdir(path.dirname(file)), ['data.txt']);
}));

test('failed replacement removes its own temporary file and preserves the target', () => fixture(async root => {
  const target = path.join(root, 'directory'); await mkdir(target);
  await assert.rejects(writeText(target, 'cannot replace a directory'));
  assert.deepEqual(await readdir(root), ['directory']);
}));

test('temp sweep is age-gated and sends failures to its supplied diagnostic service', () => fixture(async root => {
  const events = [], sweep = createTempFileSweeper({ reportDegrade: (...args) => events.push(args) });
  await writeFile(path.join(root, '.tmp-old'), 'old');
  await writeFile(path.join(root, '.tmp-new'), 'new');
  await writeFile(path.join(root, 'keep'), 'ordinary file');
  await mkdir(path.join(root, '.tmp-directory'));
  for (const name of ['.tmp-old', '.tmp-directory']) await utimes(path.join(root, name), 1, 1);
  const result = await sweep(root);
  assert.deepEqual(result.removed, ['.tmp-old']);
  assert.equal(events.length, 1); assert.equal(events[0][0], 'fs');
  assert.deepEqual((await readdir(root)).sort(), ['.tmp-directory', '.tmp-new', 'keep']);
  assert.deepEqual(await sweep(path.join(root, 'absent')), { removed: [] });
}));

test('JSONL storage takes an explicit path and preserves rotation, tailing and torn lines', () => fixture(async root => {
  const file = path.join(root, 'custom/events.log');
  assert.deepEqual(readJsonlLog(file), { path: file, entries: [] });
  const sink = createJsonlLogSink(file, { proc: 'fixture', maxBytes: 1, now: () => 'fixed-time' });
  for (const code of ['a', 'b', 'c']) sink.write({ code });
  assert.deepEqual(readJsonlLog(file).entries.map(e => e.code), ['b', 'c']);
  assert.deepEqual(readJsonlLog(file, { includeRotated: false }).entries, [{ at: 'fixed-time', proc: 'fixture', code: 'c' }]);
  await writeFile(file, '{torn\n', { flag: 'a' });
  assert.deepEqual(readJsonlLog(file, { tail: 1 }).entries, [{ raw: '{torn' }]);
}));

test('a failed log event does not prevent the next event from being recorded', () => fixture(async root => {
  const file = path.join(root, 'events.log'), sink = createJsonlLogSink(file, { proc: 'fixture' });
  const circular = {}; circular.self = circular;
  assert.doesNotThrow(() => sink.write(circular));
  sink.write({ code: 'survived' });
  assert.equal(readJsonlLog(file).entries[0].code, 'survived');
}));

test('identifier validation keeps the existing accepted and refused shapes', () => {
  assert.equal(normalizeId('Feature_1.a-b'), 'Feature_1.a-b');
  for (const invalid of ['', '../outside', 'has space', null]) assert.throws(() => normalizeId(invalid), /Invalid id/);
});

test('a git positional is refused when git could read it as an option', () => {
  assert.equal(gitPositional('aof/mesh/node-1/07-02', 'branch'), 'aof/mesh/node-1/07-02');
  assert.equal(gitPositional('https://example.test/repo.git', 'remote'), 'https://example.test/repo.git');
  assert.throws(() => gitPositional('--upload-pack=touch pwned', 'branch'), /may not start with "-"/);
  assert.throws(() => gitPositional('-u', 'branch'), /may not start with "-"/);
  assert.throws(() => gitPositional('', 'branch'), /non-empty string/);
  assert.throws(() => gitPositional(undefined, 'branch'), /non-empty string/);
});
