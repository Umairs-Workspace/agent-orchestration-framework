import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loopCommand, runLoopBody } from "../../src/commands/loop.mjs";
import { invoke } from "../../src/command-core.mjs";
import { LOOP_STOPS, decideLoopScope } from "../../src/work/loop.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { completeRun, heartbeat, readRuns, runNodeRecordPath, runRecordPath, startRun } from "../../src/run-store.mjs";
import { heartbeatFromConfig } from "../../src/loop-bounds.mjs";
import { loopStopsDir, readStopRequest, requestLoopStop, stopRequestPath } from "../../src/loop/stop-request.mjs";
import { stopLoop } from "../../src/loop/stop.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";

const milestoneDoc = (status = "in-progress") => `---
type: milestone
number: 3
slug: fixture
title: Fixture
status: ${status}
depends: []
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
# Fixture
`;

const storyDoc = (status = "in-progress") => `---
type: story
number: 1
slug: ready
title: Ready
parent: 3
status: ${status}
depends: []
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
# Ready
`;

// 130/02 — `mesh` is the fixture config's `mesh` block (`{ nodeId }`, the sidecar-hydrated id
// `loadWorkspace` fills in production), absent by default so every earlier case is byte-identical.
export async function loopFixture({ milestoneStatus = "in-progress", storyStatus = "in-progress", tasks = true, uat = false, cap = 3, reviewRounds, mesh } = {}) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "aof-loop-command-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const milestoneDir = path.join(workDir, "03_milestone_fixture");
  const storyDir = path.join(milestoneDir, "stories", "01_story_ready");
  await mkdir(storyDir, { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), milestoneDoc(milestoneStatus));
  await writeFile(path.join(storyDir, "STORY.md"), storyDoc(storyStatus));
  if (tasks) {
    await mkdir(path.join(storyDir, "tasks"), { recursive: true });
    await writeFile(path.join(storyDir, "tasks", "00_ready.feature"), `${uat ? "@uat" : "@executable"}
Feature: Ready
  Scenario: ready
    Given a fixture
    When it runs
    Then it passes
`);
  }
  const workspace = {
    projectRoot,
    workDir,
    configPath: path.join(projectRoot, ".aof", "aof.config.json"),
    config: {
      work: {
        dir: "wiki/work",
        autonomous: { maxAttempts: cap },
        ...(reviewRounds === undefined ? {} : { loop: { reviewRounds } }),
      },
      ...(mesh === undefined ? {} : { mesh }),
    },
  };
  return {
    projectRoot,
    workDir,
    milestoneDir,
    storyDir,
    workspace,
    ctx: { workspace },
    cleanup: () => rm(projectRoot, { recursive: true, force: true }),
  };
}

export function replaceStatus(file, status) {
  const body = readFileSync(file, "utf8");
  writeFileSync(file, body.replace(/^status: .*$/mu, `status: ${status}`));
}

export function completingDriver(fx, { onCommand } = {}) {
  const typed = [];
  const fake = createFakePtySpawn({
    onWrite({ chunk, emitExit }) {
      const command = chunk.replace(/[\r\n]+$/u, "");
      typed.push(command);
      // milestone 70/00 (phase-brief) — the driver's first input is the directive followed
      // by the compiled brief (after "\n\n"). The directive is always the first line; feed
      // ONLY that to onCommand so the exact `/aof:<phase> <ref>` comparisons keep their
      // meaning, while `typed` retains the full input (directive + brief).
      onCommand?.(command.split("\n\n")[0]);
      emitExit(0);
    },
  });
  return {
    typed,
    spawnCalls: fake.spawnCalls,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => `session-${typed.length}`,
      commandDelayMs: 0,
    },
  };
}

export async function treeFiles(root) {
  const rows = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else rows.push(path.relative(root, target));
    }
  }
  if (existsSync(root)) await walk(root);
  return rows.sort();
}


// ══════════════════════════ milestone 130 / story 02 — THE VERB AND THE SHELL ══════════════════════════
//
// The helpers below are SHARED by the four `loop-command-*` suites (test/loop is at its ceiling;
// every 130/02 case extends one of them). The stop request's home is the ISOLATED aof home the
// runner hands every test, so `loopStopsDir()` resolves inside it and `~/.aof` is never touched.

