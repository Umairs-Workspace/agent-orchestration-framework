// Traceability wiring for milestone 53 (the frozen brief.loop declaration on the board seam) and
// for milestone 102 / story 01 — THE SHELL DECLARES THE LOOP IT IS.
//
// Covers the @executable scenarios of
//   wiki/work/102_story_the-declaration-names-its-loop/tasks/01_the-shell-declares-the-loop-it-is.feature
// that need a REAL DRIVEN LOOP: every minted run carrying the id, one id across an engagement's
// phases and cycles, a resumed loop keeping it, the id not being derived from the invocation, the
// shell needing no registry to mint one, and the report-only level still writing nothing. The two
// registry-facing scenarios (the id is a loop the shipped registry declares; the drift check is
// armed) are `test/arch/mesh/acd-shell-loop-id-is-declared.test.mjs`, because they are a check over
// `src/bundle/loops/` rather than over a driven loop.
//
// THE FIXTURE HAS NO `.aof/loops/` DIRECTORY AT ALL (`loopFixture` writes a work tree and a config
// and nothing else), so every scenario in this file also witnesses the registry-blind claim rather
// than asserting it in one place: if minting a declaration ever needed a loop record, none of these
// would run at all.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SHELL_LOOP_ID, runLoopBody } from "../../src/commands/loop.mjs";
import { invoke } from "../../src/command-core.mjs";
import { readRuns, startRun } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { stripComments } from "../support/source-slice.mjs";
import { completingDriver, loopFixture, replaceStatus, treeFiles } from "./loop-command-probe.test.mjs";

// 126/02 (ADR-004 §5) appends the NINTH key, `supervised`, by the same additive-supersession
// discipline 102/00 used for the eighth. The eight before it keep their names, order and values.
const DECLARATION_KEYS = ["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id", "supervised"];

// A driver that walks the fixture milestone to done, so one invocation mints runs in more than one
// phase — which is what makes "the same id across every phase and cycle" a measurement rather than a
// restatement of a single run.
const drivingTo = (fx) => completingDriver(fx, {
  onCommand(command) {
    if (command === "/aof:verify 03/01") replaceStatus(path.join(fx.storyDir, "STORY.md"), "done");
    if (command === "/aof:verify 03") replaceStatus(path.join(fx.milestoneDir, "SPEC.md"), "done");
  },
});

// Every run the invocation minted, across every item in the fixture scope.
async function allRuns(fx) {
  const runs = [];
  for (const ref of ["03", "03/01"]) {
    const item = await resolveItemExact(fx.ctx, ref);
    if (item?.dir) runs.push(...await readRuns(item));
  }
  return runs;
}

