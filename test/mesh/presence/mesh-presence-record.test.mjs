// Traceability wiring for milestone 23 / story 00 — mesh:heartbeat assembles and
// publishes this node's presence record (tasks/00_presence-record.feature).
//
// Covers EVERY @executable scenario in tasks/00_presence-record.feature, exercising
// the REAL in-process registry (src/command-core.mjs + src/commands/mesh-heartbeat.mjs
// over src/mesh/presence.mjs + the m22 src/mesh/store.mjs presence seam) against a temp
// fixture repo — loadWorkspace + invoke, real fs, in-process. One test object per
// @executable scenario, each name tracing to feature + scenario. node:assert/strict.
//
//   00_presence-record.feature — mesh:heartbeat publishes THIS node's presence record
//     (the frozen { nodeId, heartbeatAt, activeRuns, aofVersion } schema, byte-equivalent
//     on read-back); activeRuns is READ from the run records (exactly the running runs,
//     no queued/terminal, never a run-record mutation); the record is a rebuildable
//     projection of the clock + run records; a republish bumps heartbeatAt, keeps nodeId
//     stable, and leaves a peer's presence record byte-untouched. Git alone, no relay.
//
//   milestone 130 / story 03 / task 00 — 00_presence-carries-the-loops.feature: presence
//     carries the loops — readActiveLoops beside readActiveRuns (one eleven-key entry per
//     loopRunId, the standing request as a word), assemblePresenceRecord emitting `loops`
//     LAST and only when non-empty, both producers carrying it (the verb here, the launcher
//     tick in mesh-presence-aggregate-workspaces.test.mjs), the registry reshape passing it
//     through, and the desktop's parser tolerating it.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorkspace, listItems } from "../../../src/work.mjs";
import { invoke } from "../../../src/command-core.mjs";
import { meshDir, presenceRecordPath, publishNodeRecord } from "../../../src/mesh/store.mjs";
import { assemblePresenceRecord, publishPresenceRecord, readActiveLoops, readActiveRuns } from "../../../src/mesh/presence.mjs";
import { loopStopsDir, markStopHonoured, readStopRequest, requestLoopStop, stopRequestPath } from "../../../src/loop/stop-request.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore, queryGlobalRegistry } from "../../../src/global-node-registry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// milestone 38 / story 00 (ADR-001) — the presence record grows ADDITIVELY to FIVE
// keys (`sessions` inserted before the trailing `aofVersion`); mesh:heartbeat does
// not yet read session records, so it always emits `sessions: []` (absent-is-benign)
// — the m23 four keys keep their relative order and their VALUES stay byte-identical.
const FROZEN_KEYS = ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion"];
const NODE_ID = "test-node-a";

// A fixture repo whose config PINS mesh.nodeId (so the resolved id is stable + known)
// and whose work stream is a single milestone the test controls. The mesh.nodeId pin
// means deriveNodeId returns it verbatim — heartbeat and identity share the same id.
async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-presence-"));
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, "23_milestone_control-node-relay");
  await mkdir(milestoneDir, { recursive: true });
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID } }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    `---\ntype: milestone\nnumber: 23\nslug: control-node-relay\nstatus: in-progress\ntitle: "Control Node Relay"\ncreated: 2026-06-30\nupdated: 2026-06-30\n---\n# 23\n`,
    "utf8"
  );
  return { repo, workDir, milestoneDir };
}

const ctxFor = async (repo) => ({ workspace: await loadWorkspace(repo) });

// Seed a run record directly under the milestone's runs/ dir (the run-store path seam),
// in the given state. A direct write so the test controls the exact run set.
async function seedRun(milestoneDir, runId, state, createdAt = "2026-06-29T00:00:00.000Z") {
  const runsDir = path.join(milestoneDir, "runs");
  await mkdir(runsDir, { recursive: true });
  const record = {
    runId, itemRef: "23", state, attempt: 1, outcome: state === "running" || state === "queued" ? null : state,
    sessionId: null, brief: {}, createdAt, updatedAt: createdAt,
    failureReason: null, heartbeatAt: null, retryOf: null, reclaimedAt: null,
  };
  await writeFile(path.join(runsDir, `${runId}.json`), JSON.stringify(record, null, 2), "utf8");
  return path.join(runsDir, `${runId}.json`);
}

// ── milestone 130 / story 03 / task 00 fixtures ──────────────────────────────────────────

