// Fitness function: acd-session-record-frozen (milestone 38 / ADR-002, fitness #2 —
// AMENDED IN PLACE by milestone 48 / ADR-002, fitness #7) — "the session record is
// EXACTLY its ordered key set [nodeId, workspaceId, repo, assistant, sessionId,
// startedAt, lastPingAt]."
//
// THE AMENDMENT (48/ADR-002): the frozen SIX became a frozen SEVEN by INSERTION —
// `sessionId` after `assistant`, so the identity block (nodeId, workspaceId, repo,
// assistant, sessionId) sits together ahead of the lifecycle pair (startedAt,
// lastPingAt). Every m38 key keeps its RELATIVE order: an insertion, never a reorder,
// which is m38/ADR-001's additive rule applied to this record. The amendment is
// mandated by the ADR, in this file rather than a new sibling (48/ADR-009's
// no-new-test-sibling rule).
//
// The added clause (48/ADR-001): `sessionId` is EXPLICITLY PRESENT and `null` for an
// anonymous session — never omitted, never generated. Present-and-null is what lets a
// reader tell "this session has no id" from "this build does not speak session ids";
// an omitted key collapses those two into one silence.
//
// Proofs:
//  1. The assembler returns the frozen SEVEN, order-sensitive.
//  2. The freeze holds when lastPingAt diverges from startedAt (a ping refresh).
//  3. ANONYMOUS: an assemble with no sessionId supplied still carries the key, valued
//     exactly `null` — and SURVIVES JSON.stringify (the shape actually persisted).
//  4. PRODUCER-FED (m38/ADR-008): the record the REAL `startSession` writes to disk,
//     read back as JSON, carries the same seven keys IN ORDER — key order is
//     observable because the record is persisted as pretty JSON, so the freeze is a
//     fact about the file, not only about an in-memory object.
//  Self-check (m03 non-vacuous): a planted assembler returning an extra/missing/
//  reordered key, and one that OMITS sessionId for an anonymous session, fail the
//  SAME assertions the real assembler passes.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assembleSessionRecord, startSession, sessionRecordPath } from "../../../src/mesh/session.mjs";
import { loadWorkspace } from "../../../src/work.mjs";

// m50/ADR-008 decision 8 APPENDED an eighth key, `relaying` — the worker's stated fact
// that something is bridging this session's PTY output up its stream. An APPEND is the
// same re-freeze-by-growth m48 itself performed on m38's six; every key above keeps its
// position, so this list still asserts an exact ordered record rather than a subset.
const FROZEN_KEYS = ["nodeId", "workspaceId", "repo", "assistant", "sessionId", "startedAt", "lastPingAt", "relaying"];

const SAMPLE = {
  nodeId: "node-a",
  workspaceId: "ws-1",
  repo: "my-repo",
  assistant: "claude-code",
  sessionId: "3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9",
  startedAt: "2026-07-10T12:00:00.000Z",
  lastPingAt: "2026-07-10T12:00:00.000Z",
};

const NODE_ID = "node-a";
const NOW = "2026-08-10T12:00:00.000Z";

async function makeFixture() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-acd-session-record-frozen-"));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const env = { AOF_GLOBAL_HOME: home };
  return { tmp, root, home, env, ws: await loadWorkspace(root, undefined, { env }) };
}