/** A loop declaration `D` (`loopRunId` "L1", scope "03"), in the wire shape the shell writes. */
export const DECLARATION_L1 = Object.freeze({
  loopRunId: "L1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1,
  startedAt: "2026-09-13T11:00:00.000Z", id: "loop:autonomous-cascade", supervised: false,
});

/**
 * writeDeclarationRun(fx, { ref, declaration, state, node, at, heartbeatAt, failureReason }) — a
 * run record on the fixture carrying `brief.loop` = the declaration, in the state the case
 * names: `running` as minted (an optional heartbeat), `queued` by rewriting the minted record's
 * state (the shape a run has before its start), a terminal state through the store's own edge.
 */
export async function writeDeclarationRun(fx, { ref = "03/01", declaration = DECLARATION_L1, state = "running", node = null, at = "2026-09-13T11:00:00.000Z", heartbeatAt = null, failureReason = null } = {}) {
  const item = await resolveItemExact(fx.ctx, ref);
  const record = await startRun(item, { brief: { loop: declaration }, now: at, node });
  if (heartbeatAt != null) await heartbeat(item, record.runId, { now: heartbeatAt });
  if (state === "queued") {
    const file = node == null ? runRecordPath(item, record.runId) : runNodeRecordPath(item, node, record.runId);
    const raw = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file, `${JSON.stringify({ ...raw, state: "queued", outcome: null }, null, 2)}\n`);
  }
  if (state === "done" || state === "failed" || state === "cancelled") {
    await completeRun(item, { runId: record.runId, outcome: state, failureReason, now: at });
  }
  return { item, record: (await readRuns(item)).find((run) => run.runId === record.runId) };
}

/**
 * fakeStopSource({ level, producer, request, reads }) — the seven members of 130/ADR-001 §5 with
 * the LEVEL set by the test: `raise(level, producer)` at any moment (a drive's `onCommand`, a
 * `readChangeBaseline` hook, the Nth `poll()` through `onPoll`), the `signal` its own
 * controller's (aborted the moment the level reaches 2), and every `poll()`/`start()`/`stop()`
 * recorded. With `reads: { dir, loopRunId }`, `request()` answers what the test wrote to `dir`
 * (read at every poll, after `onPoll`, as the real source reads it) — the level is still the
 * test's own. `registrations` records every `addEventListener` on the signal: the driver
 * registers its abort listener on the signal it was handed, once per session it spawns.
 */
export function fakeStopSource({ level = 0, producer = null, request = null, reads = null } = {}) {
  const controller = new AbortController();
  const calls = { poll: 0, start: 0, stop: 0 };
  const state = { level, producer, request };
  const registrations = [];
  const { signal } = controller;
  const addEventListener = signal.addEventListener.bind(signal);
  signal.addEventListener = (type, listener, options) => { registrations.push(type); return addEventListener(type, listener, options); };
  const source = {
    calls,
    registrations,
    onPoll: null,
    level: () => state.level,
    producer: () => state.producer,
    request: () => state.request,
    signal,
    raise(to, by) {
      if (to > state.level) { state.level = to; state.producer = by; }
      if (state.level >= 2 && !controller.signal.aborted) controller.abort();
    },
    async poll() {
      calls.poll += 1;
      if (typeof source.onPoll === "function") await source.onPoll(calls.poll);
      if (reads != null) state.request = await readStopRequest(reads.dir, reads.loopRunId);
      return state.request;
    },
    start() { calls.start += 1; },
    stop() { calls.stop += 1; },
  };
  if (level >= 2) controller.abort();
  return source;
}

/**
 * cancellableDriver(fx, { script, onCommand, sessionId }) — a driver double over the REAL session
 * driver (the fake occupies only the pty seam), so `options.signal` is honoured exactly as the
 * real driver honours it (129/02's `signal` seam, its own stop bracket): an abort while the session is
 * live ends it through the driver's own stop bracket and resolves `{ failed, cancelled,
 * sessionId }`; an abort before the spawn is the driver's pre-spawn answer (`sessionId: null`).
 * `script[n]` is what the Nth spawn resolves when nothing cancels it: `{ outcome: "done" }` (the
 * default past the script's end), `{ outcome: "failed", failureReason }`, `{ outcome:
 * "needs-input" }`, or the word `"hold"` — the session stays open until the source's abort ends
 * it. `onCommand(directive, n)` runs when the Nth spawn's directive is typed — the in-flight
 * moment; a test raises the source's level there.
 */
