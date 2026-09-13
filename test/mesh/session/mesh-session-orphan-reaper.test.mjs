// Traceability wiring for milestone 48 / story 00
// tasks/02_orphan-reaper.feature — "a session that expires leaves disk — swept by the
// owning node, at the write seam, under the one shared liveness predicate".
//
// Every @executable scenario (and every Scenario Outline Examples row) below runs the
// REAL `aof session` command over a hermetic fixture repo + a fixture AOF_GLOBAL_HOME,
// with an injected clock, and every Then is a file that exists or does not exist after
// a real command ran. Records are PLANTED directly on disk (the feature's own
// instruction) rather than derived, so this task never re-asserts task 00's ladder or
// task 01's key.
//
// THE TTL IS THE DOCUMENTED ONE, REUSED. The fixture pins
// `config.mesh.session.ttlSeconds = 60` and every age below is expressed against it —
// no scenario invents a threshold, and the reaper reading that knob off the workspace
// config is itself part of what this proves. `DEFAULT_SESSION_TTL_SECONDS` (120) stays
// the documented fallback and is asserted to still be the value an unconfigured
// workspace gets.
//
// The STRUCTURAL claims (the reap imports the shared predicate, contains no second
// staleness comparison, sweeps only this node's leaves, and is invoked by
// start/ping) are the fitness function test/arch/session/acd-session-orphan-reaped.test.mjs.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { meshSessionCommand } from "../../../src/commands/mesh/session.mjs";
import { readSessionRecord, reapExpiredSessions, sessionRecordPath, resolveSessionTtlSeconds, DEFAULT_SESSION_TTL_SECONDS } from "../../../src/mesh/session.mjs";
import { readLiveSessions } from "../../../src/mesh/presence.mjs";
import { setDegradeSinkForTest } from "../../../src/degrade.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const NODE_ID = "node-a";
const PEER_NODE_ID = "node-b";
const NOW = "2026-08-10T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const TTL_SECONDS = 60;
const TTL_MS = TTL_SECONDS * 1000;

async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-session-orphan-reaper-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "demo", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID, session: { ttlSeconds: TTL_SECONDS } } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  const sessionsDir = path.join(home, "mesh", "sessions");
  await mkdir(sessionsDir, { recursive: true });
  const ws = await loadWorkspace(root, undefined, { env });
  assert.equal(resolveSessionTtlSeconds(ws.config), TTL_SECONDS, "the fixture's TTL is the one the real resolver reads off config");
  return { tmp, root, home, env, sessionsDir, ws };
}

function ctxFor(fixture, { now = NOW } = {}) {
  return {
    cwd: fixture.root,
    env: {},
    nodeId: NODE_ID,
    stdinText: "",
    now: () => now,
    loadWorkspace: (workingDir, config) => loadWorkspace(workingDir, config, { env: fixture.env }),
  };
}

