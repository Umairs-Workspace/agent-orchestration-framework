import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readdir, readFile, writeFile, utimes, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDegradeReporter } from '@aof/foundation/degrade';
import { createJsonlLogSink, readJsonlLog } from '@aof/foundation/log';
import { readJson, writeText, normalizeId, createTempFileSweeper } from '@aof/foundation/fs';
import { gitPositional } from '@aof/foundation/git-args';
import { trimRun } from '@aof/foundation/text';
import { COST_CAUSES, DAEMON_BUDGET, createCostMeter, judge, requestClient, startCostSnapshots } from '@aof/foundation/cost-meter';

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

test('trimRun strips a leading/trailing character run in linear time', () => {
  assert.equal(trimRun('--a-b--', '-'), 'a-b');
  assert.equal(trimRun('..a.lock..', '.', { end: false }), 'a.lock..');
  assert.equal(trimRun('abc==', '=', { start: false }), 'abc');
  assert.equal(trimRun('C:\\proj\\//', '\\/', { start: false }), 'C:\\proj');
  assert.equal(trimRun('----', '-'), '');
  const hostile = 'a' + '-'.repeat(200_000) + 'b';
  const started = performance.now();
  assert.equal(trimRun(hostile, '-'), hostile);
  assert.ok(performance.now() - started < 1_000, 'a long interior run is not rescanned');
});

// ── 167/00 — the cost meter ─────────────────────────────────────────────────────────────
// Traceability: 167_milestone_daemon-stays-within-a-resource-budget/stories/00_story_the-daemon-says-what-it-costs/
//   tasks/00_each-daemon-counts-its-work.feature (@executable). Driven over an injected clock, CPU
//   reader and ticker, so nothing here waits on the wall clock.
function fakeProcess() {
  const state = { now: Date.parse('2026-10-20T18:00:00.000Z'), cpu: 0, active: 0, idle: 0 };
  const meter = createCostMeter({ clock: () => state.now, cpuMicros: () => state.cpu, eventLoop: () => ({ active: state.active, idle: state.idle }), pid: 4242 });
  const advance = (seconds, { cpuShare = 0.01 } = {}) => {
    state.now += seconds * 1000; state.cpu += seconds * 1_000_000 * cpuShare;
    state.active += seconds * 1000 * cpuShare; state.idle += seconds * 1000 * (1 - cpuShare);
  };
  return { state, meter, advance };
}
function manualTicker() {
  const handles = [];
  return { handles, start(seconds, onTick) { const handle = { seconds, onTick, stopped: false }; handles.push(handle); return handle; }, stop(handle) { handle.stopped = true; } };
}

test('167/00 a cause outside the closed set is refused', () => {
  const { meter } = fakeProcess();
  assert.throws(() => meter.count('cpu-spike'), (error) => /cpu-spike/.test(error.message) && COST_CAUSES.every((name) => error.message.includes(name)));
  const lenient = createCostMeter({ strict: false });
  assert.doesNotThrow(() => lenient.count('cpu-spike'));
  assert.deepEqual(lenient.snapshot({ daemon: 'serve' }).refused, ['cpu-spike'], 'a production meter drops it and says so');
});

for (const [daemon, elapsed, event, written] of [['serve', 14, 'nothing', null], ['serve', 15, 'nothing', 15], ['ui', 31, 'nothing', 30], ['ui', 20, 'stop', 20]]) {
  test(`167/00 each daemon writes its snapshot every 15 seconds and at a clean stop — ${daemon} after ${elapsed}s, ${event}`, async () => {
    const { state, meter, advance } = fakeProcess();
    const started = state.now, ticker = manualTicker(), written_ = [];
    const writer = startCostSnapshots({ meter, daemon, ticker, publish: (snapshot) => { written_.push(snapshot); } });
    assert.equal(ticker.handles[0].seconds, 15, 'the writer ticks every 15 seconds');
    for (let second = 1; second <= elapsed; second++) { advance(1); if (second % 15 === 0) ticker.handles[0].onTick(); }
    if (event === 'stop') await writer.stop();
    await Promise.resolve();
    const last = written_.at(-1);
    if (written === null) assert.equal(last, undefined, 'no snapshot yet');
    else {
      assert.equal((Date.parse(last.at) - started) / 1000, written);
      assert.equal(last.daemon, daemon);
    }
    if (event === 'stop') assert.equal(ticker.handles[0].stopped, true, 'the stop also stops the ticker');
  });
}

test('167/00 a snapshot carries what the readers need', () => {
  const { meter, advance } = fakeProcess();
  for (let tick = 1; tick <= 5; tick++) {
    advance(15, { cpuShare: 0.02 });
    meter.sample();
    if (tick === 5) for (let read = 0; read < 40; read++) meter.count('full-disk-read', { workspaceId: 'aof' });
  }
  const snapshot = meter.snapshot({ daemon: 'serve' });
  assert.deepEqual([snapshot.daemon, snapshot.pid, snapshot.at], ['serve', 4242, '2026-10-20T18:01:15.000Z'], 'its pid, the daemon and the time');
  assert.equal(snapshot.cpuPercent, 2, 'its CPU share over the last 60 seconds');
  assert.equal(snapshot.cpuPercentSinceStart, 2, '…and since start');
  assert.equal(snapshot.windowSeconds, 60);
  assert.equal(snapshot.eventLoopUtilization, 0.02, 'its event-loop utilisation');
  assert.equal(snapshot.state, 'idle', 'its state');
  assert.deepEqual(snapshot.topCauses, [{ cause: 'full-disk-read', labels: { workspaceId: 'aof' }, count: 40 }], 'its top causes with their labels');
  assert.deepEqual(judge(snapshot), { state: 'idle', budgetPercent: DAEMON_BUDGET.idlePercent, over: false });
});

test('167/00 a fleet or board request makes the daemon viewer-open for 30 seconds', () => {
  const { meter, advance } = fakeProcess();
  meter.count('request', { route: '/api/mesh/status', client: requestClient('fleet') });
  assert.equal(meter.snapshot().state, 'viewer-open');
  advance(31);
  assert.equal(meter.snapshot().state, 'idle');
  meter.count('request', { route: '/api/mesh/status', client: requestClient(undefined) });
  assert.equal(meter.snapshot().state, 'idle', 'an unknown client opens no view');
  assert.equal(meter.total('request', { client: 'unknown' }), 1);
});

test('167/00 E3 · a degrade raised while reading a workspace names it, and every report is counted through the throttle', () => {
  let now = 10_000;
  const lines = [];
  const { meter } = fakeProcess();
  const reporter = createDegradeReporter({ clock: () => now, meter, createSink: () => ({ write: (event) => lines.push(event) }) });
  for (let read = 0; read < 40; read++) { reporter.reportDegrade('work-read-cache-unavailable', 'no rows', { workspaceId: '52294b307214c27d' }); now += 1_500; }
  assert.equal(lines[0].workspaceId, '52294b307214c27d', 'the degrade line carries workspaceId');
  assert.ok(lines.length <= 12, `the throttle still drops lines (${lines.length})`);
  assert.equal(meter.total('degrade', { code: 'work-read-cache-unavailable' }), 40, 'every report is counted');
  assert.equal(meter.total('degrade', { workspaceId: '52294b307214c27d' }), 40);
});
