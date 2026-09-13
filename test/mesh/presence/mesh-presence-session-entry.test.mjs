// Traceability wiring for milestone 48 / story 01 — task 00
// (tasks/00_frozen-session-entry.feature): "a live session reaches the wire as a
// frozen, ordered six — carrying its id and the run fact, with both new keys always
// present".
//
// EVERY Then below reads a value off a REAL call to the REAL `readLiveSessions`
// (src/mesh/presence.mjs) over REAL session records on disk — never a hand-built
// entry (m38/ADR-008's producer-fed rule). The structural half — the key-order
// assertion over SOURCE and the `PresenceSession` declaration — is deliberately NOT
// here: it is the fitness function `acd-session-entry-frozen-wire`
// (test/arch/session/acd-session-entry-frozen-wire.test.mjs).
//
// ISOLATION: every scenario builds a fresh `AOF_GLOBAL_HOME` temp dir (the fixture
// writes real session records; an unisolated run would corrupt the operator's live
// `~/.aof` soak) and removes it afterwards.
//
// THE CLOCK IS INJECTED, ALWAYS: `readLiveSessions` takes `options.now` /
// `options.config`, so no scenario reads wall time, and the TTL is the DOCUMENTED
// `DEFAULT_SESSION_TTL_SECONDS` resolved from config — never a number this test
// invented (the constant is IMPORTED, never re-spelled as a literal).
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assemblePresenceRecord, readLiveSessions } from "../../../src/mesh/presence.mjs";
import { DEFAULT_SESSION_TTL_SECONDS, startSession } from "../../../src/mesh/session.mjs";
import { meshDir } from "../../../src/mesh/store.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

const NODE_ID = "node-a";
const OTHER_NODE_ID = "node-b";
const NOW = "2026-08-10T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const TTL_MS = DEFAULT_SESSION_TTL_SECONDS * 1000;

// The m48/ADR-005 FROZEN ORDERED SIX. One spelling, used by every scenario below.
//
// m50/ADR-008 decision 8 APPENDED A SEVENTH, `relaying` — the worker's stated fact that
// something is bridging this session's PTY output up its stream — at the TAIL, which is the
// only growth m48/ADR-005 permits. The constant keeps its name because the SIX are what it
// is about: every one of them is still here, in order, and the scenarios below still assert
// an exact ordered list rather than a subset.
const FROZEN_SIX = ["sessionId", "workspaceId", "repo", "assistant", "lastPingAt", "workspaceHasRun", "relaying"];
// The m38 four, in their m38 relative order — the keys this milestone must NOT move.
const M38_FOUR = ["workspaceId", "repo", "assistant", "lastPingAt"];

// An isolated global mesh store + a real workspace whose mesh nodeId is this node's.
// `config` is passed to readLiveSessions so the TTL is RESOLVED (not supplied), which
// is what "the TTL resolved from config" in the Background means.
async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-m48-session-entry-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  const ws = await loadWorkspace(root, undefined, { env });
  return { tmp, ws, config };
}

async function withFixture(fn) {
  const fixture = await makeFixture();
  try {
    return await fn(fixture);
  } finally {
    await rm(fixture.tmp, { recursive: true, force: true });
  }
}

function sessionsDir(ws) {
  return path.join(meshDir(ws), "sessions");
}

async function readRecordsOnDisk(ws) {
  let names = [];
  try {
    names = await readdir(sessionsDir(ws));
  } catch {
    return [];
  }
  const out = [];
  for (const name of names.filter((entry) => entry.endsWith(".json")).sort()) {
    out.push({ name, record: JSON.parse(await readFile(path.join(sessionsDir(ws), name), "utf8")) });
  }
  return out;
}

