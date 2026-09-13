// Traceability wiring for milestone 96 / story 00 — the run record on the phase path.
//
// Covers EVERY @executable scenario in the three task features:
//   tasks/00_the-session-id-is-read-at-the-mint-or-it-is-absent.feature
//   tasks/01_the-phase-mints-at-its-top-and-closes-its-own-run.feature
//   tasks/02_an-unattributed-run-reports-what-it-cost.feature
//
// exercised against the REAL modules — `src/mesh/session.mjs`'s new live-store rung,
// the REAL `work:run-start` / `work:run-complete` through `src/command-core.mjs`, and
// the REAL `src/work/observe.mjs` — over temp fixture repos and temp session stores
// (mkdtemp → write → invoke → rm in finally). One test object per @executable
// scenario, Scenario-Outline rows folded into one entry iterating the rows, each name
// tracing to feature + scenario. node:assert/strict, `{ name, run }` shape.
//
// THE ONE SCENARIO THIS FILE DOES NOT DRIVE is 00's "the resolver has one home, and the
// pure identity ladder stays pure", which is a property of the tree rather than of a
// seam: it is FF-9601's, in test/arch/session/acd-attribution-is-captured-or-absent.test.mjs,
// beside 02's "no second path from a transcript to an item ref exists".
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { loadWorkspace, findWork } from "../../src/work.mjs";
import { pingSession, resolveSessionIdFromLiveStore, DEFAULT_SESSION_TTL_SECONDS } from "../../src/mesh/session.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { observeMilestone, projectSlug } from "../../src/work/observe.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const NODE_ID = "node-a";
const WORKSPACE_ID = "ws-1";
const T0 = "2026-09-04T10:00:00.000Z";
const at = (offsetMs) => new Date(Date.parse(T0) + offsetMs).toISOString();

// ── the fixture repo ─────────────────────────────────────────────────────────
//
// A mesh-configured workspace, because the live-store rung is keyed on
// (nodeId, workspaceId) and an install that can name neither cannot address a record.
// The session store itself is the runner's own per-test AOF_GLOBAL_HOME, resolved
// through `loadWorkspace` — never the machine's real one.
async function makeRepo({ mesh = true, status = "not-started", workspaceId = WORKSPACE_ID } = {}) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-m96-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify(
      { name: "fixture", work: { dir: "./wiki/work" }, ...(mesh ? { mesh: { nodeId: NODE_ID, workspaceId } } : {}) },
      null,
      2,
    ),
    "utf8",
  );
  const mDir = path.join(workDir, "96_milestone_the-declaration");
  const sDir = path.join(mDir, "stories", "00_story_the-run-record");
  await mkdir(sDir, { recursive: true });
  await writeFile(
    path.join(mDir, "SPEC.md"),
    `---\ntype: milestone\nnumber: 96\nslug: the-declaration\nstatus: ${status}\ntitle: "The declaration"\ncreated: 2026-09-04\nupdated: 2026-09-04\n---\n# 96 · The declaration\n`,
    "utf8",
  );
  await writeFile(
    path.join(sDir, "STORY.md"),
    `---\ntype: story\nnumber: 00\nslug: the-run-record\nparent: 96\nstatus: ${status}\ntitle: "The run record"\ncreated: 2026-09-04\nupdated: 2026-09-04\n---\n# 00 · The run record\n`,
    "utf8",
  );
  const ws = await loadWorkspace(repo);
  return { repo, workDir, mDir, sDir, ws, workspaceId };
}

// The SOLE producer writes the fixture's session records — never a hand-placed file,
// so what the rung reads is what `aof session ping` actually writes.
const live = (fx, { sessionId, nodeId = NODE_ID, workspaceId = null, now = T0 }) =>
  pingSession(fx.ws, { nodeId, workspaceId: workspaceId ?? fx.workspaceId, repo: "fixture", assistant: "claude-code", sessionId, now });

