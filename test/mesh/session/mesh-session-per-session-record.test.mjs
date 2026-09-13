// Traceability wiring for milestone 48 / story 00
// tasks/01_one-session-one-record.feature — "one live session is one record — two
// sessions in a repo stop being one lying record, and ending one cannot end the
// other".
//
// Every @executable scenario (and every Scenario Outline Examples row) below is
// asserted against the REAL `aof session` command and the REAL `readLiveSessions`,
// over a hermetic fixture repo + a fixture AOF_GLOBAL_HOME. "Two records on disk" is
// asserted by listing the real sessions directory, never by inspecting a mock.
//
// OWNERSHIP NOTE, stated rather than assumed: the presence ENTRY's shape (its key set,
// and whether it carries `sessionId`) is story 48/01's contract, not this one's. Where
// a scenario says "the live sessions contain X", this file asserts the ENTRY's
// PRESENCE — matched on a field the m38 four already carry — and asserts the
// `sessionId` claim against the RECORD, which is this story's own producer output.
// That keeps this suite green whether or not story 01 has landed.
//
// The STRUCTURAL claims (four-segment leaf composition; the key as ONE object; the
// frozen ordered seven) are the fitness functions
// test/arch/session/acd-session-leaf-per-session.test.mjs and
// test/arch/session/acd-session-record-frozen.test.mjs — every Then below reads a real file or
// a real read-back value.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { meshSessionCommand } from "../../../src/commands/mesh/session.mjs";
import { readSessionRecord, readSessionRecordsForNode, sessionRecordPath } from "../../../src/mesh/session.mjs";
import { readLiveSessions } from "../../../src/mesh/presence.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const NODE_ID = "node-a";
const NOW = "2026-08-10T12:00:00.000Z";
// m50/ADR-008 decision 8 APPENDED an eighth key, `relaying` — the worker's stated fact
// that something is bridging this session's PTY output up its stream. An APPEND is the
// same re-freeze-by-growth m48 itself performed on m38's six; every key above keeps its
// position, so this list still asserts an exact ordered record rather than a subset.
const FROZEN_KEYS = ["nodeId", "workspaceId", "repo", "assistant", "sessionId", "startedAt", "lastPingAt", "relaying"];

async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-session-per-session-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "demo", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  return { tmp, root, home, env, sessionsDir: path.join(home, "mesh", "sessions"), ws: await loadWorkspace(root, undefined, { env }) };
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

const keyFor = (sessionId, workspaceId = "ws-1") => ({ nodeId: NODE_ID, workspaceId, assistant: "claude-code", sessionId });

const startArgs = (sessionId, { workspaceId = "ws-1", repo = "demo" } = {}) => [
  "start", "--workspace", workspaceId, "--repo", repo, "--assistant", "claude-code",
  ...(sessionId == null ? [] : ["--session", sessionId]),
];

const pingArgs = (sessionId, { workspaceId = "ws-1", repo = "demo" } = {}) => [
  "ping", "--workspace", workspaceId, "--repo", repo, "--assistant", "claude-code",
  ...(sessionId == null ? [] : ["--session", sessionId]),
];

const endArgs = (sessionId, { workspaceId = "ws-1" } = {}) => [
  "end", "--workspace", workspaceId, "--assistant", "claude-code",
  ...(sessionId == null ? [] : ["--session", sessionId]),
];