// Make the record the real producer just wrote carry EXACTLY the id state the scenario
// names — and nothing else about it is touched:
//   sessionId: "sess-A"  → the key present, with that value (an addressable session)
//   sessionId: null      → the key present and null (an anonymous session, post-48/00)
//   sessionId undefined  → the key ABSENT ENTIRELY (a record a PRE-m48 build wrote)
//
// WHY THIS EXISTS, and why it is honest. Story 48/00 owns the id's PRODUCER
// (`src/mesh/session.mjs`) and is landing in parallel, so what `startSession` records
// is a moving target — while this story's projection is ABSENCE-TOLERANT by contract
// (m48/ADR-005: `record.sessionId ?? null`), which is exactly what lets it land first
// and is exactly what the third Examples row exists to prove. Pinning the record STATE
// here keeps that row a real proof under BOTH builds: a producer that writes
// `sessionId: null` for an anonymous session can no longer make the "no key at all"
// row silently vacuous. The record's own key order is m48/ADR-002's seven — `sessionId`
// INSERTED after `assistant` — so the fixture invents no shape either. Idempotent when
// the producer already recorded the id.
async function shapeRecordId(ws, { nodeId, workspaceId, assistant }, sessionId) {
  const matches = (await readRecordsOnDisk(ws)).filter(
    ({ record }) => record.nodeId === nodeId && record.workspaceId === workspaceId && record.assistant === assistant,
  );
  assert.equal(matches.length, 1, `exactly one record on disk for ${nodeId}/${workspaceId}/${assistant} (got ${matches.length})`);
  const [{ name, record }] = matches;
  if (sessionId === undefined ? !Object.hasOwn(record, "sessionId") : record.sessionId === sessionId) return;
  const shaped = {
    nodeId: record.nodeId,
    workspaceId: record.workspaceId,
    repo: record.repo,
    assistant: record.assistant,
    ...(sessionId === undefined ? {} : { sessionId }),
    startedAt: record.startedAt,
    lastPingAt: record.lastPingAt,
  };
  await writeFile(path.join(sessionsDir(ws), name), `${JSON.stringify(shaped, null, 2)}`, "utf8");
}

// Seed ONE session record through the REAL producer (`startSession`), then pin the id
// state (above). `sessionId: undefined` (the default) is the PRE-m48 record.
async function seedSession(ws, { nodeId = NODE_ID, workspaceId, repo, assistant = "claude-code", at = NOW, sessionId } = {}) {
  await startSession(ws, { nodeId, workspaceId, repo, assistant, now: at, sessionId: sessionId ?? null });
  await shapeRecordId(ws, { nodeId, workspaceId, assistant }, sessionId);
}

// An ISO instant `ageMs` before the injected NOW — how every liveness row expresses
// its age without ever reading a wall clock.
function agedBy(ageMs) {
  return new Date(NOW_MS - ageMs).toISOString();
}