// The ELEVEN keys of a loop entry, in the frozen order 130/ADR-005 §1 fixes.
const LOOP_ENTRY_KEYS = ["loopRunId", "workspaceId", "scope", "level", "cap", "phase", "cycle", "ref", "runId", "supervised", "stop"];

// A workspace `W` (pinned `workspaceId: "w1"`) holding items 03, 03/01 and 03/02 — the three
// the reduction is driven over. `items` are the REAL listItems rows (each with its `dir`).
async function makeLoopRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-presence-loops-"));
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, "03_milestone_loop");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId: NODE_ID, workspaceId: "w1" } }, null, 2)}\n`,
    "utf8",
  );
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(path.join(milestoneDir, "SPEC.md"), "---\ntype: milestone\nnumber: 03\nslug: loop\nstatus: in-progress\ntitle: Loop\n---\n", "utf8");
  for (const [number, slug] of [["01", "first"], ["02", "second"]]) {
    const storyDir = path.join(milestoneDir, "stories", `${number}_story_${slug}`);
    await mkdir(storyDir, { recursive: true });
    await writeFile(path.join(storyDir, "STORY.md"), `---\ntype: story\nnumber: ${number}\nslug: ${slug}\nparent: 03\nstatus: in-progress\ntitle: ${slug}\n---\n`, "utf8");
  }
  const items = (await listItems(workDir)).filter((row) => ["03", "03/01", "03/02"].includes(row.ref));
  assert.equal(items.length, 3, "the fixture enumerates its three items");
  return { repo, workDir, items };
}

// A USABLE `brief.loop` (the declaration read's five-key rule plus the mint's other four),
// with any override set to `undefined` DELETED — the way a missing key is missing.
function loopBrief(overrides = {}) {
  const loop = { loopRunId: "L1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-06-29T00:00:00.000Z", id: "loop-id", supervised: false, ...overrides };
  for (const key of Object.keys(loop)) if (loop[key] === undefined) delete loop[key];
  return { loop };
}

// A run record for `ref` in `state` carrying `brief`, written under the item's own runs/ dir
// (the run-store path seam), runId `run-<ref>` so a Then can name the contributing run.
async function seedLoopRun(fx, ref, state, brief, extra = {}) {
  const item = fx.items.find((row) => row.ref === ref);
  const runsDir = path.join(item.dir, "runs");
  await mkdir(runsDir, { recursive: true });
  const runId = `run-${ref.replace("/", "-")}`;
  const record = {
    runId, itemRef: ref, state, attempt: 1, outcome: state === "running" || state === "queued" ? null : state,
    sessionId: null, brief, createdAt: "2026-06-29T00:00:00.000Z", updatedAt: "2026-06-29T00:00:00.000Z",
    failureReason: null, heartbeatAt: "2026-06-29T00:10:00.000Z", retryOf: null, reclaimedAt: null,
    ...extra,
  };
  const file = path.join(runsDir, `${runId}.json`);
  await writeFile(file, JSON.stringify(record, null, 2), "utf8");
  return file;
}

function sampleLoopEntry() {
  return { loopRunId: "L1", workspaceId: "w1", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 1, ref: "03/01", runId: "run-03-01", supervised: false, stop: null };
}

// Seed a peer's presence record directly through the store seam (a peer that synced in).
async function seedPeerPresence(workspace, id) {
  const record = { nodeId: id, heartbeatAt: "2026-06-29T00:00:00.000Z", activeRuns: [], aofVersion: "0.1.0" };
  await mkdir(path.join(meshDir(workspace), "presence"), { recursive: true });
  await writeFile(presenceRecordPath(workspace, id), JSON.stringify(record, null, 2), "utf8");
  return record;
}

export const meshPresenceRecordTests = [
  // ══ Scenario: mesh:heartbeat publishes this node's presence record with the complete frozen schema ══
  {
    name: "mesh-presence-record/00 mesh:heartbeat publishes this node's presence record with the complete frozen schema",
    async run() {
      const { repo } = await makeRepo();
      try {
        const ctx = await ctxFor(repo);
        // Given this node has no running runs → When I invoke mesh:heartbeat.
        const record = await invoke("mesh:heartbeat", { now: "2026-06-30T10:00:00.000Z" }, ctx);
        // A presence record for this node's id is persisted under the presence seam.
        const onDiskPath = presenceRecordPath(ctx.workspace, NODE_ID);
        assert.ok(onDiskPath.startsWith(meshDir(ctx.workspace)), "persisted under the partition root's presence seam");
        const onDisk = await readFile(onDiskPath, "utf8");
        // The frozen schema, all keys present, in order, no extras.
        assert.deepEqual(Object.keys(record), FROZEN_KEYS, "carries no keys beyond the frozen schema (in order)");
        assert.equal(record.nodeId, NODE_ID, "nodeId equals this node's mesh.nodeId");
        // heartbeatAt is an ISO-8601 UTC-Z instant.
        assert.match(record.heartbeatAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "heartbeatAt is ISO-8601 UTC-Z");
        assert.deepEqual(record.activeRuns, [], "activeRuns is an empty list");
        assert.deepEqual(record.sessions, [], "sessions is the empty array (mesh:heartbeat reads no session records) — present, not omitted");
        assert.equal(typeof record.aofVersion, "string", "aofVersion is a string");
        assert.ok(record.aofVersion.length > 0, "aofVersion is non-empty");
        // 1c — the m23 FOUR-KEY projection (nodeId, heartbeatAt, activeRuns,
        // aofVersion) is byte-identical to a HAND-BUILT m23 record for the same
        // values, asserted directly here (not merely inherited from the separate
        // acd-session-presence-additive arch-test) — the ADR-001 freeze.
        const m23HandBuilt = { nodeId: record.nodeId, heartbeatAt: record.heartbeatAt, activeRuns: record.activeRuns, aofVersion: record.aofVersion };
        assert.equal(
          JSON.stringify(m23HandBuilt),
          JSON.stringify({ nodeId: NODE_ID, heartbeatAt: record.heartbeatAt, activeRuns: [], aofVersion: record.aofVersion }),
          "the four m23 keys are byte-identical to a hand-built m23 record",
        );
        // The persisted record is byte-equivalent to the returned record.
        assert.equal(onDisk, JSON.stringify(record, null, 2), "persisted record byte-equivalent to returned");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: mesh:heartbeat reads activeRuns from the run records and lists exactly the in-flight run ids ══
  {
    name: "mesh-presence-record/00 mesh:heartbeat reads activeRuns from the run records and lists exactly the in-flight run ids",
    async run() {
      const { repo, milestoneDir } = await makeRepo();
      try {
        // Three running runs, one queued, one terminal (done).
        await seedRun(milestoneDir, "run-a1", "running");
        await seedRun(milestoneDir, "run-b2", "running");
        await seedRun(milestoneDir, "run-c3", "running");
        await seedRun(milestoneDir, "run-q0", "queued");
        await seedRun(milestoneDir, "run-z9", "done");
        const ctx = await ctxFor(repo);
        const record = await invoke("mesh:heartbeat", { now: "2026-06-30T10:00:00.000Z" }, ctx);
        // activeRuns lists EXACTLY the three running runs (no extras, none dropped).
        assert.deepEqual([...record.activeRuns].sort(), ["run-a1", "run-b2", "run-c3"], "activeRuns lists exactly the three running runs");
        assert.ok(!record.activeRuns.includes("run-q0"), "does not list the queued run");
        assert.ok(!record.activeRuns.includes("run-z9"), "does not list the terminal run");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: publishing presence reads the run records without mutating them ══
  {
    name: "mesh-presence-record/00 publishing presence reads the run records without mutating them",
    async run() {
      const { repo, milestoneDir } = await makeRepo();
      try {
        const runPath = await seedRun(milestoneDir, "run-a1", "running");
        const before = await readFile(runPath, "utf8");
        const ctx = await ctxFor(repo);
        const record = await invoke("mesh:heartbeat", { now: "2026-06-30T10:00:00.000Z" }, ctx);
        assert.ok(record.activeRuns.includes("run-a1"), "activeRuns lists run-a1");
        // The run record on disk is byte-identical to before the heartbeat (a READ).
        assert.equal(await readFile(runPath, "utf8"), before, "run-a1 run record byte-identical after the heartbeat");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: the presence record is a rebuildable projection of the clock and the run records ══
  {
    name: "mesh-presence-record/00 the presence record is a rebuildable projection of the clock and the run records",
    async run() {
      const { repo, milestoneDir } = await makeRepo();
      try {
        await seedRun(milestoneDir, "run-a1", "running");
        const ctx = await ctxFor(repo);
        const instant = "2026-06-30T10:00:00.000Z";
        const first = await invoke("mesh:heartbeat", { now: instant }, ctx);
        // Re-derive from the SAME injected instant + the SAME run records.
        const second = await invoke("mesh:heartbeat", { now: instant }, await ctxFor(repo));
        assert.deepEqual(second, first, "the second record is content-equivalent to the first (a deterministic projection)");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: republishing presence bumps heartbeatAt, keeps nodeId stable, leaves a peer's presence byte-untouched ══
  {
    name: "mesh-presence-record/00 republishing presence bumps heartbeatAt, keeps nodeId stable, and leaves a peer's presence record byte-untouched",
    async run() {
      const { repo } = await makeRepo();
      try {
        const ctx = await ctxFor(repo);
        const first = await invoke("mesh:heartbeat", { now: "2026-06-30T10:00:00.000Z" }, ctx);
        // A peer presence record exists in the tree; record its on-disk bytes.
        await seedPeerPresence(ctx.workspace, "umami-mbp");
        const peerPath = presenceRecordPath(ctx.workspace, "umami-mbp");
        const peerBefore = await readFile(peerPath, "utf8");
        // Republish with a LATER injected instant.
        const second = await invoke("mesh:heartbeat", { now: "2026-06-30T10:05:00.000Z" }, await ctxFor(repo));
        assert.equal(second.nodeId, first.nodeId, "nodeId is unchanged");
        assert.ok(Date.parse(second.heartbeatAt) > Date.parse(first.heartbeatAt), "heartbeatAt is strictly after the previous");
        // Still exactly one presence record file for this node's id.
        const files = await readdir(path.join(meshDir(ctx.workspace), "presence"));
        assert.equal(files.filter((f) => f === `${NODE_ID}.json`).length, 1, "exactly one presence record file for this node's id");
        // The peer presence record on disk is byte-identical to before the republish.
        assert.equal(await readFile(peerPath, "utf8"), peerBefore, "peer presence record byte-identical after the republish");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 130 / story 03 / task 00 — tasks/00_presence-carries-the-loops.feature
  // (@executable): presence carries the loops — an ADDITIVE key read by the SAME pass as
  // activeRuns, OMITTED when empty (the buildId discipline, 130/ADR-005 §1), emitted by both
  // producers and passed through by the registry reshape (§2). Every Then below reads a value
  // off the REAL readActiveLoops / assemblePresenceRecord / mesh:heartbeat over real run records
  // and real request files; nothing is stubbed but the clock.
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // ══ Scenario Outline: readActiveLoops reduces the running runs to one entry per loop ══
  {
    name: "presence-carries-the-loops/00 readActiveLoops reduces the running runs to one entry per loop — eleven keys in frozen order, only running + usable, the latest run per loopRunId, encounter order (Examples)",
    async run() {
      const rows = [
        { label: "none", records: [], answer: [] },
        { label: "03/01 running under L1", records: [["03/01", "running", loopBrief({ loopRunId: "L1" })]], answer: [{ loopRunId: "L1", ref: "03/01", cap: 3, phase: "continue", cycle: 1, supervised: false, stop: null }] },
        { label: "03/01 done with a brief.loop", records: [["03/01", "done", loopBrief({ loopRunId: "L1" })]], answer: [] },
        { label: "03/01 queued with a brief.loop", records: [["03/01", "queued", loopBrief({ loopRunId: "L1" })]], answer: [] },
        { label: "03/01 running with no brief.loop", records: [["03/01", "running", {}]], answer: [] },
        { label: "03/01 running with a brief.loop missing scope", records: [["03/01", "running", loopBrief({ loopRunId: "L1", scope: undefined })]], answer: [] },
        { label: "03/01 running with startedAt null", records: [["03/01", "running", loopBrief({ loopRunId: "L1", startedAt: null })]], answer: [] },
        { label: "03/01 running with cap 0 and no cycle key", records: [["03/01", "running", loopBrief({ loopRunId: "L1", cap: 0, cycle: undefined })]], answer: [{ loopRunId: "L1", ref: "03/01", cap: 0, cycle: null }] },
        { label: "03/01 running with phase verify, cycle 3", records: [["03/01", "running", loopBrief({ loopRunId: "L1", phase: "verify", cycle: 3 })]], answer: [{ loopRunId: "L1", phase: "verify", cycle: 3 }] },
        { label: "03/01 running with a heartbeatAt ten minutes old", records: [["03/01", "running", loopBrief({ loopRunId: "L1" }), { heartbeatAt: "2026-06-29T00:00:00.000Z" }]], answer: [{ loopRunId: "L1", ref: "03/01" }] },
        { label: "03/01 and 03/02 both running under L1, 03/02 created later", records: [["03/01", "running", loopBrief({ loopRunId: "L1" })], ["03/02", "running", loopBrief({ loopRunId: "L1" }), { createdAt: "2026-06-30T00:00:00.000Z" }]], answer: [{ loopRunId: "L1", ref: "03/02", runId: "run-03-02" }] },
        { label: "03/01 under L1 and 03/02 under L2", records: [["03/01", "running", loopBrief({ loopRunId: "L1" })], ["03/02", "running", loopBrief({ loopRunId: "L2" })]], answer: [{ loopRunId: "L1", ref: "03/01" }, { loopRunId: "L2", ref: "03/02" }] },
        { label: "03/01 running under L1 and 03/02 done under L1, created later", records: [["03/01", "running", loopBrief({ loopRunId: "L1" })], ["03/02", "done", loopBrief({ loopRunId: "L1" }), { createdAt: "2026-06-30T00:00:00.000Z" }]], answer: [{ loopRunId: "L1", ref: "03/01", runId: "run-03-01" }] },
      ];
      for (const row of rows) {
        const fx = await makeLoopRepo();
        try {
          const written = [];
          for (const [ref, state, brief, extra] of row.records) written.push(await seedLoopRun(fx, ref, state, brief, extra));
          const before = await Promise.all(written.map((file) => readFile(file, "utf8")));
          const loops = await readActiveLoops(fx.items, { workspaceId: "w1", stopRequestFor: () => null });
          assert.equal(loops.length, row.answer.length, `${row.label}: ${row.answer.length} entr${row.answer.length === 1 ? "y" : "ies"} — got ${JSON.stringify(loops)}`);
          for (const [index, expected] of row.answer.entries()) {
            const entry = loops[index];
            assert.deepEqual(Object.keys(entry), LOOP_ENTRY_KEYS, `${row.label}: the eleven keys in frozen order`);
            assert.equal(entry.workspaceId, "w1", `${row.label}: stamped with the workspace handed in`);
            assert.equal(entry.scope, "03", `${row.label}: scope copied from the declaration`);
            assert.equal(entry.level, "L2", `${row.label}: level copied from the declaration`);
            for (const [key, value] of Object.entries(expected)) assert.equal(entry[key], value, `${row.label}: ${key}`);
            if (expected.runId === undefined && expected.ref !== undefined) assert.equal(entry.runId, `run-${expected.ref.replace("/", "-")}`, `${row.label}: runId names the contributing run`);
          }
          const after = await Promise.all(written.map((file) => readFile(file, "utf8")));
          assert.deepEqual(after, before, `${row.label}: every run record's bytes are unchanged — the read is a read`);
        } finally {
          await rm(fx.repo, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario Outline: the standing request rides the entry as a word ══
  {
    name: "presence-carries-the-loops/00 the standing request rides the entry as a word — null / drain / cancel through STOP_LEVELS, an honoured request still by level, a corrupt file null, keyed by loopRunId never scope (Examples)",
    async run() {
      const rows = [
        { label: "does not exist", arrange: async () => {}, stop: null },
        { label: "level 1 requested", arrange: async (dir) => { await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: "w1", by: { node: "n1", pid: 1 } }); }, stop: "drain" },
        { label: "level 2 requested", arrange: async (dir) => { await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: "w1", by: { node: "n1", pid: 1 } }); await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: "w1", by: { node: "n1", pid: 1 } }); }, stop: "cancel" },
        { label: "level 1 honoured", arrange: async (dir) => { await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: "w1", by: { node: "n1", pid: 1 } }); await markStopHonoured(dir, "L1"); }, stop: "drain" },
        { label: "level 2 honoured", arrange: async (dir) => { await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: "w1", by: { node: "n1", pid: 1 } }); await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: "w1", by: { node: "n1", pid: 1 } }); await markStopHonoured(dir, "L1"); }, stop: "cancel" },
        { label: "a file that does not parse", arrange: async (dir) => { await mkdir(dir, { recursive: true }); await writeFile(stopRequestPath(dir, "L1"), "{ not json", "utf8"); }, stop: null },
        { label: "exists for L9 only", arrange: async (dir) => { await requestLoopStop(dir, { loopRunId: "L9", scope: "03", workspaceId: "w1", by: { node: "n1", pid: 1 } }); }, stop: null },
      ];
      for (const row of rows) {
        const fx = await makeLoopRepo();
        // ADR-001 §1 — the ONE home under this test's isolated AOF_GLOBAL_HOME (the runner sets
        // one per test), cleared so a previous row's file is never this row's fact.
        const dir = loopStopsDir();
        await rm(dir, { recursive: true, force: true });
        try {
          await seedLoopRun(fx, "03/01", "running", loopBrief({ loopRunId: "L1" }));
          await row.arrange(dir);
          // Explicitly through the seam the task names — story 01's read under loopStopsDir() …
          const explicit = await readActiveLoops(fx.items, { workspaceId: "w1", stopRequestFor: (loopRunId) => readStopRequest(dir, loopRunId) });
          assert.equal(explicit[0]?.stop, row.stop, `${row.label}: stop through an explicit stopRequestFor`);
          // … and through the DEFAULT, which is the same read at the same home.
          const byDefault = await readActiveLoops(fx.items, { workspaceId: "w1" });
          assert.equal(byDefault[0]?.stop, row.stop, `${row.label}: stop through the default read`);
        } finally {
          await rm(dir, { recursive: true, force: true });
          await rm(fx.repo, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario Outline: the record is additive — six keys byte-identical without loops, loops last with them ══
  {
    name: "presence-carries-the-loops/00 the record is additive — the six keys byte-identical without loops, loops LAST with them, and never for an empty, null, undefined or non-array value (Examples)",
    async run() {
      const T = "2026-06-30T10:00:00.000Z";
      const base = { nodeId: "n1", heartbeatAt: T, activeRuns: ["r1"], sessions: [], aofVersion: "0.1.0", buildId: "b1" };
      const six = ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "buildId"];
      const today = JSON.stringify(assemblePresenceRecord(base));
      const rows = [
        { label: "no loops key", input: base, keys: six },
        { label: "loops: []", input: { ...base, loops: [] }, keys: six },
        { label: "loops: undefined", input: { ...base, loops: undefined }, keys: six },
        { label: "loops: null", input: { ...base, loops: null }, keys: six },
        { label: 'loops: "L1"', input: { ...base, loops: "L1" }, keys: six },
        { label: "one eleven-key entry", input: { ...base, loops: [sampleLoopEntry()] }, keys: [...six, "loops"] },
      ];
      for (const row of rows) {
        const record = assemblePresenceRecord(row.input);
        assert.deepEqual(Object.keys(record), row.keys, `${row.label}: keys`);
        const { loops: _loops, ...withoutLoops } = record;
        assert.equal(JSON.stringify(withoutLoops), today, `${row.label}: JSON.stringify without loops equals today's record byte for byte`);
        if (row.keys.includes("loops")) assert.deepEqual(record.loops, [sampleLoopEntry()], `${row.label}: the entries ride through as handed`);
      }
    },
  },

  // ══ Scenario: a record without buildId still puts loops last ══
  {
    name: "presence-carries-the-loops/00 a record without buildId still puts loops last",
    async run() {
      const record = assemblePresenceRecord({ nodeId: "n1", heartbeatAt: "2026-06-30T10:00:00.000Z", activeRuns: [], sessions: [], aofVersion: "0.1.0", loops: [sampleLoopEntry()] });
      assert.deepEqual(Object.keys(record), ["nodeId", "heartbeatAt", "activeRuns", "sessions", "aofVersion", "loops"]);
    },
  },

  // ══ Scenario: activeRuns is still the frozen string array ══
  {
    name: "presence-carries-the-loops/00 activeRuns is still the frozen string array — strings only, and the loop entry's runId equals the one it lists",
    async run() {
      const fx = await makeLoopRepo();
      try {
        await seedLoopRun(fx, "03/01", "running", loopBrief({ loopRunId: "L1" }));
        const story = fx.items.find((item) => item.ref === "03/01");
        const runIds = await readActiveRuns([story]);
        const loops = await readActiveLoops([story], { workspaceId: "w1", stopRequestFor: () => null });
        assert.deepEqual(runIds, ["run-03-01"], "readActiveRuns answers the bare run id");
        assert.ok(runIds.every((id) => typeof id === "string"), "strings only — the frozen m23 shape");
        assert.equal(loops[0].runId, runIds[0], "the loop entry's runId equals the run activeRuns lists");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario Outline: both producers carry the key, and the reshape keeps it (the verb's half + the reshape;
  //    the launcher tick's half is driven in mesh-presence-aggregate-workspaces.test.mjs, the tick's own suite) ══
  {
    name: "presence-carries-the-loops/00 mesh:heartbeat carries `loops` LAST when a loop runs and no key at all when none does, and the registry reshape answers the same keys in the same order (Examples)",
    async run() {
      const rows = [
        { label: "03/01 running under L1", seed: true, keys: [...FROZEN_KEYS, "loops"] },
        { label: "none running", seed: false, keys: FROZEN_KEYS },
      ];
      for (const row of rows) {
        const fx = await makeLoopRepo();
        const home = path.join(fx.repo, "global-home");
        const env = { AOF_GLOBAL_HOME: home };
        try {
          if (row.seed) await seedLoopRun(fx, "03/01", "running", loopBrief({ loopRunId: "L1" }));
          const ctx = { workspace: await loadWorkspace(fx.repo, undefined, { env }), globalWorkStoreOptions: { env } };
          const record = await invoke("mesh:heartbeat", { now: "2026-06-30T10:00:00.000Z" }, ctx);
          assert.deepEqual(Object.keys(record), row.keys, `${row.label}: the verb's record keys`);
          const onDisk = JSON.parse(await readFile(presenceRecordPath(ctx.workspace, NODE_ID), "utf8"));
          assert.deepEqual(Object.keys(onDisk), row.keys, `${row.label}: the persisted record keys`);
          if (row.seed) {
            assert.equal(record.loops.length, 1, `${row.label}: ONE entry — the verb reads its launch workspace alone`);
            assert.deepEqual(Object.keys(record.loops[0]), LOOP_ENTRY_KEYS, `${row.label}: the eleven keys`);
            assert.equal(record.loops[0].workspaceId, "w1", `${row.label}: stamped with the workspace's pinned id`);
            assert.equal(record.loops[0].loopRunId, "L1");
          }
          // THE RESHAPE (global-node-registry.mjs): the disk record is spread into the assembler,
          // so `loops` rides through in its place — asserted through the REAL registry read.
          const store = await openGlobalWorkProjectionStore({ env });
          try {
            const presenceWorkspace = { globalMeshRoot: store.paths.meshRoot };
            await publishNodeRecord(presenceWorkspace, NODE_ID, { nodeId: NODE_ID, host: NODE_ID, os: "linux", runtimes: [], skills: [], aofVersion: "0.1.0", publishedAt: "2026-06-30T10:00:00.000Z" });
            await publishPresenceRecord(presenceWorkspace, NODE_ID, record);
            await publishGlobalRegistryDescriptorsToStore(store, ctx.workspace, { now: "2026-06-30T10:00:00.000Z" });
            const registry = await queryGlobalRegistry(store, { now: "2026-06-30T10:00:00.000Z" });
            const node = registry.nodes.find((entry) => entry.nodeId === NODE_ID);
            assert.ok(node?.presence, `${row.label}: the registry row carries the presence record`);
            assert.deepEqual(Object.keys(node.presence), row.keys, `${row.label}: the reshape answers the same keys in the same order`);
            if (row.seed) assert.deepEqual(node.presence.loops, record.loops, `${row.label}: the entries ride through unchanged`);
          } finally {
            store.close();
          }
        } finally {
          await rm(fx.repo, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ Scenario: the desktop's parser tolerates the new key ══
  {
    name: "presence-carries-the-loops/00 the desktop's parser tolerates the new key — the Presence struct carries no deny_unknown_fields, so `loops` parses and active_runs reads as before",
    async run() {
      const source = await readFile(path.join(repoRoot, "app", "desktop", "crates", "core", "src", "status.rs"), "utf8");
      const at = source.indexOf("pub struct Presence {");
      assert.ok(at > 0, "the Presence struct is where the desktop parses a presence record");
      const attributes = source.slice(source.lastIndexOf("\n\n", at), at);
      assert.doesNotMatch(attributes, /deny_unknown_fields/, "no deny_unknown_fields on Presence — an additive key is ignored, never a parse failure");
      assert.match(source.slice(at, at + 800), /pub active_runs: Vec<String>/, "…and active_runs is still the frozen bare string array");
    },
  },
];
