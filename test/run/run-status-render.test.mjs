// Traceability: milestone 126 / story 01, tasks 00 and 01 (ADR-003 §1-§2, AMENDED). The DRIVEN
// half — what the render actually prints for a record, and the two time figures it derives from an
// injected `now`. The structural half is `test/arch/run/acd-run-status-renders-the-record.test.mjs`.
//
// The render is a pure function of what it is handed, so every case here calls
// `runStatusCommand.cli.render(result, faceCtx)` over a literal result of the shape `run()` returns
// — the `cli.render(result, {})` idiom — with ONE case taken from a real `invoke("work:run-status")`
// through `src/command-core.mjs`, so the literals below are not a private shape.
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { runStatusCommand } from "../../src/commands/run-status.mjs";
import { attemptElapsedMs } from "../../src/work/loop.mjs";
import { startRun } from "../../src/run-store.mjs";
import { invoke } from "../../src/command-core.mjs";

const DAY = "2026-09-08T";
const at = (clock) => (clock === "absent" || clock == null ? null : (clock.includes("-") ? clock : `${DAY}${clock}`));

/** A full sixteen-key record, with the keys a case cares about overridden. */
function record(overrides = {}) {
  return {
    runId: "run-1",
    itemRef: "03/01",
    state: "running",
    attempt: 1,
    outcome: null,
    sessionId: null,
    brief: {},
    createdAt: `${DAY}10:00:00.000Z`,
    updatedAt: `${DAY}10:00:00.000Z`,
    failureReason: null,
    heartbeatAt: null,
    retryOf: null,
    reclaimedAt: null,
    node: null,
    resumeAfter: null,
    spend: null,
    ...overrides,
  };
}

const render = (runs, { now, ...extra } = {}) => runStatusCommand.cli.render(
  { ref: "03/01", runs, answeredFrom: "disk", ...extra },
  now === undefined ? {} : { now },
);

const line = (runs, opts) => render(runs, opts).split("\n")[1];
const heading = (runs, opts) => render(runs, opts).split("\n")[0];

/** No `undefined`, `null` or `NaN` may ever reach the output. */
function assertClean(output, label) {
  for (const poison of ["undefined", "null", "NaN", "Invalid Date"]) {
    assert.ok(!output.includes(poison), `${label}: output carries \`${poison}\` — ${output}`);
  }
}