async function runsOf(workDir, ref) {
  const rows = await findWork(workDir, ref);
  const row = rows.find((r) => r.ref === ref) ?? rows[0];
  const dir = path.join(row.dir, "runs");
  // The union of flat entries and one level of node subdirs — a mesh-configured
  // install writes under `runs/<node>/` (the record->path invariant), so a reader that
  // only listed the flat level would report "no runs" for every mint in this file.
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      for (const name of await readdir(path.join(dir, entry.name))) {
        if (name.endsWith(".json")) files.push(path.join(dir, entry.name, name));
      }
    } else if (entry.name.endsWith(".json")) {
      files.push(path.join(dir, entry.name));
    }
  }
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(f, "utf8"))));
}

const statusOf = async (dir, doc) => /^status:\s*(\S+)/m.exec(await readFile(path.join(dir, doc), "utf8"))?.[1];

const refuse = async (thunk) => {
  try {
    await thunk();
  } catch (error) {
    return error;
  }
  throw new Error("expected a refusal, got success");
};

// ── transcript fixtures (the 68/03 shape, reused verbatim) ───────────────────

function agentTranscript({ out = 10, startMs = 0, endMs = 1000 } = {}) {
  return (
    [
      JSON.stringify({ type: "user", timestamp: at(startMs), message: { role: "user", content: "build" } }),
      JSON.stringify({
        type: "assistant",
        timestamp: at(endMs),
        message: { model: "claude-sonnet", content: [{ type: "text", text: "ok" }], usage: { output_tokens: out } },
      }),
    ].join("\n") + "\n"
  );
}

async function writeAgent(home, cwd, session, agentId, { agentType = "aof-developer", description = "x", text = agentTranscript() } = {}) {
  const subDir = path.join(home, ".claude", "projects", projectSlug(cwd), session, "subagents");
  await mkdir(subDir, { recursive: true });
  await writeFile(path.join(subDir, `${agentId}.meta.json`), JSON.stringify({ agentType, description }));
  await writeFile(path.join(subDir, `${agentId}.jsonl`), text);
}

function runRecord(runId, { itemRef = "96", sessionId = null } = {}) {
  return {
    runId,
    itemRef,
    state: "done",
    attempt: 1,
    outcome: "done",
    sessionId,
    brief: {},
    createdAt: at(0),
    updatedAt: at(1000),
    failureReason: null,
    heartbeatAt: null,
    retryOf: null,
    reclaimedAt: null,
    node: null,
    resumeAfter: null,
    spend: null,
  };
}

async function writeRunRecord(dir, record) {
  await mkdir(path.join(dir, "runs"), { recursive: true });
  await writeFile(path.join(dir, "runs", `${record.runId}.json`), JSON.stringify(record, null, 2), "utf8");
}

// ── the shipped phase documents ──────────────────────────────────────────────

const PHASE_DOCS = ["src/bundle/commands/refine.md", "src/bundle/commands/continue.md"];
const ROLE_AGENT = /aof-(developer|researcher|architect|qa|designer|product-owner)/;