export function cancellableDriver(fx, { script = [], onCommand, sessionId = "sess-1" } = {}) {
  const typed = [];
  // One completion slot per spawn, created lazily by whichever side reaches it first: the typed
  // directive (which resolves a scripted non-done outcome into it) or the driver's own watch.
  const slots = [];
  const slot = (n) => (slots[n] ??= (() => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; })());
  let spawned = 0;
  let watched = 0;
  const fake = createFakePtySpawn({
    onWrite({ chunk, emitExit }) {
      const command = chunk.replace(/[\r\n]+$/u, "");
      if (command === "") return;
      const n = spawned;
      const directive = command.split("\n\n")[0];
      typed.push(directive);
      const scripted = script[n - 1] ?? { outcome: "done" };
      Promise.resolve(onCommand?.(directive, n)).then(() => {
        if (scripted === "hold") return;
        if (scripted.outcome === "done") emitExit(0);
        else slot(n).resolve(scripted);
      });
    },
  });
  return {
    typed,
    spawnCalls: fake.spawnCalls,
    options: {
      ptySpawn: async (...args) => { spawned += 1; return await fake.spawn(...args); },
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => sessionId,
      // A scripted non-done outcome rides the watch (the shape `watcherDriver` scripts in the
      // stops suite); a `done` is the pty's own clean exit; a held session settles only through
      // the driver's stop bracket, which the source's abort requests.
      watchTranscriptCompletion: async () => { watched += 1; return await slot(watched).promise; },
      commandDelayMs: 0,
    },
  };
}

/** The isolated home's `loop-stops` directory listing (`[]` when it does not exist). */
export async function loopStopsFiles() {
  return await treeFiles(loopStopsDir());
}

/** Empties the isolated home's `loop-stops` — the runner's home is per TEST, and an outline's rows share it. */
export async function resetLoopStops() {
  await rm(loopStopsDir(), { recursive: true, force: true });
}

/** The last line the shell printed, and all of them. */
export async function runCollected(input, ctx) {
  const lines = [];
  const state = await runLoopBody(input, { ...ctx, report: (line) => lines.push(line) });
  return { state, lines, last: lines.at(-1) ?? "" };
}