export const meshSessionPerSessionRecordTests = [
  // ══ Scenario: two sessions in ONE repo are two records, both live at once ══
  {
    name: "mesh-session-per-session-record/01 two sessions in ONE repo are two records, both live at once",
    async run() {
      const fixture = await makeFixture();
      try {
        await runCommand(startArgs("sess-A"), ctxFor(fixture));
        await runCommand(startArgs("sess-B"), ctxFor(fixture, { now: "2026-08-10T12:00:30.000Z" }));

        const files = await readdir(fixture.sessionsDir);
        assert.equal(files.length, 2, "the sessions directory holds TWO record files, not one");
        assert.equal(new Set(files).size, 2, "the two file names differ from each other");

        const recordA = await readSessionRecord(fixture.ws, keyFor("sess-A"));
        const recordB = await readSessionRecord(fixture.ws, keyFor("sess-B"));
        assert.strictEqual(recordA.sessionId, "sess-A", "reading each back yields its OWN sessionId");
        assert.strictEqual(recordB.sessionId, "sess-B");
        assert.equal(recordA.startedAt, NOW, "…and each carries its own startedAt — the part a blind upsert loses");
        assert.equal(recordB.startedAt, "2026-08-10T12:00:30.000Z");

        const live = await readLiveSessions(fixture.ws, NODE_ID, { now: "2026-08-10T12:01:00.000Z" });
        assert.equal(live.length, 2, "the live sessions contain both — a node running two sessions in one repo reports two");
        assert.deepEqual(live.map((entry) => entry.lastPingAt).sort(), [NOW, "2026-08-10T12:00:30.000Z"].sort(), "both entries are present (matched on the m38 field, since the ENTRY shape is story 01's contract)");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: ending one session leaves its sibling alive ══
  {
    name: "mesh-session-per-session-record/01 ending one session leaves its sibling alive, on disk and on the next read",
    async run() {
      const fixture = await makeFixture();
      try {
        await runCommand(startArgs("sess-A"), ctxFor(fixture));
        await runCommand(startArgs("sess-B"), ctxFor(fixture, { now: "2026-08-10T12:00:30.000Z" }));
        const siblingPath = sessionRecordPath(fixture.ws, keyFor("sess-B"));
        const siblingBytes = await readFile(siblingPath, "utf8");

        const { exitCode } = await runCommand(endArgs("sess-A"), ctxFor(fixture));
        assert.notEqual(exitCode, 1, "`aof session end` naming sess-A succeeds");

        assert.equal(await readSessionRecord(fixture.ws, keyFor("sess-A")), null, "sess-A's record file is gone from disk");
        assert.equal(await readFile(siblingPath, "utf8"), siblingBytes, "sess-B's record file is still on disk, byte-identical to before that command ran");

        const live = await readLiveSessions(fixture.ws, NODE_ID, { now: "2026-08-10T12:01:00.000Z" });
        assert.equal(live.length, 1, "the live sessions no longer contain sess-A");
        assert.equal(live[0].lastPingAt, "2026-08-10T12:00:30.000Z", "…and still contain sess-B");

        const secondEnd = await runCommand(endArgs("sess-A"), ctxFor(fixture));
        assert.notEqual(secondEnd.exitCode, 1, "ending an already-gone session is a benign success");
        assert.equal(await readFile(siblingPath, "utf8"), siblingBytes, "…that removes nothing else");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: the record is the ordered seven, with `sessionId` explicitly present ══
  {
    name: "mesh-session-per-session-record/01 the record is the ordered seven, with `sessionId` explicitly present (Examples)",
    async run() {
      const rows = [
        { case: "an addressable session", sessionId: "sess-A", stored: "sess-A" },
        { case: "an anonymous session", sessionId: null, stored: null },
      ];
      for (const row of rows) {
        const fixture = await makeFixture();
        try {
          await runCommand(startArgs(row.sessionId), ctxFor(fixture));
          // Read the FILE, not a helper's return: key order is observable because the
          // record is persisted as pretty JSON and parsed back key-order-preserving.
          const onDisk = JSON.parse(await readFile(sessionRecordPath(fixture.ws, keyFor(row.sessionId)), "utf8"));
          assert.deepEqual(Object.keys(onDisk), FROZEN_KEYS, `${row.case}: its keys are exactly the ordered seven`);
          assert.strictEqual(onDisk.sessionId, row.stored, `${row.case}: sessionId is ${JSON.stringify(row.stored)}`);
          assert.ok(Object.hasOwn(onDisk, "sessionId"), `${row.case}: the key was not dropped`);
          // EIGHT since m50/ADR-008's tail append. The clause is a bound on the RECORD — "no
          // key appeared that FROZEN_KEYS does not name" — never on the number, so it is
          // stated against the list rather than against a literal that has to be found twice.
          assert.equal(Object.keys(onDisk).length, FROZEN_KEYS.length, `${row.case}: no unnamed key appeared`);
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario: ping is still idempotent and still per-session ══
  {
    name: "mesh-session-per-session-record/01 ping is still idempotent and still per-session",
    async run() {
      const fixture = await makeFixture();
      try {
        assert.equal(await readSessionRecord(fixture.ws, keyFor("sess-A")), null, "no session record exists for sess-A");

        await runCommand(pingArgs("sess-A"), ctxFor(fixture));
        let record = await readSessionRecord(fixture.ws, keyFor("sess-A"));
        assert.ok(record, "a record exists for sess-A");
        assert.equal(record.startedAt, NOW, "startedAt is T0");
        assert.equal(record.lastPingAt, NOW, "lastPingAt is T0");

        const t30 = "2026-08-10T12:00:30.000Z";
        await runCommand(pingArgs("sess-A", { repo: "renamed-in-flight" }), ctxFor(fixture, { now: t30 }));
        record = await readSessionRecord(fixture.ws, keyFor("sess-A"));
        assert.equal(record.lastPingAt, t30, "that record's lastPingAt is T0 plus 30 seconds");
        assert.equal(record.startedAt, NOW, "its startedAt is still T0");
        assert.equal(record.repo, "demo", "and its repo is unchanged — a ping refreshes liveness, it does not restart the session");

        const beforeSibling = await readFile(sessionRecordPath(fixture.ws, keyFor("sess-A")), "utf8");
        await runCommand(pingArgs("sess-B"), ctxFor(fixture, { now: t30 }));
        assert.ok(await readSessionRecord(fixture.ws, keyFor("sess-B")), "a ping naming sess-B at that same instant creates a SECOND record");
        assert.equal(await readFile(sessionRecordPath(fixture.ws, keyFor("sess-A")), "utf8"), beforeSibling, "…and does not touch sess-A's bytes");
        assert.equal((await readdir(fixture.sessionsDir)).length, 2, "two records, one per session");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: an anonymous session is written, read and reported live like any other ══
  {
    name: "mesh-session-per-session-record/01 an anonymous session is written, read and reported live like any other",
    async run() {
      const fixture = await makeFixture();
      try {
        await runCommand(startArgs(null), ctxFor(fixture));
        const files = await readdir(fixture.sessionsDir);
        assert.equal(files.length, 1, "exactly one record file exists for it");
        const record = await readSessionRecord(fixture.ws, keyFor(null));
        assert.ok(record, "…and it is readable");
        assert.ok(Object.hasOwn(record, "sessionId"), "the record states its anonymity: the key is present");
        assert.strictEqual(record.sessionId, null, "…and explicitly null");

        const live = await readLiveSessions(fixture.ws, NODE_ID, { now: "2026-08-10T12:00:30.000Z" });
        assert.equal(live.length, 1, "the live sessions contain it — an anonymous session is a full citizen, not a degraded second path");
        assert.equal(live[0].workspaceId, "ws-1");

        // The honest limit of ADR-001, asserted rather than hidden.
        await runCommand(startArgs(null), ctxFor(fixture, { now: "2026-08-10T12:00:45.000Z" }));
        assert.deepEqual(await readdir(fixture.sessionsDir), files, "starting a SECOND anonymous session for the same node/workspace/assistant resolves to that SAME one record");
        const merged = await readSessionRecord(fixture.ws, keyFor(null));
        assert.strictEqual(merged.sessionId, null, "…and the record does not pretend otherwise — it is still, honestly, nameless");
        assert.equal(merged.startedAt, "2026-08-10T12:00:45.000Z", "two nameless sessions are indistinguishable by construction — the second start overwrote the first, exactly as the pre-m48 collision did");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: an id with awkward characters still resolves to exactly one flat record ══
  {
    name: "mesh-session-per-session-record/01 an id with awkward characters still resolves to exactly one flat record under the sessions directory (Examples)",
    async run() {
      const rows = [
        { case: "a traversal-shaped id", id: "../../escape" },
        { case: "a separator-bearing id", id: "a/b\\c" },
        { case: "the leaf separator itself", id: "weird~id" },
        { case: "the ordinary UUID", id: "3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9" },
      ];
      for (const row of rows) {
        const fixture = await makeFixture();
        try {
          await runCommand(startArgs(row.id), ctxFor(fixture));

          const entries = await readdir(fixture.sessionsDir, { withFileTypes: true });
          assert.equal(entries.length, 1, `${row.case}: exactly one file is created`);
          assert.ok(entries[0].isFile(), `${row.case}: directly under the sessions directory — no subdirectory was created`);
          assert.deepEqual(await readdir(path.join(fixture.home, "mesh")), ["sessions"], `${row.case}: nothing was written outside it`);

          const record = await readSessionRecord(fixture.ws, keyFor(row.id));
          assert.ok(record, `${row.case}: the record is reachable by the same key`);
          assert.strictEqual(record.sessionId, row.id, `${row.case}: the path is made safe, the VALUE is not rewritten`);
        } finally {
          await rm(fixture.tmp, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ The QA ruling ADR-010 R1 settled, proven on the real store ══
  {
    name: "mesh-session-per-session-record/01 two ids that would have collided under a collapsing rule are two records (ADR-010 R1 — the escape is injective)",
    async run() {
      const fixture = await makeFixture();
      try {
        // `a~b` (the separator inside the value) versus `a-b` (what a collapsing rule
        // would have produced) versus `a/b` (what safeSegment collapses today): three
        // ids, three leaves, three records. Under a collapsing rule these would have
        // merged — the very defect the per-session key exists to close.
        for (const id of ["a~b", "a-b", "a/b"]) {
          await runCommand(startArgs(id), ctxFor(fixture));
        }
        const files = await readdir(fixture.sessionsDir);
        assert.equal(files.length, 3, `three distinct ids compose three distinct leaves (got ${JSON.stringify(files)})`);
        for (const id of ["a~b", "a-b", "a/b"]) {
          const record = await readSessionRecord(fixture.ws, keyFor(id));
          assert.strictEqual(record.sessionId, id, `${JSON.stringify(id)} reads back byte-identical`);
        }
        const records = await readSessionRecordsForNode(fixture.ws, NODE_ID);
        assert.deepEqual(records.map((record) => record.sessionId).sort(), ["a-b", "a/b", "a~b"], "each record kept its own id");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },

  // ══ The read is HONEST about whose record it found (48/ADR-013 R14, TECH_DEBT 35) ══
  //    A read by key K never returns a record whose id is not K. On a case-insensitive
  //    filesystem two ids differing only in case share ONE leaf, and the loser used to
  //    read back ANOTHER session's id byte-for-byte — not an absence and not a visible
  //    merge, but a wrong value that still looks valid: it rides the wire, reaches the
  //    fleet index and joins `global_assignments.session_id` to the WRONG row.
  {
    name: "mesh-session-per-session-record/01 a read by key K never returns a record whose sessionId is not K — and a PRE-m48 record read by an anonymous key still matches (ADR-002's no-migration claim)",
    async run() {
      const fixture = await makeFixture();
      try {
        // (a) The invariant, asserted on EVERY filesystem: the leaf for `sess-ABC` holds
        //     a record whose own id is `sess-abc`. That is precisely what a shared
        //     case-folded leaf produces, and it now reads as this module's own
        //     absence-is-benign miss rather than as someone else's id.
        await runCommand(startArgs("sess-abc"), ctxFor(fixture));
        const impostorLeaf = sessionRecordPath(fixture.ws, keyFor("sess-ABC"));
        await writeFile(
          impostorLeaf,
          `${JSON.stringify({ ...(await readSessionRecord(fixture.ws, keyFor("sess-abc"))) }, null, 2)}\n`,
          "utf8",
        );
        assert.strictEqual(JSON.parse(await readFile(impostorLeaf, "utf8")).sessionId, "sess-abc", "the file at sess-ABC's leaf really does hold sess-abc's record (non-vacuous)");
        assert.strictEqual(await readSessionRecord(fixture.ws, keyFor("sess-ABC")), null, "reading by `sess-ABC` answers null — a record that is not this key's record is a MISS, never another session's id");
        assert.strictEqual((await readSessionRecord(fixture.ws, keyFor("sess-abc"))).sessionId, "sess-abc", "…while the id that OWNS the record still reads it back byte-identical");

        // (b) THE LINE THE GUARD MUST NOT BREAK: a pre-m48 record carries no `sessionId`
        //     key at all, and an anonymous key states `null`. `?? null` on BOTH sides is
        //     what keeps ADR-002's "there is NO migration" true.
        const anonymousLeaf = sessionRecordPath(fixture.ws, keyFor(null, "ws-legacy"));
        await writeFile(
          anonymousLeaf,
          `${JSON.stringify({ nodeId: NODE_ID, workspaceId: "ws-legacy", repo: "demo", assistant: "claude-code", startedAt: NOW, lastPingAt: NOW }, null, 2)}\n`,
          "utf8",
        );
        const legacy = await readSessionRecord(fixture.ws, keyFor(null, "ws-legacy"));
        assert.ok(legacy, "a PRE-m48 record — no `sessionId` key at all — still reads back under an anonymous key");
        assert.equal(Object.hasOwn(legacy, "sessionId"), false, "…and it is genuinely the keyless pre-m48 body (non-vacuous)");

        // …and an anonymous record written by the REAL producer (sessionId: null) too.
        await runCommand(startArgs(null, { workspaceId: "ws-anon" }), ctxFor(fixture));
        const anonymous = await readSessionRecord(fixture.ws, keyFor(null, "ws-anon"));
        assert.ok(anonymous, "an anonymous record written by the real producer reads back under the anonymous key");
        assert.strictEqual(anonymous.sessionId, null, "…stating `null`, which is what the key states too");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
];