export const runMintSessionAttributionTests = [
  // ════════════════════════════════════════════════════════════════════════════
  // 00_the-session-id-is-read-at-the-mint-or-it-is-absent.feature
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: "96/00/00 the ordinary case — one live record for this node and workspace, minutes old: the run record carries its sessionId and the envelope names the live store",
    run: async () => {
      const fx = await makeRepo();
      try {
        await live(fx, { sessionId: "sess-live", now: at(0) });
        const started = await invoke("work:run-start", { ref: "96", now: at(30_000) }, { workspace: fx.ws });
        assert.equal(started.sessionId, "sess-live", "the mint captured the live session's id");
        assert.equal(started.sessionSource, "live-store", "the envelope names the answering rung");
        const [record] = await runsOf(fx.workDir, "96");
        assert.equal(record.sessionId, "sess-live", "…and it is on the persisted record, which is what observe joins on");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/00 the flag keeps priority over the store — 48/ADR-001's order unchanged",
    run: async () => {
      const fx = await makeRepo();
      try {
        await live(fx, { sessionId: "sess-live", now: at(0) });
        const started = await invoke("work:run-start", { ref: "96", sessionId: "sess-flag", now: at(30_000) }, { workspace: fx.ws });
        assert.equal(started.sessionId, "sess-flag", "the explicit flag wins over the store");
        assert.equal(started.sessionSource, "flag", "…and the envelope says which rung answered");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/00 the store answers only when one record is strictly the newest — one answer, or none, never a choice between two",
    run: async () => {
      // Every row of the outline, driven through the REAL mint. `null` is a
      // first-class answer: an unattributable run costs one honest row in a snapshot,
      // a guessed one silently moves another item's tokens.
      const ttlMs = DEFAULT_SESSION_TTL_SECONDS * 1000;
      const rows = [
        { records: "one record inside the TTL", plant: [{ sessionId: "s1", now: at(0) }], outcome: "s1" },
        {
          records: "two records, one strictly newer by lastPingAt",
          plant: [
            { sessionId: "s1", now: at(0) },
            { sessionId: "s2", now: at(1000) },
          ],
          outcome: "s2",
        },
        {
          records: "two records with identical lastPingAt",
          plant: [
            { sessionId: "s1", now: at(0) },
            { sessionId: "s2", now: at(0) },
          ],
          outcome: null,
        },
        { records: "no records at all", plant: [], outcome: null },
        { records: "one record for a DIFFERENT workspace on this node", plant: [{ sessionId: "s1", now: at(0), workspaceId: "ws-other" }], outcome: null },
        { records: "one record for this workspace on a DIFFERENT node", plant: [{ sessionId: "s1", now: at(0), nodeId: "node-b" }], outcome: null },
        { records: "one record whose lastPingAt is older than the session TTL", plant: [{ sessionId: "s1", now: at(-ttlMs - 60_000) }], outcome: null },
      ];
      for (const [index, row] of rows.entries()) {
        // ONE WORKSPACE PER ROW. The session store is machine-global (one
        // AOF_GLOBAL_HOME serves every workspace), so two rows sharing a workspace id
        // would read each other's records and the outline would pass for the wrong
        // reason — which is precisely the ambiguity this contract is about.
        const fx = await makeRepo({ workspaceId: `ws-row-${index}` });
        try {
          for (const record of row.plant) await live(fx, record);
          const started = await invoke("work:run-start", { ref: "96", now: at(30_000) }, { workspace: fx.ws });
          const [record] = await runsOf(fx.workDir, "96");
          assert.equal(record.sessionId, row.outcome, `${row.records} → ${row.outcome ?? "null"}`);
          assert.equal(started.sessionId, row.outcome, `${row.records}: the envelope agrees with the record`);
          if (row.outcome == null) {
            assert.equal(started.sessionSource, undefined, `${row.records}: no rung answered, so none is named`);
          }
        } finally {
          await rm(fx.repo, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "96/00/00 a store fault resolves to absence and never fails the mint — the run is minted, its sessionId is null, and the fault is reported through the coded-degrade seam",
    run: async () => {
      const events = [];
      setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
      const fx = await makeRepo();
      try {
        // The sessions directory cannot be read: a FILE stands where the directory
        // belongs, so readdir answers ENOTDIR — a real fault on every platform, and
        // not the benign ENOENT of a store nothing has written yet.
        await mkdir(fx.ws.globalMeshRoot, { recursive: true });
        await writeFile(path.join(fx.ws.globalMeshRoot, "sessions"), "not a directory", "utf8");

        const started = await invoke("work:run-start", { ref: "96", now: at(30_000) }, { workspace: fx.ws });
        assert.equal(started.state, "running", "the run is minted — a store fault never fails the mint");
        assert.equal(started.sessionId, null, "…with no id, which is the honest answer");
        assert.ok(
          events.some((event) => event.code === "mesh-session-read"),
          `the fault is reported through the coded-degrade seam (saw ${JSON.stringify(events.map((e) => e.code))})`,
        );
      } finally {
        setDegradeSinkForTest(undefined);
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/00 a run minted with no id is reported as unattributable rather than rendered as attributed",
    run: async () => {
      const fx = await makeRepo();
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-m96-home-"));
      try {
        const started = await invoke("work:run-start", { ref: "96", now: at(30_000) }, { workspace: fx.ws });
        assert.equal(started.sessionSource, undefined, "the envelope names no answering rung");
        // A transcript exists for a session that no run record names.
        await writeAgent(home, fx.repo, "sess-orphan", "agent-1");
        const observed = await observeMilestone({ cwd: fx.repo, ref: "96", home, env: {}, generatedAt: Date.parse(T0) });
        assert.equal(observed.json.runs.count, 1, "observe counts that run's item among its items");
        assert.equal(observed.agents.length, 0, "…and attributes no agent session to it");
        assert.equal(observed.json.summary.unattributedAgentRuns, 1, "the session that matched nothing is reported, never guessed into the item");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/00 the run record's field set does not grow — a live-store mint and a flag mint persist the same field names, and neither names the answering rung",
    run: async () => {
      const fx = await makeRepo();
      try {
        await live(fx, { sessionId: "sess-live", now: at(0) });
        await invoke("work:run-start", { ref: "96", now: at(30_000) }, { workspace: fx.ws });
        await invoke("work:run-start", { ref: "96/00", sessionId: "sess-flag", now: at(31_000) }, { workspace: fx.ws });
        const [fromStore] = await runsOf(fx.workDir, "96");
        const [fromFlag] = await runsOf(fx.workDir, "96/00");
        assert.equal(fromStore.sessionId, "sess-live");
        assert.equal(fromFlag.sessionId, "sess-flag");
        assert.deepEqual(Object.keys(fromStore).sort(), Object.keys(fromFlag).sort(), "the two records carry the same field names");
        for (const record of [fromStore, fromFlag]) {
          assert.equal(record.sessionSource, undefined, "neither carries a field naming which rung answered");
          assert.ok(
            !Object.keys(record).some((key) => /source|rung/i.test(key)),
            `no attribution-vocabulary field reached the record (${Object.keys(record).join(",")})`,
          );
        }
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 01_the-phase-mints-at-its-top-and-closes-its-own-run.feature
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: "96/00/01 the phase mints before it spawns anything — a run record exists for the item, carrying its ref and the session id resolved at the mint",
    run: async () => {
      const fx = await makeRepo();
      try {
        assert.deepEqual(await runsOf(fx.workDir, "96/00"), [], "the item starts with no runs");
        await live(fx, { sessionId: "sess-phase", now: at(0) });
        // The mint is the phase's first act; nothing has been spawned when it returns.
        await invoke("work:run-start", { ref: "96/00", now: at(30_000) }, { workspace: fx.ws });
        const [record] = await runsOf(fx.workDir, "96/00");
        assert.ok(record != null, "a run record exists for that item before the first agent is spawned");
        assert.equal(record.itemRef, "96/00", "it carries that item's ref");
        assert.equal(record.sessionId, "sess-phase", "it carries the session id resolved at the mint");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/01 the phase closes its own run — the run is completed and the item has no non-terminal run",
    run: async () => {
      const fx = await makeRepo();
      try {
        const started = await invoke("work:run-start", { ref: "96/00", now: at(0) }, { workspace: fx.ws });
        await invoke("work:run-complete", { ref: "96/00", outcome: "done", now: at(60_000) }, { workspace: fx.ws });
        const records = await runsOf(fx.workDir, "96/00");
        assert.equal(records.length, 1);
        assert.equal(records[0].runId, started.runId, "the run the phase minted is the run it closed");
        assert.equal(records[0].state, "done", "that run is completed");
        assert.equal(records.filter((r) => r.state === "running").length, 0, "the item has no non-terminal run");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/01 the mint moves a starting item through the existing reactor, and moves nothing else — the reactor's own table, unchanged",
    run: async () => {
      const rows = [
        { status: "not-started", after: "in-progress" },
        { status: "in-progress", after: "in-progress" },
        // The reactor's edge is bounded to `not-started|blocked`, so a mint on a blocked item
        // starts it. The contract's Examples row said `blocked` and was amended to match the
        // reactor it declares unchanged (2026-09-04, operator's call): `src/effects/table.mjs` is
        // in this story's `reads:` and not its `files:`, which is what settled which of the two
        // was the error.
        { status: "blocked", after: "in-progress" },
        { status: "in-review", after: "in-review" },
      ];
      for (const row of rows) {
        const fx = await makeRepo({ status: row.status });
        try {
          await invoke("work:run-start", { ref: "96/00", now: at(0) }, { workspace: fx.ws });
          assert.equal(await statusOf(fx.sDir, "STORY.md"), row.after, `${row.status} → ${row.after}`);
          // The phase performs no second status write of its own: the reactor is the
          // only writer here, so the record doc carries exactly one status line and it
          // is the one the reactor left.
          const text = await readFile(path.join(fx.sDir, "STORY.md"), "utf8");
          assert.equal((text.match(/^status:/gm) ?? []).length, 1, "one status line, one writer");
        } finally {
          await rm(fx.repo, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "96/00/01 a second phase on the same item mints after the first has closed — both runs are readable under that item",
    run: async () => {
      const fx = await makeRepo();
      try {
        const first = await invoke("work:run-start", { ref: "96/00", now: at(0) }, { workspace: fx.ws });
        await invoke("work:run-complete", { ref: "96/00", outcome: "done", now: at(60_000) }, { workspace: fx.ws });
        const second = await invoke("work:run-start", { ref: "96/00", now: at(120_000) }, { workspace: fx.ws });
        assert.notEqual(second.runId, first.runId, "the mint succeeds");
        const ids = (await runsOf(fx.workDir, "96/00")).map((r) => r.runId).sort();
        assert.deepEqual(ids, [first.runId, second.runId].sort(), "both runs are readable under that item");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/01 a phase still in flight refuses a rival mint — duplicate-run, and no second record is written",
    run: async () => {
      const fx = await makeRepo();
      try {
        await invoke("work:run-start", { ref: "96/00", now: at(0) }, { workspace: fx.ws });
        const error = await refuse(() => invoke("work:run-start", { ref: "96/00", now: at(1000) }, { workspace: fx.ws }));
        assert.equal(error.code, "duplicate-run", "the second mint is refused, coded");
        assert.equal((await runsOf(fx.workDir, "96/00")).length, 1, "no second record is written");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/01 a crashed phase is reclaimed by the next mint, not left as a wall — the stale run is reclaimed, the new run is minted, and the reclaim is reported in the envelope",
    run: async () => {
      const fx = await makeRepo();
      try {
        const stale = await invoke("work:run-start", { ref: "96/00", now: at(0) }, { workspace: fx.ws });
        // Far past any configured staleness window — the phase died and never completed.
        const started = await invoke("work:run-start", { ref: "96/00", now: at(72 * 60 * 60 * 1000) }, { workspace: fx.ws });
        const records = await runsOf(fx.workDir, "96/00");
        const reclaimed = records.find((r) => r.runId === stale.runId);
        assert.equal(reclaimed.state, "failed", "the stale run is reclaimed");
        assert.equal(reclaimed.failureReason, "runtime_offline");
        assert.ok(reclaimed.reclaimedAt != null, "…and stamped as reclaimed rather than silently rewritten");
        assert.ok(records.some((r) => r.runId === started.runId && r.state === "running"), "the new run is minted");
        assert.ok(
          Array.isArray(started.effects) || started.retryOf != null || started.attempt >= 1,
          "the reclaim rides the command envelope rather than being performed silently",
        );
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/01 the hot hook is not armed from the phase path — no heartbeat entry is written, and no module in this story writes a file naming the live run",
    run: async () => {
      const fx = await makeRepo();
      try {
        await invoke("work:run-start", { ref: "96/00", now: at(0) }, { workspace: fx.ws });
        // The hook, run exactly as PostToolUse runs it, in an operator session: both
        // env keys unset. It arms from the environment and nothing else.
        const hook = path.join(repoRoot, ".claude", "hooks", "aof", "run-heartbeat-enqueue.mjs");
        const env = { ...process.env };
        delete env.AOF_RUN_ID;
        delete env.AOF_RUN_ITEM_DIR;
        await execFileAsync(process.execPath, [hook], { env, cwd: fx.repo });
        let entries = [];
        try {
          entries = await readdir(path.join(fx.sDir, "runs"));
        } catch {
          entries = [];
        }
        assert.ok(!entries.includes(".heartbeats.ndjson"), `no heartbeat entry is written (saw ${entries.join(",")})`);
        // …and nothing in the story's module set leaves a pointer the hook could read
        // instead: a pointer file would make the one component that must never block a
        // tool call a second authority for which run is live (ADR-002 §3).
        for (const file of ["src/mesh/session.mjs", "src/commands/run-start.mjs", "src/work/observe.mjs"]) {
          const source = await readFile(path.join(repoRoot, file), "utf8");
          assert.ok(!/AOF_RUN_ID|AOF_RUN_ITEM_DIR|\.heartbeats\.ndjson/.test(source), `${file} names no live-run pointer for that hook to read`);
        }
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/01 both phase documents carry the mint and the close, and neither still instructs a hand-written status move the reactor now performs",
    run: async () => {
      for (const rel of PHASE_DOCS) {
        const text = await readFile(path.join(repoRoot, rel), "utf8");
        const mint = text.indexOf("run-start");
        assert.ok(mint >= 0, `${rel} names the mint`);
        const firstAgent = text.search(ROLE_AGENT);
        assert.ok(firstAgent >= 0, `${rel} names at least one spawned role agent`);
        assert.ok(mint < firstAgent, `${rel} names the mint BEFORE its first spawned agent`);
        assert.ok(text.includes("run-complete"), `${rel} names the completion at its close`);
        // The instruction this mint replaced, in the exact form both documents wrote it.
        assert.ok(!text.includes("in-progress --if-applicable"), `${rel} no longer instructs the hand-written starting status move`);
        assert.ok(!text.includes("Mark it started"), `${rel} carries no "mark it started" step beside the mint`);
        assert.ok(!text.includes("Move the refined item to `in-progress`"), `${rel} carries no hand-written refine-time start`);
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 02_an-unattributed-run-reports-what-it-cost.feature
  // ════════════════════════════════════════════════════════════════════════════
  {
    name: "96/00/02 a milestone whose phases minted runs reports non-zero spend — runs.count, totalOutputTokens and activeUnionMs are all above zero",
    run: async () => {
      const fx = await makeRepo();
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-m96-home-"));
      try {
        // The refine phase's run and the continue phase's run, each carrying its id.
        await writeRunRecord(fx.mDir, runRecord("r-refine", { sessionId: "sess-refine" }));
        await writeRunRecord(fx.mDir, runRecord("r-continue", { sessionId: "sess-continue" }));
        await writeAgent(home, fx.repo, "sess-refine", "agent-1", { text: agentTranscript({ out: 25 }) });
        await writeAgent(home, fx.repo, "sess-continue", "agent-2", { text: agentTranscript({ out: 40, startMs: 2000, endMs: 4000 }) });

        const observed = await observeMilestone({ cwd: fx.repo, ref: "96", home, env: {}, generatedAt: Date.parse(T0) });
        assert.ok(observed.json.runs.count > 0, `runs.count is greater than zero (got ${observed.json.runs.count})`);
        assert.ok(observed.json.summary.totalOutputTokens > 0, `totalOutputTokens is greater than zero (got ${observed.json.summary.totalOutputTokens})`);
        assert.ok(observed.json.summary.activeUnionMs > 0, `activeUnionMs is greater than zero (got ${observed.json.summary.activeUnionMs})`);
        assert.equal(observed.json.summary.unattributedAgentRuns, 0, "…and nothing is unattributed, because both phases minted");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/02 an unattributed run keeps its count and gains a body — listed with its session, its active window and its spend, marked unattributed",
    run: async () => {
      const fx = await makeRepo();
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-m96-home-"));
      try {
        await writeAgent(home, fx.repo, "sess-orphan", "agent-1", { agentType: "aof-qa", text: agentTranscript({ out: 33 }) });
        const observed = await observeMilestone({ cwd: fx.repo, ref: "96", home, env: {}, generatedAt: Date.parse(T0) });
        assert.equal(observed.json.summary.unattributedAgentRuns, 1, "that run is counted among the unattributed");
        const [row] = observed.json.unattributedAgents;
        assert.ok(row != null, "…and it is listed, not merely counted");
        assert.equal(row.sessionId, "sess-orphan", "listed with its session");
        assert.equal(row.firstTs, Date.parse(at(0)), "…its active window: start");
        assert.equal(row.lastTs, Date.parse(at(1000)), "…and end");
        assert.equal(row.activeMs, 1000, "…and the active time inside it");
        assert.equal(row.outputTokens, 33, "…and its spend");
        assert.equal(row.attributedTo, null, "it is marked unattributed rather than attributed to any item");
        assert.match(observed.report, /## Unattributed agent runs/, "the rendered report carries the body too");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/02 the count and the body agree — the number of listed unattributed runs equals the reported count",
    run: async () => {
      const fx = await makeRepo();
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-m96-home-"));
      try {
        await writeAgent(home, fx.repo, "sess-a", "agent-1");
        await writeAgent(home, fx.repo, "sess-a", "agent-2");
        await writeAgent(home, fx.repo, "sess-b", "agent-3");
        // …and one whose transcript will not read: a row that is counted must still be
        // listed, or the count and the body disagree at exactly the awkward moment.
        const subDir = path.join(home, ".claude", "projects", projectSlug(fx.repo), "sess-b", "subagents");
        await writeFile(path.join(subDir, "agent-4.meta.json"), JSON.stringify({ agentType: "aof-architect", description: "torn" }));

        const observed = await observeMilestone({ cwd: fx.repo, ref: "96", home, env: {}, generatedAt: Date.parse(T0) });
        assert.equal(observed.json.summary.unattributedAgentRuns, 4, "all four are counted");
        assert.equal(observed.json.unattributedAgents.length, observed.json.summary.unattributedAgentRuns, "the listed rows equal the reported count");
        const torn = observed.json.unattributedAgents.find((row) => row.id === "4");
        assert.ok(torn != null, "the unreadable transcript is listed rather than dropped");
        assert.equal(torn.activeMs, null, "…with its spend honestly absent rather than zero");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "96/00/02 the join is on the session id and on nothing else — one join, and four near-misses that must not become one",
    run: async () => {
      const rows = [
        { relation: "a run record for that item carrying that session id", session: "96-sess", record: { sessionId: "96-sess" }, attributed: true },
        { relation: "the item's ref appearing in the session directory name", session: "96", record: null, attributed: false },
        { relation: "the item's ref appearing in the agent's prose", session: "sess-prose", record: null, attributed: false, description: "milestone 96" },
        { relation: "a session id sharing a hex prefix with another item's", session: "deadbeef-96", record: { sessionId: "deadbeef-11" }, attributed: false },
        { relation: "a run record for that item carrying a null session id", session: "sess-null", record: { sessionId: null }, attributed: false },
      ];
      for (const row of rows) {
        const fx = await makeRepo();
        const home = await mkdtemp(path.join(os.tmpdir(), "aof-m96-home-"));
        try {
          if (row.record) await writeRunRecord(fx.mDir, runRecord("r1", row.record));
          await writeAgent(home, fx.repo, row.session, "agent-1", {
            description: row.description ?? "x",
            text: agentTranscript(),
          });
          const observed = await observeMilestone({ cwd: fx.repo, ref: "96", home, env: {}, generatedAt: Date.parse(T0) });
          if (row.attributed) {
            assert.equal(observed.agents.length, 1, `${row.relation} → attributed to that item`);
            assert.equal(observed.agents[0].attributedTo, "96");
            assert.equal(observed.json.summary.unattributedAgentRuns, 0);
          } else {
            assert.equal(observed.agents.length, 0, `${row.relation} → unattributed`);
            assert.equal(observed.json.summary.unattributedAgentRuns, 1, `${row.relation} → counted as unattributed, never guessed into the item`);
          }
        } finally {
          await rm(fx.repo, { recursive: true, force: true });
          await rm(home, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "96/00/02 the totals agree with the independent miner — observe and the committed .aof/mine-transcripts.mjs report the same output tokens and active time over the same window",
    run: async () => {
      const fx = await makeRepo();
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-m96-home-"));
      const out = path.join(home, "mine.json");
      try {
        await writeRunRecord(fx.mDir, runRecord("r-refine", { sessionId: "sess-refine" }));
        // TWO usage-bearing turns: the miner times spend-bearing entries only, so a
        // single-turn transcript gives it a zero-width window and there is nothing for
        // the two to agree ABOUT. Both read the same two stamps here.
        const text =
          [
            JSON.stringify({ type: "assistant", timestamp: at(0), message: { model: "claude-sonnet", content: [{ type: "text", text: "a" }], usage: { output_tokens: 30 } } }),
            JSON.stringify({ type: "assistant", timestamp: at(5000), message: { model: "claude-sonnet", content: [{ type: "text", text: "b" }], usage: { output_tokens: 47 } } }),
          ].join("\n") + "\n";
        await writeAgent(home, fx.repo, "sess-refine", "agent-1", { text });

        const observed = await observeMilestone({ cwd: fx.repo, ref: "96", home, env: {}, generatedAt: Date.parse(T0) });
        const projects = path.join(home, ".claude", "projects");
        await execFileAsync(process.execPath, [path.join(repoRoot, ".aof", "mine-transcripts.mjs"), "--projects", projects, "--out", out], { cwd: repoRoot });
        const mined = JSON.parse(await readFile(out, "utf8"));

        assert.equal(mined.subagents.output, observed.json.summary.totalOutputTokens, "the two agree on output tokens");
        assert.equal(mined.activeMs, observed.json.summary.activeUnionMs, "…and on active time");
        assert.equal(mined.agentRuns, observed.json.summary.agentCount, "…over the same agent runs");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },

  // The rung itself, driven directly — the outline above proves it through the mint;
  // this proves the two guards a mint cannot reach, because a run-start on an
  // unconfigured install never asks the store at all.
  {
    name: "96/00/00 the rung answers null when it cannot address a record — no node id and no workspace id are each absence, never a store-wide guess",
    run: async () => {
      const fx = await makeRepo();
      try {
        await live(fx, { sessionId: "sess-live", now: at(0) });
        assert.equal(await resolveSessionIdFromLiveStore(fx.ws, { workspaceId: WORKSPACE_ID, now: at(0) }), null, "no node id → null");
        assert.equal(await resolveSessionIdFromLiveStore(fx.ws, { nodeId: NODE_ID, now: at(0) }), null, "no workspace id → null");
        assert.equal(await resolveSessionIdFromLiveStore(fx.ws, { nodeId: NODE_ID, workspaceId: WORKSPACE_ID, now: at(0) }), "sess-live", "…and the addressable case still answers");
      } finally {
        await rm(fx.repo, { recursive: true, force: true });
      }
    },
  },
];