export const meshPresenceSessionEntryTests = [
  // ══ Scenario: the entry is the ordered six, and the m38 four keep their relative
  //    order and their values ══
  {
    name: "mesh-presence-session-entry/00 the entry is the ordered six, and the m38 four keep their relative order and their values",
    async run() {
      await withFixture(async ({ ws, config }) => {
        const lastPingAt = agedBy(30_000); // a known lastPingAt, comfortably live
        await seedSession(ws, { workspaceId: "ws-1", repo: "demo", assistant: "claude-code", at: lastPingAt, sessionId: "sess-A" });

        const live = await readLiveSessions(ws, NODE_ID, { now: NOW, config });
        assert.equal(live.length, 1, "the one live session projects to one entry");
        const [entry] = live;

        assert.deepEqual(Object.keys(entry), FROZEN_SIX, "the entry's keys are exactly the ordered six (an exact ordered list, never a subset)");
        assert.equal(entry.sessionId, "sess-A", "sessionId is exactly `sess-A`, byte-identical to the record's own");

        // The m38 four carry exactly the values they carry today, in that relative order.
        const [{ record }] = await readRecordsOnDisk(ws);
        assert.deepEqual(
          Object.keys(entry).filter((key) => M38_FOUR.includes(key)),
          M38_FOUR,
          "the m38 four appear in their m38 relative order — an insertion at the head and an append at the tail, never a reorder",
        );
        assert.deepEqual(
          { workspaceId: entry.workspaceId, repo: entry.repo, assistant: entry.assistant, lastPingAt: entry.lastPingAt },
          { workspaceId: "ws-1", repo: "demo", assistant: "claude-code", lastPingAt },
          "the m38 four carry exactly the values they carry today",
        );
        assert.equal(entry.lastPingAt, record.lastPingAt, "lastPingAt is the record's own, untransformed");

        // SEVEN since m50/ADR-008 decision 8's tail append (`relaying`). The clause is still
        // "no key appeared that this contract does not name" — it is a bound on the entry,
        // not on the number, and FROZEN_SIX above is where the names live.
        assert.equal(Object.keys(entry).length, FROZEN_SIX.length, "no unnamed key appeared");
        assert.equal(Object.hasOwn(entry, "startedAt"), false, "`startedAt` did not leak from the session RECORD onto the entry");
        assert.equal(Object.hasOwn(entry, "nodeId"), false, "`nodeId` did not leak from the session RECORD onto the entry");
        assert.ok(Object.hasOwn(record, "startedAt"), "the RECORD genuinely carries startedAt (so its absence on the entry is a real projection, not an empty check)");
      });
    },
  },

  // ══ Scenario Outline: both new keys are ALWAYS present, whatever the record on disk
  //    looks like (3 rows) ══
  {
    name: "mesh-presence-session-entry/00 both new keys are ALWAYS present, whatever the record on disk looks like (Examples: addressable / anonymous / pre-m48)",
    async run() {
      const rows = [
        { case: "an addressable session", seed: { sessionId: "sess-A" }, sessionId: "sess-A", workspaceHasRun: false },
        { case: "an anonymous session (post-48/00)", seed: { sessionId: null }, sessionId: null, workspaceHasRun: false },
        { case: "a pre-m48 record with no id key at all", seed: {}, sessionId: null, workspaceHasRun: false },
      ];
      for (const row of rows) {
        await withFixture(async ({ ws, config }) => {
          await seedSession(ws, { workspaceId: "ws-1", repo: "demo", ...row.seed });

          // Non-vacuity for row 3: the record on disk genuinely has NO sessionId key.
          const [{ record }] = await readRecordsOnDisk(ws);
          if (row.case === "a pre-m48 record with no id key at all") {
            assert.equal(Object.hasOwn(record, "sessionId"), false, "the seeded record is genuinely pre-m48 — it carries no sessionId key at all");
          }

          const [entry] = await readLiveSessions(ws, NODE_ID, { now: NOW, config });
          assert.ok(entry, `${row.case}: the session is live and projects an entry`);
          assert.equal(Object.hasOwn(entry, "sessionId"), true, `${row.case}: the key \`sessionId\` is PRESENT (never omitted)`);
          assert.equal(entry.sessionId, row.sessionId, `${row.case}: sessionId is ${JSON.stringify(row.sessionId)}`);
          assert.equal(Object.hasOwn(entry, "workspaceHasRun"), true, `${row.case}: the key \`workspaceHasRun\` is PRESENT (never omitted)`);
          assert.equal(entry.workspaceHasRun, row.workspaceHasRun, `${row.case}: workspaceHasRun is ${row.workspaceHasRun}`);
          assert.notEqual(entry.sessionId, undefined, `${row.case}: sessionId is never \`undefined\` (it would serialise away)`);
          assert.notEqual(entry.workspaceHasRun, undefined, `${row.case}: workspaceHasRun is never \`undefined\``);
          // …and neither survives a JSON round-trip as an absence — the wire is JSON.
          const roundTripped = JSON.parse(JSON.stringify(entry));
          assert.deepEqual(Object.keys(roundTripped), FROZEN_SIX, `${row.case}: both keys survive JSON serialisation — an \`undefined\` would have vanished here`);
        });
      }
    },
  },

  // ══ Scenario: with no run set supplied, every entry reports false — this story
  //    alone changes no behaviour ══
  {
    name: "mesh-presence-session-entry/00 with no run set supplied, every entry reports false — this story alone changes no behaviour",
    async run() {
      await withFixture(async ({ ws, config }) => {
        // Three live sessions across two workspaces…
        await seedSession(ws, { workspaceId: "ws-1", repo: "alpha", assistant: "claude-code", sessionId: "sess-1" });
        await seedSession(ws, { workspaceId: "ws-1", repo: "alpha", assistant: "codex", sessionId: "sess-2" });
        await seedSession(ws, { workspaceId: "ws-2", repo: "beta", assistant: "claude-code", sessionId: "sess-3" });
        // …and one EXPIRED record, so "the same ones are filtered" is a real claim.
        await seedSession(ws, { workspaceId: "ws-3", repo: "gamma", assistant: "claude-code", at: agedBy(TTL_MS + 1), sessionId: "sess-expired" });

        // NO `workspacesWithRuns` supplied to the projection.
        const live = await readLiveSessions(ws, NODE_ID, { now: NOW, config });

        assert.equal(live.length, 3, "the three live sessions project three entries");
        for (const entry of live) {
          assert.equal(entry.workspaceHasRun, false, `every entry's workspaceHasRun is false (${entry.sessionId})`);
          assert.equal(typeof entry.workspaceHasRun, "boolean", "…and it is a BOOLEAN false, never a falsy stand-in");
        }

        // Each entry's other five values are exactly what today's four-key projection
        // produces for the same record, plus the id — asserted against the RECORD on
        // disk, which is the projection's own input.
        const byWorkspaceAssistant = new Map(
          (await readRecordsOnDisk(ws)).map(({ record }) => [`${record.workspaceId}~${record.assistant}`, record]),
        );
        for (const entry of live) {
          const record = byWorkspaceAssistant.get(`${entry.workspaceId}~${entry.assistant}`);
          assert.ok(record, "the entry traces back to a record on disk");
          assert.deepEqual(
            { workspaceId: entry.workspaceId, repo: entry.repo, assistant: entry.assistant, lastPingAt: entry.lastPingAt },
            { workspaceId: record.workspaceId, repo: record.repo, assistant: record.assistant, lastPingAt: record.lastPingAt },
            "the m38 four are byte-identical to today's four-key projection of the same record",
          );
          assert.equal(entry.sessionId, record.sessionId ?? null, "…plus the id");
        }

        // Nothing about WHICH sessions appear has changed: the same records are live,
        // the same one is filtered.
        assert.deepEqual(
          live.map((entry) => `${entry.workspaceId}~${entry.assistant}`).sort(),
          ["ws-1~claude-code", "ws-1~codex", "ws-2~claude-code"],
          "exactly the live records appear",
        );
        assert.equal(live.some((entry) => entry.workspaceId === "ws-3"), false, "the expired record is still filtered out");
        assert.equal((await readRecordsOnDisk(ws)).length, 4, "all four records are still on disk — the read filtered, it never deleted");
      });
    },
  },

  // ══ Scenario: the run fact is stamped per entry, in one array ══
  {
    name: "mesh-presence-session-entry/00 the run fact is stamped per entry, in one array",
    async run() {
      await withFixture(async ({ ws, config }) => {
        await seedSession(ws, { workspaceId: "ws-A", repo: "alpha", assistant: "claude-code", sessionId: "sess-A1" });
        // A SECOND live session in ws-A (a different assistant, so it is a second
        // record under either milestone's key) — the "both report true" clause.
        await seedSession(ws, { workspaceId: "ws-A", repo: "alpha", assistant: "codex", sessionId: "sess-A2" });
        await seedSession(ws, { workspaceId: "ws-B", repo: "beta", assistant: "claude-code", sessionId: "sess-B1" });

        const live = await readLiveSessions(ws, NODE_ID, { now: NOW, config, workspacesWithRuns: new Set(["ws-A"]) });

        const inA = live.filter((entry) => entry.workspaceId === "ws-A");
        const inB = live.filter((entry) => entry.workspaceId === "ws-B");
        assert.equal(inA.length, 2, "both ws-A sessions are present");
        assert.equal(inB.length, 1, "the ws-B session is present");
        for (const entry of inA) assert.equal(entry.workspaceHasRun, true, `the ws-A entry ${entry.sessionId}'s workspaceHasRun is true`);
        assert.equal(inB[0].workspaceHasRun, false, "the ws-B entry's workspaceHasRun is false");
        assert.equal(live.length, 3, "both workspaces' entries are present in the SAME array — the stamp describes a workspace, it never removes a session");
        assert.deepEqual(
          inA.map((entry) => entry.sessionId).sort(),
          ["sess-A1", "sess-A2"],
          "two live sessions in ws-A BOTH report true — the fact is about the workspace, not about which session got there first",
        );
        for (const entry of live) assert.deepEqual(Object.keys(entry), FROZEN_SIX, "every entry is still the ordered six");
      });
    },
  },

  // ══ Scenario Outline: liveness behaves exactly as it does today (3 rows) ══
  {
    name: "mesh-presence-session-entry/00 liveness behaves exactly as it does today (Examples: half the TTL / exactly the TTL / the TTL plus 1ms)",
    async run() {
      const rows = [
        { case: "comfortably live", ageMs: TTL_MS / 2, present: true },
        { case: "exactly at the threshold", ageMs: TTL_MS, present: true },
        { case: "just past", ageMs: TTL_MS + 1, present: false },
      ];
      for (const row of rows) {
        await withFixture(async ({ ws, config }) => {
          await seedSession(ws, { workspaceId: "ws-1", repo: "demo", at: agedBy(row.ageMs), sessionId: "sess-A" });
          const live = await readLiveSessions(ws, NODE_ID, { now: NOW, config });
          assert.equal(live.length, row.present ? 1 : 0, `${row.case}: the entry is ${row.present ? "present" : "absent"}`);
          if (row.present) assert.deepEqual(Object.keys(live[0]), FROZEN_SIX, `${row.case}: and it is the ordered six`);
          assert.equal((await readRecordsOnDisk(ws)).length, 1, `${row.case}: the record is still on disk — liveness is a read-time filter`);
        });
      }
    },
  },

  // ══ Scenario: a node with no live sessions still yields an empty array ══
  {
    name: "mesh-presence-session-entry/00 a node with no live sessions still yields an empty array",
    async run() {
      await withFixture(async ({ ws, config }) => {
        // (a) a node with NO session records at all — nothing has ever been written,
        //     so the sessions/ directory itself does not exist.
        const none = await readLiveSessions(ws, OTHER_NODE_ID, { now: NOW, config });
        assert.ok(Array.isArray(none), "a node with no session records returns an ARRAY");
        assert.deepEqual(none, [], "…and it is empty — present, never null, never undefined");
        assert.notEqual(none, null);
        assert.notEqual(none, undefined);

        // (b) a node whose ONLY session record is expired.
        await seedSession(ws, { workspaceId: "ws-1", repo: "demo", at: agedBy(TTL_MS + 1), sessionId: "sess-A" });
        const expiredOnly = await readLiveSessions(ws, NODE_ID, { now: NOW, config });
        assert.ok(Array.isArray(expiredOnly), "a node whose only record is expired returns an ARRAY");
        assert.deepEqual(expiredOnly, [], "…and it is empty");

        // …and the presence record assembled from it still carries `sessions: []`.
        for (const sessions of [none, expiredOnly]) {
          const record = assemblePresenceRecord({ nodeId: NODE_ID, heartbeatAt: NOW, activeRuns: [], sessions, aofVersion: "1.2.3" });
          assert.ok(Object.hasOwn(record, "sessions"), "the presence record still carries the `sessions` key rather than omitting it");
          assert.deepEqual(record.sessions, [], "…as an empty array");
          assert.deepEqual(Object.keys(record), ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion"], "…in the frozen m38 five-key order");
        }
      });
    },
  },
];