export const loopCommandProbeTests = [
  {
    name: "loop command probe — returns the exact frozen document and passes work:next through verbatim without writes",
    async run() {
      const fx = await loopFixture();
      try {
        const fake = completingDriver(fx);
        const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
        const before = await treeFiles(fx.projectRoot);
        const next = await invoke("work:next", { scope: "03" }, ctx);
        const result = await loopCommand.run({ scope: "03" }, ctx);
        assert.deepEqual(Object.keys(result), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
        assert.deepEqual(result.next, next);
        assert.deepEqual(result.stops, [...LOOP_STOPS]);
        assert.deepEqual(result.driven, []);
        assert.deepEqual(Object.keys(result.resumable), ["stranded", "lastDeclaration"]);
        assert.equal(result.level, "L2");
        assert.equal(result.cap, 3);
        assert.equal(fake.spawnCalls.length, 0);
        assert.deepEqual(await treeFiles(fx.projectRoot), before);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop command probe — loop ids are invocation-local and dry-run selects the human probe",
    async run() {
      const fx = await loopFixture();
      try {
        const first = await loopCommand.run({ scope: "03", level: "L1", cap: 5 }, fx.ctx);
        const second = await loopCommand.run({ scope: "03", level: "L1", cap: 5 }, fx.ctx);
        assert.notEqual(first.loopRunId, second.loopRunId);
        assert.equal(first.level, "L1");
        assert.equal(first.cap, 5);
        assert.equal(loopCommand.cli.launch({ dryRun: true }), null);
        assert.equal(typeof loopCommand.cli.launch({}), "function");
        assert.match(loopCommand.cli.render(first), /03.*L1.*cap 5/u);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "loop command probe — a finished scope is done and still carries all ten keys",
    async run() {
      const fx = await loopFixture({ milestoneStatus: "done", storyStatus: "done" });
      try {
        const result = await loopCommand.run({ scope: "03" }, fx.ctx);
        assert.equal(result.state, "done");
        assert.deepEqual(result.act, { act: "done" });
        assert.equal(Object.keys(result).length, 10);
      } finally {
        await fx.cleanup();
      }
    },
  },

  // ══════════════ 130/02 task 00 — --stop is a flag in three homes, never enters the body ══════════════
  {
    name: "130/02 task00 the three homes and the usage carry the flag, and FF-12602 leg 4 admits the ninth property and the eighth flag",
    async run() {
      const command = loopCommand;
      assert.deepEqual(command.input.properties.stop, { type: "boolean" });
      assert.equal(command.input.additionalProperties, false);
      assert.deepEqual(command.input.required, ["scope"]);
      assert.equal(command.cli.spec.flags.stop.type, "boolean");
      assert.ok(typeof command.cli.spec.flags.stop.description === "string" && command.cli.spec.flags.stop.description.length > 0);
      assert.match(command.cli.spec.usage, /\[--stop\]/u);
      assert.deepEqual(Object.keys(command.input.properties).sort(), ["cap", "dryRun", "level", "quiet", "resume", "reviewClaims", "scope", "stop", "supervised"], "nine properties");
      assert.equal(Object.keys(command.cli.spec.flags).length, 8, "eight flags");
      assert.equal(command.cli.launch({ dryRun: true }), null);
      assert.equal(command.cli.launch({ stop: true }), null);
    },
  },
  {
    name: "130/02 task00 [outline] argv shapes the flag only when it is passed, as --resume and --dry-run are (5 rows)",
    async run() {
      const rows = [
        [{ stop: true }, { scope: "03", stop: true }],
        [{}, { scope: "03" }],
        [{ stop: false }, { scope: "03" }],
        [{ stop: true, dryRun: true }, { scope: "03", stop: true, dryRun: true }],
        [{ stop: true, resume: true }, { scope: "03", stop: true, resume: true }],
      ];
      for (const [options, input] of rows) assert.deepEqual(loopCommand.cli.argv(["03"], options), input, JSON.stringify(options));
    },
  },
  {
    name: "130/02 task00 [outline] launch keeps a stop on the probe side, as it keeps dry-run (8 rows)",
    async run() {
      for (const options of [{ stop: true }, { dryRun: true }, { stop: true, dryRun: true }, { stop: true, quiet: true }, { stop: true, resume: true }]) {
        assert.equal(loopCommand.cli.launch(options), null, JSON.stringify(options));
      }
      for (const options of [{}, { resume: true }, { quiet: true }]) {
        assert.equal(typeof loopCommand.cli.launch(options), "function", JSON.stringify(options));
      }
    },
  },
  {
    name: "130/02 task00 stop with resume is refused by code before any read, and writes nothing",
    async run() {
      const fx = await loopFixture();
      try {
        const reads = [];
        // The spy: a workspace whose every read is recorded — the core reaches `workDir` first.
        const spied = new Proxy(fx.workspace, { get(target, key) { reads.push(String(key)); return target[key]; } });
        await assert.rejects(
          loopCommand.run({ scope: "03", stop: true, resume: true }, { workspace: spied }),
          (error) => error.code === "loop-stop-exclusive" && error.status === 400,
        );
        assert.deepEqual(reads, [], "no read of the workspace at all");
        assert.deepEqual(await loopStopsFiles(), [], "no request file was written");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task00 [outline] run dispatches on stop alone — the probe without it, the seven-key document with it, and no project-tree write either way (6 rows)",
    async run() {
      const rows = [
        { input: { scope: "03" }, answer: "probe", files: [] },
        { input: { scope: "03", stop: false }, answer: "probe", files: [] },
        { input: { scope: "03", stop: true }, answer: "stop", files: ["L1.json"] },
        { input: { scope: "03", stop: true, dryRun: true }, answer: "stop", files: ["L1.json"] },
        { input: { scope: "03", stop: true, quiet: true }, answer: "stop", files: ["L1.json"] },
        { input: { scope: "03", stop: true, level: "L1", cap: 9 }, answer: "stop", files: ["L1.json"] },
      ];
      let reference = null;
      for (const row of rows) {
        await resetLoopStops();
        const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
        try {
          await writeDeclarationRun(fx, { state: "running", at: new Date().toISOString() });
          const fake = completingDriver(fx);
          const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
          const before = await treeFiles(fx.projectRoot);
          const result = await loopCommand.run(row.input, ctx);
          if (row.answer === "probe") {
            assert.deepEqual(Object.keys(result), ["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"], JSON.stringify(row.input));
          } else {
            assert.deepEqual(Object.keys(result), ["ok", "loopRunId", "scope", "live", "request", "state", "path"], JSON.stringify(row.input));
            assert.equal(result.loopRunId, "L1");
            const comparable = { ...result, path: path.basename(result.path) };
            if (row.input.level != null) assert.deepEqual(comparable, reference, "level and cap play no part in a stop");
            else reference = comparable;
          }
          if (row.answer === "probe") assert.equal(existsSync(loopStopsDir()), false, "loop-stops does not exist after a probe");
          else assert.deepEqual(await loopStopsFiles(), row.files, JSON.stringify(row.input));
          assert.deepEqual(await treeFiles(fx.projectRoot), before, "no file under the project tree was minted or rewritten");
          assert.equal(fake.spawnCalls.length, 0);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task00 the board route table is untouched — work:loop stays BOARD_DEFERRED and src/board-ui.mjs names no /api/work/loop",
    async run() {
      const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
      const coverage = await readFile(path.join(root, "test", "arch", "work", "acd-work-command-route-coverage.test.mjs"), "utf8");
      const deferred = /const BOARD_DEFERRED = new Set\(\[([\s\S]*?)\]\)/u.exec(coverage);
      assert.ok(deferred, "BOARD_DEFERRED is a literal set in the route-coverage control");
      assert.match(deferred[1], /"loop"/u, "work:loop is still deferred");
      assert.doesNotMatch(await readFile(path.join(root, "src", "board-ui.mjs"), "utf8"), /\/api\/work\/loop/u);
    },
  },

  // ══════════════ 130/02 task 01 — stopLoop resolves the scope's loop and writes through one core ══════════════
  {
    name: "130/02 task01 [outline] liveness is the record's own, and the request is written either way (8 rows)",
    async run() {
      const NOW = new Date("2026-09-13T12:00:00.000Z");
      const heartbeatMs = 15 * 60 * 1000;
      const rows = [
        { run: { state: "running", heartbeatAt: new Date(NOW.getTime() - heartbeatMs + 1).toISOString() }, live: true },
        { run: { state: "running", heartbeatAt: new Date(NOW.getTime() - heartbeatMs).toISOString() }, live: true },
        { run: { state: "running", heartbeatAt: new Date(NOW.getTime() - heartbeatMs - 1).toISOString() }, live: false },
        { run: { state: "running", at: new Date(NOW.getTime() - 1000).toISOString() }, live: true },
        { run: { state: "queued" }, live: false },
        { run: { state: "done" }, live: false },
        { run: { state: "failed", failureReason: "timeout" }, live: false },
        { run: { state: "cancelled" }, live: false },
      ];
      for (const row of rows) {
        await resetLoopStops();
        const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
        try {
          assert.equal(heartbeatFromConfig(fx.workspace), heartbeatMs, "the fixture resolves the 15-minute default");
          await writeDeclarationRun(fx, { ...row.run });
          const answer = await stopLoop(fx.workspace, { scope: "03", now: () => new Date(NOW) });
          const expectedState = row.live ? "requested" : "honoured";
          assert.deepEqual(answer, { ok: true, loopRunId: "L1", scope: "03", live: row.live, request: "drain", state: expectedState, path: stopRequestPath(loopStopsDir(), "L1") }, JSON.stringify(row.run));
          assert.deepEqual(Object.keys(answer), ["ok", "loopRunId", "scope", "live", "request", "state", "path"]);
          const file = JSON.parse(await readFile(answer.path, "utf8"));
          assert.equal(file.level, 1);
          assert.equal(file.state, expectedState);
          assert.deepEqual(file.by, { node: "umamis-msi", pid: process.pid });
          assert.equal(file.workspaceId, null);
          assert.equal(file.honouredAt, row.live ? null : NOW.toISOString());
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task01 [outline] the second call escalates a live loop, a third is idempotent, and a honoured request is not re-opened (2 rows)",
    async run() {
      const NOW = new Date("2026-09-13T12:00:00.000Z");
      const rows = [
        { run: { state: "running", at: NOW.toISOString() }, answers: [["drain", "requested"], ["cancel", "requested"], ["cancel", "requested"]], level: 2 },
        { run: { state: "done" }, answers: [["drain", "honoured"], ["drain", "honoured"], ["drain", "honoured"]], level: 1 },
      ];
      for (const row of rows) {
        await resetLoopStops();
        const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
        try {
          await writeDeclarationRun(fx, { ...row.run });
          const answers = [];
          let afterSecond = null;
          for (let call = 0; call < 3; call += 1) {
            const answer = await stopLoop(fx.workspace, { scope: "03", now: () => new Date(NOW) });
            answers.push([answer.request, answer.state]);
            if (call === 1) {
              afterSecond = await readFile(answer.path, "utf8");
              assert.equal(JSON.parse(afterSecond).level, row.level);
            }
            if (call === 2) assert.equal(await readFile(answer.path, "utf8"), afterSecond, "byte-identical after the third call");
          }
          assert.deepEqual(answers, row.answers, JSON.stringify(row.run));
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task01 [outline] refusals are coded documents, never throws — and nothing is written (7 rows)",
    async run() {
      const NOW = () => new Date("2026-09-13T12:00:00.000Z");
      const rows = [
        { scope: "nope", code: "loop-stop-scope" },
        { scope: "", code: "loop-stop-scope" },
        { scope: "05-03", code: "loop-stop-scope", message: /lo is greater than hi/u },
        { scope: "03/01", code: "loop-stop-scope" },
        { scope: "04", code: "loop-stop-no-declaration", message: /04.*aof work loop 04/u },
        { scope: "03", code: "loop-stop-no-declaration", situation: "bare-drive", message: /03.*aof work loop 03/u },
        { scope: "03", code: "loop-stop-not-local", situation: "remote", message: /umamis-mac-mini.*umamis-msi.*stop it on umamis-mac-mini's own console/u },
      ];
      for (const row of rows) {
        await resetLoopStops();
        const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
        try {
          if (row.situation === "bare-drive") {
            const item = await resolveItemExact(fx.ctx, "03/01");
            await startRun(item, { brief: {}, now: NOW().toISOString() });
          }
          if (row.situation === "remote") await writeDeclarationRun(fx, { state: "running", node: "umamis-mac-mini", at: NOW().toISOString() });
          const answer = await stopLoop(fx.workspace, { scope: row.scope, now: NOW });
          assert.deepEqual(Object.keys(answer), ["ok", "code", "message"], `${row.scope}: the refusal shape`);
          assert.equal(answer.ok, false);
          assert.equal(answer.code, row.code, `${row.scope}: ${answer.message}`);
          assert.ok(typeof answer.message === "string" && answer.message.length > 0);
          if (row.message) assert.match(answer.message, row.message);
          if (row.code === "loop-stop-scope") assert.equal(answer.message, decideLoopScope(row.scope).reason, "the scope refusal's own message");
          assert.equal(existsSync(loopStopsDir()), false, `${row.scope}: loop-stops was not created`);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task01 [outline] locality is decided only when both sides name a node (4 rows)",
    async run() {
      const NOW = () => new Date("2026-09-13T12:00:00.000Z");
      const rows = [
        { node: null, nodeId: "umamis-msi", byNode: "umamis-msi" },
        { node: "umamis-msi", nodeId: "umamis-msi", byNode: "umamis-msi" },
        { node: "", nodeId: "umamis-msi", byNode: "umamis-msi" },
        { node: "umamis-mac-mini", nodeId: undefined, byNode: null },
      ];
      for (const row of rows) {
        await resetLoopStops();
        const fx = await loopFixture(row.nodeId === undefined ? {} : { mesh: { nodeId: row.nodeId } });
        try {
          await writeDeclarationRun(fx, { state: "running", node: row.node === "" ? null : row.node, at: NOW().toISOString() });
          if (row.node === "") {
            // An empty node string reads as absent (`meshNodeIdOf`'s own `length > 0` rule): write it onto the record.
            const item = await resolveItemExact(fx.ctx, "03/01");
            const [run] = await readRuns(item);
            const file = runRecordPath(item, run.runId);
            await writeFile(file, `${JSON.stringify({ ...JSON.parse(await readFile(file, "utf8")), node: "" }, null, 2)}\n`);
          }
          const answer = await stopLoop(fx.workspace, { scope: "03", now: NOW });
          assert.equal(answer.ok, true, JSON.stringify(row) + " " + answer.message);
          assert.equal(answer.live, true);
          assert.equal(JSON.parse(await readFile(answer.path, "utf8")).by.node, row.byNode);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task01 [outline] the latest declaration in scope is the target, whatever item it sits on (4 rows)",
    async run() {
      const T1 = "2026-09-13T11:00:00.000Z";
      const NOW = () => new Date("2026-09-13T12:00:00.000Z");
      const L2 = { ...DECLARATION_L1, loopRunId: "L2" };
      const rows = [
        { scope: "01-05", l1: { state: "done" }, t2: "2026-09-13T11:30:00.000Z", where: "split", target: "L2", live: false },
        { scope: "03", l1: { state: "running" }, t2: "2026-09-13T11:30:00.000Z", where: "same", target: "L2", live: false },
        { scope: "03", l1: { state: "done" }, t2: T1, where: "same", target: "L2", live: false },
        { scope: "03", l1: { state: "running" }, t2: "2026-09-13T10:30:00.000Z", where: "same", target: "L1", live: true },
      ];
      for (const row of rows) {
        await resetLoopStops();
        const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
        try {
          let l2Ref = "03/01";
          if (row.where === "split") {
            const dir = path.join(fx.workDir, "05_milestone_other", "stories", "01_story_other");
            await mkdir(dir, { recursive: true });
            await writeFile(path.join(fx.workDir, "05_milestone_other", "SPEC.md"), milestoneDoc().replace("number: 3", "number: 5").replace("slug: fixture", "slug: other"));
            await writeFile(path.join(dir, "STORY.md"), storyDoc().replace("parent: 3", "parent: 5").replace("slug: ready", "slug: other"));
            l2Ref = "05/01";
          }
          // L1's record is created at T1 (heartbeat fresh when running), L2's at t2. `runId` mints
          // lexically after `createdAt`, so an equal instant orders by the mint. A running L1 on
          // the item would wall a later mint on it (the dedup guard), so L2 is written first then.
          const writeL1 = () => writeDeclarationRun(fx, { ref: "03/01", declaration: DECLARATION_L1, state: row.l1.state, at: T1, ...(row.l1.state === "running" ? { heartbeatAt: NOW().toISOString() } : {}) });
          const writeL2 = () => writeDeclarationRun(fx, { ref: l2Ref, declaration: L2, state: "done", at: row.t2 });
          if (row.l1.state === "running") { await writeL2(); await writeL1(); } else { await writeL1(); await writeL2(); }
          const dir = loopStopsDir();
          await requestLoopStop(dir, { loopRunId: "L-old", scope: "03", workspaceId: null, by: { node: "x", pid: 1 }, now: NOW });
          const oldBytes = await readFile(stopRequestPath(dir, "L-old"), "utf8");
          const answer = await stopLoop(fx.workspace, { scope: row.scope, now: NOW });
          assert.equal(answer.ok, true, JSON.stringify(row) + " " + answer.message);
          assert.equal(answer.loopRunId, row.target, JSON.stringify(row));
          assert.equal(answer.scope, row.scope);
          assert.equal(answer.live, row.live, JSON.stringify(row));
          assert.equal(JSON.parse(await readFile(stopRequestPath(dir, row.target), "utf8")).scope, row.scope);
          assert.equal(await readFile(stopRequestPath(dir, "L-old"), "utf8"), oldBytes, "L-old's file is byte-identical");
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task01 a foreground loop is stoppable — supervised plays no part",
    async run() {
      const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
      try {
        await writeDeclarationRun(fx, { declaration: { ...DECLARATION_L1, supervised: false }, state: "running", at: new Date().toISOString() });
        const answer = await stopLoop(fx.workspace, { scope: "03" });
        assert.equal(answer.ok, true, answer.message);
        assert.equal(answer.live, true);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "130/02 task01 [outline] the command face maps the document to the CLI contract (5 rows)",
    async run() {
      const NOW = () => new Date("2026-09-13T12:00:00.000Z");
      // The two `ok: true` rows against the real core (a live loop, then its escalation on a dead
      // one); the three refusals against the real core's own coded answers.
      const fx = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
      try {
        await writeDeclarationRun(fx, { state: "running", at: NOW().toISOString() });
        const first = await loopCommand.run({ scope: "03", stop: true, now: NOW() }, fx.ctx);
        assert.deepEqual(first, { ok: true, loopRunId: "L1", scope: "03", live: true, request: "drain", state: "requested", path: stopRequestPath(loopStopsDir(), "L1") });
        assert.equal(loopCommand.cli.render(first), `03 — stop requested (drain) for loop L1, live. ${first.path}`);
        assert.deepEqual(loopCommand.cli.json(first), first, "json answers the document verbatim");
        // Not live now (the heartbeat aged past the threshold): the second call escalates.
        const second = await loopCommand.run({ scope: "03", stop: true, now: new Date("2026-09-13T13:00:00.000Z") }, fx.ctx);
        assert.equal(loopCommand.cli.render(second), `03 — stop requested (cancel) for loop L1, not live. ${second.path}`);
      } finally {
        await fx.cleanup();
      }
      for (const [scope, code, status, seed] of [["04", "loop-stop-no-declaration", 404, null], ["03", "loop-stop-not-local", 409, "remote"], ["nope", "loop-stop-scope", 409, null]]) {
        await resetLoopStops();
        const fx2 = await loopFixture({ mesh: { nodeId: "umamis-msi" } });
        try {
          if (seed === "remote") await writeDeclarationRun(fx2, { state: "running", node: "umamis-mac-mini", at: NOW().toISOString() });
          const expected = await stopLoop(fx2.workspace, { scope, now: NOW });
          await assert.rejects(
            loopCommand.run({ scope, stop: true, now: NOW() }, fx2.ctx),
            (error) => error.code === code && error.status === status && error.message === expected.message,
            `${scope}: ${code} ${status}`,
          );
        } finally {
          await fx2.cleanup();
        }
      }
    },
  },
  {
    name: "130/02 task01 [outline] the child process prints the document or the refusal and exits accordingly (3 rows)",
    async run() {
      const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
      const cliPath = path.join(root, "bin", "aof.mjs");
      const rows = [
        { seed: true, flags: ["--json"], exit: 0 },
        { seed: true, flags: [], exit: 0 },
        { seed: false, flags: [], exit: 1 },
      ];
      for (const row of rows) {
        await resetLoopStops();
        const fx = await loopFixture();
        try {
          if (row.seed) await writeDeclarationRun(fx, { state: "running", at: new Date().toISOString() });
          const env = { ...process.env, AOF_GLOBAL_HOME: process.env.AOF_GLOBAL_HOME };
          const spawned = spawnCliSync(process.execPath, [cliPath, "work", "loop", "03", "--stop", ...row.flags], { cwd: fx.projectRoot, encoding: "utf8", env });
          assert.equal(spawned.status, row.exit, `${row.flags.join(" ")}: ${spawned.stderr}`);
          if (!row.seed) {
            assert.equal(spawned.stdout, "");
            assert.match(spawned.stderr, /loop-stop-no-declaration/u);
            continue;
          }
          const file = JSON.parse(await readFile(stopRequestPath(loopStopsDir(), "L1"), "utf8"));
          assert.ok(Number.isFinite(Date.parse(file.requestedAt)), "requestedAt is an ISO instant");
          if (row.flags.includes("--json")) {
            const parsed = JSON.parse(spawned.stdout);
            assert.deepEqual(Object.keys(parsed), ["ok", "loopRunId", "scope", "live", "request", "state", "path"]);
            assert.equal(parsed.loopRunId, "L1");
            assert.equal(parsed.live, true);
          } else {
            assert.equal(spawned.stdout.trim().split(/\r?\n/u).length, 1, "nothing else is printed");
            assert.match(spawned.stdout, /^03 — stop requested \(drain\) for loop L1, live\. /u);
          }
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
];