export const runStatusRenderTests = [
  {
    name: "126/01 task00 — the loop envelope is READ: what the record holds is named, what it does not hold is not invented",
    run() {
      const rows = [
        [{ phase: "continue", cycle: 2, cap: 3, level: "L2" }, ["continue", "2/3", "L2"], []],
        [{ phase: "verify", cycle: 3, cap: 3 }, ["verify", "3/3"], ["L1", "L2", "L3"]],
        [{ phase: "refine", level: "L1" }, ["refine", "L1"], ["/"]],
        [{ cycle: 1, cap: 1, level: "L3" }, ["1/1", "L3"], ["continue", "verify", "refine"]],
        [{ phase: "wibble", cycle: 2, cap: 3, level: "L2" }, ["wibble", "2/3", "L2"], []],
        [{}, [], ["continue", "verify", "/", "L1", "L2", "L3"]],
        [null, [], ["continue", "verify", "/", "L1", "L2", "L3"]],
      ];
      for (const [loop, shown, absent] of rows) {
        const label = JSON.stringify(loop);
        const out = line([record({ brief: loop === null ? { loop: null } : { loop } })], { now: `${DAY}12:00:00.000Z` });
        for (const token of shown) assert.ok(out.includes(token), `${label}: shows ${token} — ${out}`);
        for (const token of absent) assert.ok(!out.includes(token), `${label}: does not show ${token} — ${out}`);
        assertClean(out, label);
      }
    },
  },
  {
    name: "126/01 task00 — the lineage and attribution facts are named, and a null is a silence",
    run() {
      const rows = [
        [1, "sess-a1", "umamis-msi", ["attempt 1", "session sess-a1", "node umamis-msi"], []],
        [2, "sess-a2", "aof-wsl", ["attempt 2", "session sess-a2", "node aof-wsl"], []],
        [3, null, "aof-wsl", ["attempt 3", "node aof-wsl"], ["session"]],
        [1, "sess-c1", null, ["attempt 1", "session sess-c1"], ["node"]],
        [1, null, null, ["attempt 1"], ["session", "node"]],
      ];
      for (const [attempt, sessionId, node, shown, absent] of rows) {
        const label = `attempt=${attempt} session=${sessionId} node=${node}`;
        const out = line([record({ attempt, sessionId, node })], { now: `${DAY}12:00:00.000Z` });
        for (const token of shown) assert.ok(out.includes(token), `${label}: shows ${token} — ${out}`);
        for (const token of absent) assert.ok(!out.includes(token), `${label}: does not show ${token} — ${out}`);
        assertClean(out, label);
      }
    },
  },
  {
    name: "126/01 task00 — a state is rendered with the reason and the stamps that go with it, and with nothing else",
    run() {
      const rows = [
        ["running", null, null, null, ["running"], ["reclaimed", "resumes after"]],
        ["done", null, null, null, ["done"], ["reclaimed", "resumes after"]],
        ["cancelled", null, null, null, ["cancelled"], ["reclaimed", "resumes after"]],
        ["queued", null, null, null, ["queued"], ["reclaimed", "resumes after"]],
        ["failed", "runtime_offline", `${DAY}11:00:00.000Z`, null, ["failed", "runtime_offline", "reclaimed"], ["resumes after"]],
        ["failed", "timeout", null, null, ["failed", "timeout"], ["reclaimed", "resumes after"]],
        ["failed", "session_limit", null, `${DAY}20:10:00.000Z`, ["failed", "session_limit", `resumes after ${DAY}20:10:00.000Z`], ["reclaimed"]],
        ["failed", "agent_error", null, null, ["failed", "agent_error"], ["reclaimed", "resumes after"]],
        ["failed", null, null, null, ["failed"], ["reclaimed", "resumes after", "timeout", "agent_error"]],
      ];
      for (const [state, failureReason, reclaimedAt, resumeAfter, shown, absent] of rows) {
        const label = `${state}/${failureReason}`;
        const out = line([record({ state, failureReason, reclaimedAt, resumeAfter })], { now: `${DAY}12:00:00.000Z` });
        for (const token of shown) assert.ok(out.includes(token), `${label}: shows ${token} — ${out}`);
        for (const token of absent) assert.ok(!out.includes(token), `${label}: does not show ${token} — ${out}`);
        assertClean(out, label);
      }
    },
  },
  {
    name: "126/01 task00 — the heading says which source answered the RUNS",
    run() {
      const runs = [record()];
      const now = `${DAY}12:00:00.000Z`;

      const disk = heading(runs, { now });
      assert.equal(disk, "03/01 — 1 run(s):", "a disk-read history carries no worker marker");

      const worker = heading(runs, { now, fromWorker: true, answeredFrom: "cache", reportedBy: "aof-wsl" });
      assert.equal(worker, "03/01 — 1 run(s) (worker mirror, reported by aof-wsl):");

      const anonymous = heading(runs, { now, fromWorker: true, answeredFrom: "cache", reportedBy: null });
      assert.equal(anonymous, "03/01 — 1 run(s) (worker mirror):", "no node name is invented");
      assertClean(anonymous, "anonymous mirror");

      // `answeredFrom: cache` with no `fromWorker` — the runs came from THIS checkout for a ref
      // the cache resolved. `fromWorker` is the marker, not `answeredFrom`.
      const cacheResolved = heading(runs, { now, answeredFrom: "cache" });
      assert.equal(cacheResolved, "03/01 — 1 run(s):", "a cache-RESOLVED ref with disk runs is not a mirror");
    },
  },
  {
    name: "126/01 task00 — a worker-streamed record is rendered from what it actually carries",
    run() {
      // Exactly the four keys the projection's own writer stores.
      const streamed = { runId: "w-1", itemRef: "03/01", state: "running", node: "aof-wsl" };
      const out = line([streamed], { now: `${DAY}12:00:00.000Z`, fromWorker: true, answeredFrom: "cache", reportedBy: "aof-wsl" });
      assert.ok(out.includes("w-1") && out.includes("running") && out.includes("node aof-wsl"));
      for (const absent of ["attempt", "session", "continue", "verify", "L1", "L2", "L3", "elapsed", "last beat"]) {
        assert.ok(!out.includes(absent), `a four-key record shows no ${absent} — ${out}`);
      }
      assertClean(out, "streamed record");
    },
  },
  {
    name: "126/01 task00 — every run is on its own line, in the order the result holds them, and no line borrows another's fact",
    run() {
      const runs = [
        record({ runId: "r-1", state: "done", attempt: 1 }),
        record({ runId: "r-2", state: "failed", attempt: 2, failureReason: "timeout" }),
        record({ runId: "r-3", state: "running", attempt: 3 }),
      ];
      const out = render(runs, { now: `${DAY}12:00:00.000Z` });
      const lines = out.split("\n").slice(1);
      assert.equal(lines.length, 3);
      assert.ok(lines[0].includes("r-1") && lines[0].includes("done") && !lines[0].includes("timeout"));
      assert.ok(lines[1].includes("r-2") && lines[1].includes("failed") && lines[1].includes("timeout"));
      assert.ok(lines[2].includes("r-3") && lines[2].includes("running") && !lines[2].includes("timeout"));
      assertClean(out, "three runs");
    },
  },
  {
    name: "126/01 task00 — the empty-history line is unchanged, whoever answered",
    run() {
      const shapes = [
        { answeredFrom: "disk" },
        { answeredFrom: "cache", fromWorker: true, reportedBy: "aof-wsl" },
        { answeredFrom: "cache", fromWorker: true },
      ];
      for (const extra of shapes) {
        const out = render([], { now: `${DAY}12:00:00.000Z`, ...extra });
        assert.equal(out, "03/01 — no runs.", `${JSON.stringify(extra)}: the one sentence a script greps for`);
      }
    },
  },
  {
    name: "126/01 task01 — the three attempt shapes over concrete instants, and every figure is the engine's own number",
    run() {
      const rows = [
        ["reclaimed (124/00 attempt 1)", "failed", "2026-09-07T23:32:33.272Z", "00:02:19.028Z", "11:02:13.985Z", "11:02:13.985Z", "12:00:00.000Z", 1_785_756, null],
        ["reclaimed, never beat", "failed", "10:00:00.000Z", null, "11:00:00.000Z", "11:00:00.000Z", "12:00:00.000Z", 3_600_000, null],
        ["settled done, beat mid-run", "done", "10:00:00.000Z", "10:12:00.000Z", "10:18:00.000Z", null, "12:00:00.000Z", 1_080_000, null],
        ["settled failed, not reclaimed", "failed", "10:00:00.000Z", "10:20:00.000Z", "10:30:00.000Z", null, "12:00:00.000Z", 1_800_000, null],
        ["settled cancelled", "cancelled", "10:00:00.000Z", null, "10:03:00.000Z", null, "12:00:00.000Z", 180_000, null],
        ["queued — a state no verb mints", "queued", "10:00:00.000Z", null, "10:00:00.000Z", null, "10:25:00.000Z", null, null],
        ["running, beating", "running", "10:00:00.000Z", "10:10:00.000Z", "10:10:00.000Z", null, "10:25:00.000Z", 1_500_000, 900_000],
        ["running, beating, later now", "running", "10:00:00.000Z", "10:10:00.000Z", "10:10:00.000Z", null, "10:40:00.000Z", 2_400_000, 1_800_000],
        ["running, never beat", "running", "10:00:00.000Z", null, "10:00:00.000Z", null, "10:25:00.000Z", 1_500_000, 1_500_000],
        ["running, never beat, updated later", "running", "10:00:00.000Z", null, "10:05:00.000Z", null, "10:25:00.000Z", 1_500_000, 1_200_000],
        ["running, now at its creation", "running", "10:00:00.000Z", null, "10:00:00.000Z", null, "10:00:00.000Z", 0, 0],
        ["a streamed record with no createdAt", "running", "absent", null, "absent", null, "12:00:00.000Z", null, null],
      ];
      for (const [label, state, createdAt, heartbeatAt, updatedAt, reclaimedAt, now, elapsed, lastBeat] of rows) {
        const run = record({
          state,
          createdAt: at(createdAt),
          heartbeatAt: at(heartbeatAt),
          updatedAt: at(updatedAt),
          reclaimedAt: at(reclaimedAt),
        });
        if (createdAt === "absent") delete run.createdAt;
        if (updatedAt === "absent") delete run.updatedAt;
        const out = line([run], { now: at(now) });

        if (elapsed == null) {
          assert.ok(!out.includes("elapsed"), `${label}: no elapsed at all — ${out}`);
        } else {
          assert.ok(out.includes(`elapsed ${elapsed}ms`), `${label}: elapsed ${elapsed}ms — ${out}`);
          // ARITHMETIC: the value is exactly what the engine returns, with no clamp or rounding.
          assert.equal(attemptElapsedMs({ record: run, now: at(now) }), elapsed, `${label}: engine agreement`);
        }
        if (lastBeat == null) {
          assert.ok(!out.includes("last beat"), `${label}: no heartbeat age at all — ${out}`);
        } else {
          assert.ok(out.includes(`last beat ${lastBeat}ms`), `${label}: last beat ${lastBeat}ms — ${out}`);
        }
        assertClean(out, label);
      }
    },
  },
  {
    name: "126/01 task01 — a zero duration is a duration",
    run() {
      const run = record({ state: "running", createdAt: `${DAY}10:00:00.000Z`, updatedAt: `${DAY}10:00:00.000Z` });
      const out = line([run], { now: `${DAY}10:00:00.000Z` });
      assert.ok(out.includes("elapsed 0ms"), out);
      assert.ok(out.includes("last beat 0ms"), out);
      assertClean(out, "zero duration");
    },
  },
  {
    name: "126/01 task01 — the eleven-hour reading is the one the render must never produce",
    run() {
      const measured = record({
        state: "failed",
        createdAt: "2026-09-07T23:32:33.272Z",
        heartbeatAt: "2026-09-08T00:02:19.028Z",
        updatedAt: "2026-09-08T11:02:13.985Z",
        reclaimedAt: "2026-09-08T11:02:13.985Z",
        failureReason: "runtime_offline",
      });
      for (const now of ["2026-09-08T11:02:14.000Z", "2026-09-08T12:00:00.000Z", "2026-09-10T00:00:00.000Z"]) {
        const out = line([measured], { now });
        assert.ok(out.includes("elapsed 1785756ms"), `${now}: under 30 minutes — ${out}`);
        assert.ok(!out.includes("41380713"), `${now}: the wall-clock span is nowhere on the line — ${out}`);
        // …nor in any human form printed beside it.
        assert.ok(!/\b11h\b/u.test(out), `${now}: no eleven-hour human form — ${out}`);
        assert.ok(/29m 45s/u.test(out), `${now}: the human form is the honest one — ${out}`);
      }
    },
  },
  {
    name: "126/01 task01 — the arithmetic has one home: a settled elapsed is fixed for every `now`, a running one moves",
    run() {
      const settled = record({ state: "done", createdAt: `${DAY}10:00:00.000Z`, updatedAt: `${DAY}10:18:00.000Z` });
      const running = record({ state: "running", createdAt: `${DAY}10:00:00.000Z`, updatedAt: `${DAY}10:00:00.000Z` });
      const first = line([settled], { now: `${DAY}11:00:00.000Z` });
      const later = line([settled], { now: `${DAY}23:00:00.000Z` });
      assert.equal(first, later, "a settled run's elapsed does not move with the clock");

      const early = line([running], { now: `${DAY}10:10:00.000Z` });
      const late = line([running], { now: `${DAY}10:20:00.000Z` });
      assert.notEqual(early, late, "a running run's does");
      assert.ok(early.includes("elapsed 600000ms") && late.includes("elapsed 1200000ms"));
    },
  },
  {
    name: "126/01 task01 — no `now` is a missing figure, never a broken line",
    run() {
      const run = record({
        state: "running",
        createdAt: `${DAY}10:00:00.000Z`,
        heartbeatAt: `${DAY}10:10:00.000Z`,
        updatedAt: `${DAY}10:10:00.000Z`,
        brief: { loop: { loopRunId: "l", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: `${DAY}10:00:00.000Z`, id: "id" } },
      });
      const withoutNow = runStatusCommand.cli.render({ ref: "03/01", runs: [run], answeredFrom: "disk" }, {});
      const withNoCtx = runStatusCommand.cli.render({ ref: "03/01", runs: [run], answeredFrom: "disk" });
      for (const [label, out] of [["empty faceCtx", withoutNow], ["no faceCtx at all", withNoCtx]]) {
        assert.ok(out.includes(run.runId) && out.includes("running"), `${label}: the line is still a line — ${out}`);
        assert.ok(out.includes("continue") && out.includes("2/3"), `${label}: the record's own facts survive — ${out}`);
        assert.ok(!out.includes("elapsed") && !out.includes("last beat"), `${label}: the figures are absent, not invented — ${out}`);
        assertClean(out, label);
      }
    },
  },
  {
    name: "126/01 task00 — the literals above are not a private shape: a real invoke renders the same way",
    async run() {
      const projectRoot = await mkdtemp(path.join(tmpdir(), "aof-run-status-render-"));
      try {
        const storyDir = path.join(projectRoot, "wiki", "work", "03_milestone_fixture", "stories", "01_story_ready");
        await mkdir(storyDir, { recursive: true });
        await writeFile(path.join(storyDir, "STORY.md"), `---
type: story
number: 1
slug: ready
title: Ready
parent: 3
status: in-progress
depends: []
created: 2026-09-08
updated: 2026-09-08
schema: 1
aofVersion: 0.1.0
---
# Ready
`);
        await mkdir(path.join(projectRoot, "wiki", "work", "03_milestone_fixture"), { recursive: true });
        await writeFile(path.join(projectRoot, "wiki", "work", "03_milestone_fixture", "SPEC.md"), `---
type: milestone
number: 3
slug: fixture
title: Fixture
status: in-progress
depends: []
created: 2026-09-08
updated: 2026-09-08
schema: 1
aofVersion: 0.1.0
---
# Fixture
`);
        const workspace = {
          projectRoot,
          workDir: path.join(projectRoot, "wiki", "work"),
          configPath: path.join(projectRoot, ".aof", "aof.config.json"),
          config: { work: { dir: "wiki/work" } },
        };
        const brief = { loop: { loopRunId: "l", scope: "03", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: `${DAY}10:00:00.000Z`, id: "id" } };
        await startRun({ ref: "03/01", dir: storyDir }, { brief, now: `${DAY}10:00:00.000Z`, node: "umamis-msi" });

        const result = await invoke("work:run-status", { ref: "03/01" }, { workspace });
        const out = runStatusCommand.cli.render(result, { now: `${DAY}10:25:00.000Z` });
        assert.match(out, /^03\/01 — 1 run\(s\):$/mu);
        assert.ok(out.includes("running") && out.includes("continue") && out.includes("2/3") && out.includes("L2"));
        assert.ok(out.includes("attempt 1") && out.includes("node umamis-msi"));
        assert.ok(out.includes("elapsed 1500000ms"), out);
        assertClean(out, "invoked result");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },
];