export const loopCommandBoardStateTests = [
  {
    // 53 — the frozen board seam, widened by 102/00 to the eight-key envelope.
    // 102/01 — Scenario: every run one loop invocation mints carries the loop id
    name: "loop command board state — every minted run carries the frozen brief.loop declaration through work:run-status",
    async run() {
      const fx = await loopFixture();
      try {
        const driver = drivingTo(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        const status = await invoke("work:run-status", { ref: "03/01" }, fx.ctx);
        assert.equal(status.runs.length, 2);
        for (const run of status.runs) {
          assert.deepEqual(Object.keys(run.brief.loop), DECLARATION_KEYS);
          assert.equal(run.brief.loop.id, SHELL_LOOP_ID);
          assert.equal(run.brief.loop.id, "loop:autonomous-cascade");
          assert.equal(run.brief.loop.loopRunId, state.loopRunId);
          assert.equal(run.brief.loop.scope, "03");
          assert.equal(run.brief.loop.level, "L2");
          assert.equal(run.brief.loop.cap, 3);
        }

        // EVERY run the invocation minted, not only the story's — the milestone's verify run
        // carries it too, so no phase mints a declaration by a different route.
        const runs = await allRuns(fx);
        assert.ok(runs.length >= 3, `the invocation minted ${runs.length} runs`);
        for (const run of runs) assert.equal(run.brief.loop.id, SHELL_LOOP_ID);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    // 102/01 — Scenario: the id is the same across every phase and cycle of one engagement
    name: "loop command board state — one engagement's runs share one loopRunId and one loop id across phases",
    async run() {
      const fx = await loopFixture();
      try {
        const driver = drivingTo(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        const runs = await allRuns(fx);

        assert.deepEqual([...new Set(runs.map((run) => run.brief.loop.loopRunId))], [state.loopRunId], "one engagement");
        assert.deepEqual([...new Set(runs.map((run) => run.brief.loop.id))], [SHELL_LOOP_ID], "one loop id");

        // …and the id did not change when the phase did. More than one phase really ran, so this
        // is a comparison across differing values rather than across one repeated row.
        const phases = new Set(runs.map((run) => run.brief.loop.phase));
        assert.ok(phases.size > 1, `more than one phase ran: ${[...phases].join(", ")}`);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    // 102/01 — Scenario: a resumed loop keeps the id it had
    //
    // The SEEDED declaration is the LEGACY seven-key shape, with no `id` — which is what every run
    // record minted before this story really looks like. So this also witnesses 102/00's
    // compatibility claim end to end: a pre-102 run is still a usable resume anchor, and the runs
    // the resumed loop goes on to mint carry the id.
    name: "loop command board state — a resumed loop inherits its loopRunId and mints the same loop id",
    async run() {
      const fx = await loopFixture();
      try {
        const item = await resolveItemExact(fx.ctx, "03/01");
        const seeded = await startRun(item, {
          brief: {
            loop: {
              loopRunId: "loop-seeded",
              scope: "03",
              level: "L2",
              cap: 2,
              phase: "continue",
              cycle: 1,
              startedAt: "2026-08-15T00:00:00.000Z",
            },
          },
          now: "2026-08-15T00:00:00.000Z",
        });
        const driver = drivingTo(fx);
        await runLoopBody(
          { scope: "03", resume: true, now: "2026-08-15T00:16:00.000Z" },
          { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} },
        );

        const minted = (await allRuns(fx)).filter((run) => run.runId !== seeded.runId);
        assert.ok(minted.length > 0, "the resume drove at least one phase");
        for (const run of minted) {
          assert.equal(run.brief.loop.loopRunId, "loop-seeded", "the resumed engagement is the seeded one");
          assert.equal(run.brief.loop.id, SHELL_LOOP_ID);
        }
        // The projection therefore sees ONE engagement, not two: every run that carries a
        // declaration at all carries the seeded loop run id.
        const carrying = (await allRuns(fx)).filter((run) => run.brief?.loop?.id);
        assert.deepEqual([...new Set(carrying.map((run) => run.brief.loop.loopRunId))], ["loop-seeded"]);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    // 102/01 — Scenario: the id is not derived from the invocation
    name: "loop command board state — two invocations at different scopes carry the same, uninterpolated loop id",
    async run() {
      const first = await loopFixture();
      const second = await loopFixture();
      try {
        const driverA = drivingTo(first);
        await runLoopBody({ scope: "03" }, { ...first.ctx, agentSessionDriverOptions: driverA.options, report: () => {} });
        // A RANGE scope and a different cap — a different invocation in every respect the
        // declaration records apart from the id itself.
        const driverB = drivingTo(second);
        await runLoopBody({ scope: "01-03", cap: 5 }, { ...second.ctx, agentSessionDriverOptions: driverB.options, report: () => {} });

        const runsA = await allRuns(first);
        const runsB = await allRuns(second);
        assert.ok(runsA.length > 0 && runsB.length > 0);
        const ids = new Set([...runsA, ...runsB].map((run) => run.brief.loop.id));
        assert.deepEqual([...ids], [SHELL_LOOP_ID], "both invocations carry the same id");

        // The two invocations really did differ in what the declaration records…
        assert.deepEqual([...new Set(runsA.map((run) => run.brief.loop.scope))], ["03"]);
        assert.deepEqual([...new Set(runsB.map((run) => run.brief.loop.scope))], ["01-03"]);
        assert.deepEqual([...new Set(runsB.map((run) => run.brief.loop.cap))], [5]);

        // …and neither `scope` nor `level` appears in the id, because the id is a LITERAL: the
        // constant's initialiser is a plain string with no interpolation and no expression, which
        // is what makes "not derived" structural rather than a property of these two rows.
        const source = stripComments(await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8"));
        assert.match(source, /export const SHELL_LOOP_ID = "loop:autonomous-cascade";/u);
        for (const run of [...runsA, ...runsB]) {
          assert.equal(run.brief.loop.id.includes(run.brief.loop.scope), false);
          assert.equal(run.brief.loop.id.includes(run.brief.loop.level), false);
        }
      } finally {
        await first.cleanup();
        await second.cleanup();
      }
    },
  },
  {
    // 102/01 — Scenario: the shell reads no loop registry to mint a declaration
    name: "loop command board state — a tree with no .aof/loops mints declarations and raises no refusal",
    async run() {
      const fx = await loopFixture();
      try {
        // The precondition, asserted rather than assumed — if the fixture ever grew a registry this
        // scenario would quietly stop testing what it names.
        assert.equal(existsSync(path.join(fx.projectRoot, ".aof", "loops")), false, "the fixture declares no loops");

        const driver = drivingTo(fx);
        const state = await runLoopBody({ scope: "03" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.equal(state.state, "done", "it ran exactly as it does with a registry present");

        const runs = await allRuns(fx);
        assert.ok(runs.length > 0);
        for (const run of runs) assert.equal(run.brief.loop.id, SHELL_LOOP_ID);
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    // 102/01 — Scenario: a report-only loop still writes nothing
    name: "loop command board state — the report-only level mints no run, so no declaration is written",
    async run() {
      const fx = await loopFixture();
      try {
        const before = await treeFiles(fx.projectRoot);
        const driver = completingDriver(fx);
        await runLoopBody({ scope: "03", level: "L1" }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        const after = await treeFiles(fx.projectRoot);

        assert.deepEqual(after, before, "every file in the tree is unchanged");
        assert.equal(driver.spawnCalls.length, 0, "no phase was driven");
        assert.deepEqual(await allRuns(fx), [], "no run record was minted, so no declaration was written");
      } finally {
        await fx.cleanup();
      }
    },
  },
];