async function runCommand(args, ctx) {
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  process.exitCode = undefined;
  console.log = (message) => logs.push(message);
  console.error = () => undefined;
  try {
    await meshSessionCommand(args, ctx);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  const exitCode = process.exitCode;
  process.exitCode = originalExitCode;
  return { logs, exitCode };
}

// `aof session ping` for SOME OTHER session on this node — the write seam that carries
// the sweep. Never the planted record's own key.
const pingSomeOtherSession = (fixture, { now = NOW } = {}) =>
  runCommand(["ping", "--workspace", "ws-mine", "--repo", "demo", "--assistant", "claude-code", "--session", "sess-mine"], ctxFor(fixture, { now }));

// Plant a record file DIRECTLY on disk: the point of every scenario here is a leaf
// that is ALREADY there when a real session write runs.
async function plantRecord(fixture, { leaf, nodeId = NODE_ID, workspaceId = "ws-x", assistant = "claude-code", sessionId = null, ageMs, repo = "demo", preM48 = false }) {
  const lastPingAt = new Date(NOW_MS - ageMs).toISOString();
  const record = preM48
    ? { nodeId, workspaceId, repo, assistant, startedAt: lastPingAt, lastPingAt } // the pre-m48 SIX-key body
    : { nodeId, workspaceId, repo, assistant, sessionId, startedAt: lastPingAt, lastPingAt };
  const file = path.join(fixture.sessionsDir, leaf);
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { file, leaf, record, bytes: `${JSON.stringify(record, null, 2)}\n` };
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

export const meshSessionOrphanReaperTests = [
  // ══ Scenario: an expired record is gone from disk after one real session ping ══
  {
    name: "mesh-session-orphan-reaper/02 an expired record is gone from disk after one real session ping",
    async run() {
      const fixture = await makeFixture();
      try {
        const expired = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS + 1 });
        const alive = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-alive~claude-code~sess-alive.json`, workspaceId: "ws-alive", sessionId: "sess-alive", ageMs: TTL_MS / 2 });

        const { exitCode } = await pingSomeOtherSession(fixture);
        assert.notEqual(exitCode, 1, "the ping succeeds");

        assert.equal(await exists(expired.file), false, "the expired record's file is gone from disk");
        assert.equal(await readFile(alive.file, "utf8"), alive.bytes, "the in-TTL record's file is still there, byte-identical to before the command ran");

        const mine = await readSessionRecord(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-mine", assistant: "claude-code", sessionId: "sess-mine" });
        assert.ok(mine, "the ping's own record was written normally — the sweep is a side-effect of the write, never a replacement for it");
        assert.equal(mine.lastPingAt, NOW);
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: a pre-m48 three-part record is reaped by the same sweep ══
  {
    name: "mesh-session-orphan-reaper/02 a pre-m48 three-part record is reaped by the same sweep — this is the migration",
    async run() {
      const fixture = await makeFixture();
      try {
        // The OLD leaf shape AND the old six-key record body (sessionId: undefined —
        // the file the live soak on this machine actually holds).
        const legacyDead = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-old~claude-code.json`, workspaceId: "ws-old", preM48: true, ageMs: TTL_MS + 1 });
        const legacyLive = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-recent~claude-code.json`, workspaceId: "ws-recent", preM48: true, ageMs: TTL_MS / 2 });
        assert.equal(legacyDead.leaf.split("~").length, 3, "the planted leaf really is the OLD three-part form");
        assert.equal(Object.keys(legacyDead.record).length, 6, "…carrying the pre-m48 six-key body, with no session segment and no sessionId key");

        const before = new Set(await readdir(fixture.sessionsDir));
        await pingSomeOtherSession(fixture);

        assert.equal(await exists(legacyDead.file), false, "that three-part file is gone from disk");
        const after = await readdir(fixture.sessionsDir);
        const created = after.filter((name) => !before.has(name));
        assert.deepEqual(created, [`${NODE_ID}~ws-mine~claude-code~sess-mine.json`], "no new file was created to replace it — only the ping's own record appeared");
        assert.equal(await readFile(legacyLive.file, "utf8"), legacyLive.bytes, "nothing was rewritten in place — an old record is removed, never upgraded");

        const live = await readLiveSessions(fixture.ws, NODE_ID, { now: NOW, config: fixture.ws.config });
        const recent = live.find((entry) => entry.workspaceId === "ws-recent");
        assert.ok(recent, "a pre-m48 three-part record that is still INSIDE the TTL survives untouched and still reads as a live session");
        const recentRecord = JSON.parse(await readFile(legacyLive.file, "utf8"));
        assert.equal(recentRecord.sessionId, undefined, "…an ANONYMOUS one: the record on disk carries no id, and none was invented for it");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: the sweep touches only this node's records ══
  {
    name: "mesh-session-orphan-reaper/02 the sweep touches only this node's records",
    async run() {
      const fixture = await makeFixture();
      try {
        const mine = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS * 10 });
        const peer = await plantRecord(fixture, { leaf: `${PEER_NODE_ID}~ws-dead~claude-code~sess-peer.json`, nodeId: PEER_NODE_ID, workspaceId: "ws-dead", sessionId: "sess-peer", ageMs: TTL_MS * 10 });

        await pingSomeOtherSession(fixture);

        assert.equal(await exists(mine.file), false, "this node's expired record is gone");
        assert.equal(await readFile(peer.file, "utf8"), peer.bytes, "the other node's expired record is still on disk, byte-identical — untouched, however stale it looks from here");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: the reap and every other reader agree about the same record, at the edge ══
  {
    name: "mesh-session-orphan-reaper/02 the reap and every other reader agree about the same record, at the edge (Examples)",
    async run() {
      const rows = [
        { case: "comfortably live", ageMs: TTL_MS / 2, onDisk: true, live: true },
        { case: "exactly at the threshold", ageMs: TTL_MS, onDisk: true, live: true },
        { case: "one millisecond past", ageMs: TTL_MS + 1, onDisk: false, live: false },
        { case: "long dead", ageMs: TTL_MS * 10, onDisk: false, live: false },
      ];
      for (const row of rows) {
        const fixture = await makeFixture();
        try {
          const planted = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-edge~claude-code~sess-edge.json`, workspaceId: "ws-edge", sessionId: "sess-edge", ageMs: row.ageMs });

          // The read is taken at the SAME injected instant as the ping's reap.
          const liveBefore = await readLiveSessions(fixture.ws, NODE_ID, { now: NOW, config: fixture.ws.config });
          const reportedLiveBefore = liveBefore.some((entry) => entry.workspaceId === "ws-edge");

          await pingSomeOtherSession(fixture);

          assert.equal(await exists(planted.file), row.onDisk, `${row.case}: the record is ${row.onDisk ? "still there" : "gone"}`);
          assert.equal(reportedLiveBefore, row.live, `${row.case}: the real readLiveSessions at that same instant reports it ${row.live ? "live" : "not live"}`);

          const liveAfter = await readLiveSessions(fixture.ws, NODE_ID, { now: NOW, config: fixture.ws.config });
          assert.equal(liveAfter.some((entry) => entry.workspaceId === "ws-edge"), row.live, `${row.case}: …and the two never disagree about one record`);
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario: the reap and the read in one invocation share one instant ══
  {
    name: "mesh-session-orphan-reaper/02 the reap and the read in one invocation share one instant",
    async run() {
      const fixture = await makeFixture();
      try {
        // Age at the injected instant is EXACTLY the TTL — the live edge, where a
        // second clock (or a `>=` predicate) would disagree with the first.
        const planted = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-edge~claude-code~sess-edge.json`, workspaceId: "ws-edge", sessionId: "sess-edge", ageMs: TTL_MS });

        await pingSomeOtherSession(fixture);

        assert.equal(await exists(planted.file), true, "the record is still on disk");
        const live = await readLiveSessions(fixture.ws, NODE_ID, { now: NOW, config: fixture.ws.config });
        assert.ok(live.some((entry) => entry.workspaceId === "ws-edge"), "…and still reported live by the read in that same invocation");
        // No scenario in this feature relies on wall-clock time passing: every instant
        // above is injected, and the fixture's own ages are computed from it.
        assert.equal(Date.parse(planted.record.lastPingAt), NOW_MS - TTL_MS, "the fixture's age is a fact of the fixture, not of wall time");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: a reap that cannot delete never fails the session write ══
  {
    name: "mesh-session-orphan-reaper/02 a reap that cannot delete never fails the session write",
    async run() {
      const fixture = await makeFixture();
      const events = [];
      setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
      try {
        const expired = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS + 1 });

        // ADR-010 R5's injected failing unlink — the seam that exists precisely
        // because no real filesystem fault is portable across this fleet's three
        // platforms. Driven through the REAL pingSession (the CLI supplies no
        // options, which is the production shape the fitness function pins).
        const { pingSession } = await import("../../../src/mesh/session.mjs");
        const record = await pingSession(
          fixture.ws,
          { nodeId: NODE_ID, workspaceId: "ws-mine", repo: "demo", assistant: "claude-code", sessionId: "sess-mine", now: NOW },
          { unlink: async () => { throw Object.assign(new Error("locked by another process"), { code: "EPERM" }); } },
        );

        assert.equal(record.lastPingAt, NOW, "the command SUCCEEDS with its normal envelope and exit code");
        assert.ok(await exists(sessionRecordPath(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-mine", assistant: "claude-code", sessionId: "sess-mine" })), "the ping's own record was written correctly");
        assert.equal(await exists(expired.file), true, "the reap genuinely tried and genuinely failed — which is what makes this scenario non-vacuous");
        assert.deepEqual(events.map((event) => event.code), ["mesh-session-reap"], "the failure was reported through the coded-degrade channel rather than swallowed silently or thrown");
        assert.match(events[0].message, /locked by another process/, "…carrying the underlying fault's own message");

        // The fault was the SEAM's, not the reaper's: the next real write removes it.
        await pingSomeOtherSession(fixture);
        assert.equal(await exists(expired.file), false, "a subsequent real ping removes it");
      } finally {
        setDegradeSinkForTest(undefined);
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: reaping twice is a no-op, and a quiet machine keeps its orphans ══
  {
    name: "mesh-session-orphan-reaper/02 reaping twice is a no-op, and a quiet machine keeps its orphans",
    async run() {
      const fixture = await makeFixture();
      try {
        await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS + 1 });
        await pingSomeOtherSession(fixture);
        const afterFirstSweep = await readdir(fixture.sessionsDir);
        const mineBytes = await readFile(sessionRecordPath(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-mine", assistant: "claude-code", sessionId: "sess-mine" }), "utf8");

        const { exitCode } = await pingSomeOtherSession(fixture);
        assert.notEqual(exitCode, 1, "the command succeeds");
        assert.deepEqual(await readdir(fixture.sessionsDir), afterFirstSweep, "nothing further is removed");
        assert.equal(
          JSON.parse(await readFile(sessionRecordPath(fixture.ws, { nodeId: NODE_ID, workspaceId: "ws-mine", assistant: "claude-code", sessionId: "sess-mine" }), "utf8")).startedAt,
          JSON.parse(mineBytes).startedAt,
          "…and the ping's own record kept its startedAt — a second sweep is a no-op, not a restart",
        );

        // THE ACCEPTED RESIDUAL, stated rather than hidden: a node on which no further
        // session ever starts or pings keeps its expired records — bounded at one file
        // per dead session, invisible to every live read, and harmless.
        const quiet = await makeFixture();
        try {
          const orphan = await plantRecord(quiet, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: TTL_MS * 100 });
          const live = await readLiveSessions(quiet.ws, NODE_ID, { now: NOW, config: quiet.ws.config });
          assert.deepEqual(live, [], "the orphan is invisible to every live read");
          assert.equal(await exists(orphan.file), true, "…and still on disk, because nothing wrote — the residual ADR-006 accepts");
        } finally {
          await rm(quiet.tmp, { recursive: true, force: true });
        }
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ The documented TTL is the one in use ══
  {
    name: "mesh-session-orphan-reaper/02 the TTL is the documented one, reused — config.mesh.session.ttlSeconds drives the sweep, and an unconfigured workspace gets the documented default",
    async run() {
      assert.equal(DEFAULT_SESSION_TTL_SECONDS, 120, "the documented default is unchanged by this milestone");
      assert.equal(resolveSessionTtlSeconds(undefined), DEFAULT_SESSION_TTL_SECONDS, "an unconfigured workspace resolves the documented default");

      const fixture = await makeFixture();
      try {
        // A record 90s old: EXPIRED under this fixture's configured 60s TTL, but LIVE
        // under the 120s default. It must be reaped — proving the sweep read the knob
        // rather than a hard-coded constant.
        const planted = await plantRecord(fixture, { leaf: `${NODE_ID}~ws-dead~claude-code~sess-dead.json`, workspaceId: "ws-dead", sessionId: "sess-dead", ageMs: 90_000 });
        assert.ok(90_000 < DEFAULT_SESSION_TTL_SECONDS * 1000, "the planted age is INSIDE the documented default TTL");
        await pingSomeOtherSession(fixture);
        assert.equal(await exists(planted.file), false, "the configured TTL — not the default — decided this record's fate");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ The LISTING fault is discriminated, exactly as the unlink fault below it is ══
  //    ADR-006: every reap fault "is reported through the coded-degrade seam and never
  //    propagates". An absent sessions/ dir is genuinely benign (nothing to sweep); a
  //    dir that cannot be LISTED (EACCES/EPERM/EIO/ENOTDIR) disables the reaper for this
  //    node entirely and for as long as the fault lasts — undiscriminated, it is silent
  //    forever: the TTL stops being a removal and nothing anywhere says why.
  {
    name: "mesh-session-orphan-reaper/02 a sessions/ directory that cannot be LISTED is reported through the coded-degrade seam, while a merely ABSENT one stays silent",
    async run() {
      const fixture = await makeFixture();
      const events = [];
      setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
      try {
        // (a) ABSENT — the benign half, asserted FIRST so the loud half below cannot be
        //     a reporter that simply fires on everything.
        await rm(fixture.sessionsDir, { recursive: true, force: true });
        assert.equal(await exists(fixture.sessionsDir), false, "the sessions/ dir is genuinely gone (non-vacuous)");
        assert.equal(await reapExpiredSessions(fixture.ws, NODE_ID, { now: NOW, config: fixture.ws.config }), 0, "nothing is swept and nothing throws");
        assert.deepEqual(events, [], "absence-is-benign: no degrade event for a store that has simply never been written");

        // (b) UNLISTABLE — a real, portable non-ENOENT readdir fault: the path exists and
        //     is not a directory (ENOTDIR on every platform this fleet runs on). Stands in
        //     for the EACCES/EPERM/EIO no filesystem produces portably.
        await writeFile(fixture.sessionsDir, "not a directory\n", "utf8");
        const reaped = await reapExpiredSessions(fixture.ws, NODE_ID, { now: NOW, config: fixture.ws.config });

        assert.equal(reaped, 0, "the reap still returns a count and never throws — failure-isolated by contract");
        assert.deepEqual(events.map((event) => event.code), ["mesh-session-reap"], "the fault was reported through the coded-degrade channel, not swallowed");
        assert.equal(events[0].path, fixture.sessionsDir, "…carrying the directory it could not read, so an operator knows which path to inspect");
        assert.ok(String(events[0].message).length > 0, "…and the underlying fault's own message");

        // …and a write over that same fault still succeeds: the reap is opportunistic, so
        // a listing it cannot do never fails the session write it rides on.
        await rm(fixture.sessionsDir, { force: true });
        const { exitCode } = await pingSomeOtherSession(fixture);
        assert.notEqual(exitCode, 1, "the session write path is unaffected");
      } finally {
        setDegradeSinkForTest(undefined);
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
];