export const archTests = [
  {
    name: "arch/48 ADR-002 (acd-session-record-frozen): the assembler returns EXACTLY the seven frozen keys, in order — sessionId INSERTED after assistant, every m38 key keeping its relative order",
    run: async () => {
      const record = assembleSessionRecord(SAMPLE);
      assert.deepEqual(Object.keys(record), FROZEN_KEYS, "assembler key order matches the frozen seven");
      // The insertion property, asserted directly: strike sessionId — and m50/ADR-008's
      // APPENDED `relaying`, which sits at the tail and moves nothing — and the m38 six
      // remain, in the m38 order. Both growths are asserted the same way and for the same
      // reason: this record has only ever grown by insertion-at-a-named-point or append,
      // and a REORDER is the thing that would break every reader at once.
      assert.deepEqual(
        Object.keys(record).filter((key) => key !== "sessionId" && key !== "relaying"),
        ["nodeId", "workspaceId", "repo", "assistant", "startedAt", "lastPingAt"],
        "the m38 six keep their RELATIVE order — this is an insertion plus a tail append, never a reorder",
      );
      assert.equal(Object.keys(record).at(-1), "relaying", "…and m50's own growth is an APPEND: it is the LAST key, so every key that predates it kept its index");
    },
  },
  {
    name: "arch/48 ADR-002 (acd-session-record-frozen): the freeze holds when lastPingAt diverges from startedAt (a ping refresh)",
    run: async () => {
      const record = assembleSessionRecord({ ...SAMPLE, lastPingAt: "2026-07-10T12:00:30.000Z" });
      assert.deepEqual(Object.keys(record), FROZEN_KEYS);
      assert.equal(record.startedAt, "2026-07-10T12:00:00.000Z", "startedAt is unchanged by a ping refresh");
      assert.equal(record.lastPingAt, "2026-07-10T12:00:30.000Z", "lastPingAt carries the refreshed value");
      assert.equal(record.sessionId, SAMPLE.sessionId, "the id rides the refresh unchanged");
    },
  },
  {
    name: "arch/48 ADR-001+002 (acd-session-record-frozen): an ANONYMOUS session's sessionId is EXPLICITLY PRESENT and null — and survives JSON.stringify, which is the shape actually persisted",
    run: async () => {
      const { sessionId, ...anonymousInput } = SAMPLE;
      const record = assembleSessionRecord(anonymousInput);
      assert.deepEqual(Object.keys(record), FROZEN_KEYS, "the key set is unconditional — anonymity does not drop a key");
      assert.equal(record.sessionId, null, "the value is exactly null");
      assert.ok(Object.hasOwn(record, "sessionId"), "the key is PRESENT, not merely undefined-valued");
      // The load-bearing half: `sessionId: undefined` would key-check fine in memory
      // and VANISH through JSON.stringify — the file a reader actually gets.
      const roundTripped = JSON.parse(JSON.stringify(record));
      assert.deepEqual(Object.keys(roundTripped), FROZEN_KEYS, "the key survives the JSON round-trip");
      assert.equal(roundTripped.sessionId, null);
    },
  },
  {
    name: "arch/48 ADR-002 (acd-session-record-frozen): PRODUCER-FED — the record the REAL startSession writes to disk reads back as the same seven keys, in order (addressable AND anonymous)",
    run: async () => {
      const fixture = await makeFixture();
      try {
        const key = { nodeId: NODE_ID, workspaceId: "ws-1", assistant: "claude-code", sessionId: "sess-A" };
        await startSession(fixture.ws, { ...key, repo: "demo", now: NOW });
        const onDisk = JSON.parse(await readFile(sessionRecordPath(fixture.ws, key), "utf8"));
        assert.deepEqual(Object.keys(onDisk), FROZEN_KEYS, "the persisted record's key ORDER is the frozen seven");
        assert.equal(onDisk.sessionId, "sess-A");

        const anonymousKey = { nodeId: NODE_ID, workspaceId: "ws-2", assistant: "claude-code", sessionId: null };
        await startSession(fixture.ws, { ...anonymousKey, repo: "demo", now: NOW });
        const anonymousOnDisk = JSON.parse(await readFile(sessionRecordPath(fixture.ws, anonymousKey), "utf8"));
        assert.deepEqual(Object.keys(anonymousOnDisk), FROZEN_KEYS, "an anonymous record persists the same seven keys");
        assert.equal(anonymousOnDisk.sessionId, null, "present-and-null on disk, not omitted");
      } finally {
        await rm(fixture.tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/48 ADR-002 (acd-session-record-frozen): self-check — a planted assembler with an extra/missing/reordered key, or one that OMITS sessionId when anonymous, fails the SAME assertions the real one passes",
    run: async () => {
      const real = assembleSessionRecord(SAMPLE);
      assert.deepEqual(Object.keys(real), FROZEN_KEYS, "the real assembler is clean");

      const extraKey = { ...real, extra: "smuggled" };
      assert.notDeepEqual(Object.keys(extraKey), FROZEN_KEYS, "a planted extra key trips the detector");

      const { repo, ...missingKey } = real;
      assert.notDeepEqual(Object.keys(missingKey), FROZEN_KEYS, "a planted missing key trips the detector");

      const reordered = {
        nodeId: real.nodeId, workspaceId: real.workspaceId, assistant: real.assistant,
        repo: real.repo, sessionId: real.sessionId, startedAt: real.startedAt, lastPingAt: real.lastPingAt,
      };
      assert.notDeepEqual(Object.keys(reordered), FROZEN_KEYS, "a planted reordering trips the order-sensitive detector");

      // m38's own six — the shape this amendment REPLACES — must now trip, or the
      // re-freeze would be satisfied by the pre-m48 record.
      const m38Six = {
        nodeId: real.nodeId, workspaceId: real.workspaceId, repo: real.repo,
        assistant: real.assistant, startedAt: real.startedAt, lastPingAt: real.lastPingAt,
      };
      assert.notDeepEqual(Object.keys(m38Six), FROZEN_KEYS, "the pre-m48 six no longer satisfies the freeze");

      // The anonymous-omission plant: an assembler that spreads sessionId only when
      // truthy passes an in-memory key check ONLY if it also drops the key — and it
      // vanishes through JSON.stringify either way. Both halves must trip.
      const plantedAnonymous = (input) => ({
        nodeId: input.nodeId, workspaceId: input.workspaceId, repo: input.repo, assistant: input.assistant,
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        startedAt: input.startedAt, lastPingAt: input.lastPingAt,
      });
      const { sessionId, ...anonymousInput } = SAMPLE;
      const planted = plantedAnonymous(anonymousInput);
      assert.notDeepEqual(Object.keys(planted), FROZEN_KEYS, "a planted omit-when-anonymous assembler trips the key-set assertion");
      assert.equal(Object.hasOwn(planted, "sessionId"), false, "…and the key is genuinely absent, which is the defect the clause forbids");

      const plantedUndefined = { ...real, sessionId: undefined };
      assert.deepEqual(Object.keys(plantedUndefined), FROZEN_KEYS, "an undefined-valued key passes the in-memory key check…");
      assert.notDeepEqual(Object.keys(JSON.parse(JSON.stringify(plantedUndefined))), FROZEN_KEYS, "…and is caught by the JSON round-trip clause, which is why that clause exists");
    },
  },
];
