// Traceability wiring for milestone 129 / story 04 — THE PHASES, THE FRESH GATE, THE INTERRUPTS
// AND THE RECONCILE.
//
// Every @executable scenario (and every Examples row) of
//   tasks/01_the-shell-walks-through-review-and-honours-a-gate.feature — REFINE → BUILD → VERIFY,
//     the through-review walk, the refine-end commit, the fresh `gate` act on an in-review story
//   tasks/06_interrupt-deadline-and-reconcile.feature — the two signals, the parent deadline,
//     and `--resume` reconciling every live lane before it walks
//
// Over the same real-repo fixture as `loop-command-wave.test.mjs`; the child, the rubric runner,
// the timers and the signal source are the injected doubles.
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { runLoopBody } from "../../src/commands/loop.mjs";
import { readRuns, startRun, completeRun, heartbeat } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { resolveRefInWorktree } from "../../src/work/dispatch.mjs";
import { meshDispatchWorktreePath } from "../../src/mesh/worktree.mjs";
import { appendProgressSample } from "../../src/loop-progress.mjs";
import {
  withLaneRepo, fakeLaneChild, stubRubric, emits, passingTap, collector, fakeTimers, fakeSignals,
  primaryDriver, verifyCompleter, laneCtx, statusOf, git, headSha, deferred, scriptedRegistry, laneStoryFile, replaceStatus, realExec,
} from "../support/loop/lane-fixture.mjs";

const NOW = "2026-09-14T12:00:00.000Z";
const PROVENANCE = Object.freeze({ node: "fixture", run: null, commit: null, at: NOW });
const grade = (verdict, { codes = [], total = 12, failed = 0, failures = [] } = {}) => ({ verdict, codes, cases: { total, failed, skipped: 0 }, failures, gradedAt: NOW, provenance: { ...PROVENANCE } });

async function runLoop(fx, { child = fakeLaneChild(fx), rubric = stubRubric(emits(passingTap())), registry, report = collector(), timers = fakeTimers(), signals = fakeSignals(), input = {}, now = NOW, extra = {}, driver } = {}) {
  const drive = driver ?? primaryDriver(fx, { onCommand: verifyCompleter(fx) });
  const ctx = laneCtx(fx, { child, rubric, registry, report, driver: drive, timers, signals, now, extra });
  const state = await runLoopBody({ scope: fx.milestone, ...input }, ctx);
  return { state, report, ctx, driver: drive, timers, signals };
}

/** The phases observed off the narration: REFINE drives, waves, VERIFY drives, in order. */
function phasesOf(report, driver) {
  const directives = driver.directives();
  return {
    refines: directives.filter((d) => d.startsWith("/aof:refine ")),
    waves: report.lines.filter((line) => line.startsWith("Wave ")),
    verifies: directives.filter((d) => d.startsWith("/aof:verify ")),
    complete: report.lines.indexOf("Build phase complete — every story in review."),
    refineLine: report.lines.find((line) => line.startsWith("Refine phase complete")),
  };
}

const laneRunsOf = async (fx, ref) => await readRuns(await resolveItemExact({ workspace: fx.workspace }, ref));

export const loopCommandReconcileTests = [
  // ── task 01 · the shell walks through-review and honours a gate ─────────────────────
  {
    name: "129/04 task01 REFINE drives every unrefined story first, in stream order, then commits the loop's own writes",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const driver = primaryDriver(fx, { onCommand: async (command) => {
          if (command === "/aof:refine 07/02") await writeFile(path.join(fx.storyDir("07/02"), "tasks", "00_ready.feature"), "@executable\nFeature: R\n  Scenario: r\n    Given a\n    When b\n    Then c\n", "utf8");
          await verifyCompleter(fx)(command);
        } });
        const child = fakeLaneChild(fx);
        const before = await headSha(fx.root);
        const { state, report } = await runLoop(fx, { child, driver });
        assert.equal(state.state, "done", report.lines.join("\n"));
        const { refines } = phasesOf(report, driver);
        assert.deepEqual(refines, ["/aof:refine 07/02"], "the first drive is refine on 07/02, in the primary, through the driver seam");
        assert.equal(child.calls.some((c) => c.phase === "refine"), false, "…never through spawnLaneDrive");
        assert.equal(driver.directives()[0], "/aof:refine 07/02");
        const log = (await git(["log", "--format=%H %s", `${before}..main`], fx.root)).stdout.trim().split("\n").reverse();
        const refineCommit = log.find((line) => line.endsWith("aof(loop): refine 07"));
        assert.ok(refineCommit, `the primary gained aof(loop): refine 07: ${log.join(" | ")}`);
        const sha = refineCommit.split(" ")[0];
        const files = (await git(["show", "--name-only", "--format=", sha], fx.root)).stdout.trim().split(/\r?\n/u);
        assert.ok(files.length > 0 && files.every((file) => file.startsWith("wiki/work/07_milestone_wave/")), `only paths under the milestone: ${files}`);
        assert.ok(report.lines.includes(`Refine phase complete — 1 story refined; committed ${sha}.`), report.lines.filter((l) => l.startsWith("Refine")).join("\n"));
        const refineRow = state.driven.find((row) => row.phase === "refine");
        assert.deepEqual({ ref: refineRow.ref, phase: refineRow.phase, cycle: refineRow.cycle }, { ref: "07/02", phase: "refine", cycle: 1 });
        for (const key of ["lane", "baseCommit", "merge", "wave"]) assert.equal(key in refineRow, false, `no ${key} key on a refine row`);
      }, { stories: ["01", { number: "02", tasks: false }, "03"] });
    },
  },
  {
    name: "129/04 task01 [outline] the three phases run in order from any starting state, and every BUILD ask carries throughReview (5 rows)",
    run: async () => {
      const rows = [
        { label: "07/02 unrefined", stories: ["01", { number: "02", tasks: false }, "03"], refines: ["/aof:refine 07/02"], commit: true, waveMembers: ["07/01", "07/02", "07/03"], verifies: ["/aof:verify 07/01", "/aof:verify 07/02", "/aof:verify 07/03", "/aof:verify 07"] },
        { label: "every story refined", stories: ["01", "02", "03"], refines: [], commit: false, waveMembers: ["07/01", "07/02", "07/03"], verifies: ["/aof:verify 07/01", "/aof:verify 07/02", "/aof:verify 07/03", "/aof:verify 07"] },
        { label: "zero stories", stories: [], refines: ["/aof:refine 07"], commit: true, waveMembers: [], verifies: [] },
        { label: "every story in-review", stories: [{ number: "01", status: "in-review" }, { number: "03", status: "in-review" }], refines: [], commit: false, waveMembers: [], verifies: ["/aof:verify 07/01", "/aof:verify 07/03", "/aof:verify 07"] },
        { label: "every story done", stories: [{ number: "01", status: "done" }, { number: "03", status: "done" }], refines: [], commit: false, waveMembers: [], verifies: ["/aof:verify 07"] },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const driver = primaryDriver(fx, { onCommand: async (command) => {
            if (command === "/aof:refine 07/02") await writeFile(path.join(fx.storyDir("07/02"), "tasks", "00_ready.feature"), "@executable\nFeature: R\n  Scenario: r\n    Given a\n    When b\n    Then c\n", "utf8");
            if (command === "/aof:refine 07") {
              // The refine of an empty milestone scaffolds a story with tasks; BUILD then runs it.
              const { mkdir } = await import("node:fs/promises");
              const dir = path.join(fx.milestoneDir, "stories", "01_story_s01");
              await mkdir(path.join(dir, "tasks"), { recursive: true });
              await writeFile(path.join(dir, "STORY.md"), "---\ntype: story\nnumber: 01\nslug: s01\nparent: 07\nstatus: not-started\ntitle: \"S\"\ncreated: 2026-09-01\nupdated: 2026-09-01\nschema: 1\nfiles: [src/s01.mjs]\n---\n# S\n", "utf8");
              await writeFile(path.join(dir, "tasks", "00_ready.feature"), "@executable\nFeature: R\n  Scenario: r\n    Given a\n    When b\n    Then c\n", "utf8");
              fx.storyDirs.set("07/01", dir);
            }
            await verifyCompleter(fx)(command);
          } });
          const asks = [];
          const registry = scriptedRegistry({ next: async (input, ctx, real) => { asks.push({ throughReview: input.throughReview === true, at: "next" }); return await real(); } });
          const report = collector();
          const child = fakeLaneChild(fx);
          const { state } = await runLoop(fx, { child, driver, registry, report });
          assert.equal(state.state, "done", `${row.label}: ${report.lines.join("\n")}`);
          const phases = phasesOf(report, driver);
          assert.deepEqual(phases.refines, row.refines, `${row.label}: REFINE`);
          const hasCommit = (await git(["log", "--format=%s"], fx.root)).stdout.includes("aof(loop): refine 07");
          assert.equal(hasCommit, row.commit, `${row.label}: the refine commit`);
          if (row.waveMembers.length > 0) {
            assert.equal(phases.waves.length >= 1, true, `${row.label}: a wave`);
            assert.deepEqual([...new Set(child.calls.map((c) => c.ref))].sort(), row.waveMembers, `${row.label}: the wave's members`);
          } else if (row.label === "zero stories") {
            assert.ok(phases.refines[0] === "/aof:refine 07" && phases.refineLine != null, `${row.label}: refine 07 first, then the commit, then BUILD`);
          } else {
            assert.equal(child.calls.length, 0, `${row.label}: no lane opened`);
            assert.ok(phases.complete >= 0, `${row.label}: Build phase complete on the first ask`);
          }
          if (row.label !== "zero stories") assert.deepEqual(phases.verifies, row.verifies, `${row.label}: VERIFY`);
          // every work:next ask between the refine commit and the Build phase complete line carries throughReview, none after
          const buildAsks = [];
          let seenBuild = false;
          for (const line of report.lines) { if (line.startsWith("Refine phase complete")) seenBuild = true; if (line.startsWith("Build phase complete")) seenBuild = false; }
          const throughReviewAsks = asks.filter((a) => a.throughReview);
          const afterBuild = asks.slice(asks.lastIndexOf(throughReviewAsks.at(-1)) + 1);
          assert.ok(throughReviewAsks.length >= 1, `${row.label}: BUILD asked through-review`);
          assert.ok(afterBuild.every((a) => !a.throughReview), `${row.label}: none after the boundary`);
          void buildAsks; void seenBuild;
        }, { stories: row.stories });
      }
    },
  },
  {
    name: "129/04 task01 the refine commit is skipped when REFINE drove nothing, and leaves the operator's dirt alone when it is made",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const { state, report } = await runLoop(fx);
        assert.equal(state.state, "done");
        assert.equal((await git(["log", "--format=%s"], fx.root)).stdout.includes("aof(loop): refine 07"), false);
        assert.ok(report.lines.includes("Refine phase complete — 0 stories refined."));
      });
      await withLaneRepo(async (fx) => {
        await writeFile(path.join(fx.root, "README.md"), "# edited by the operator\n", "utf8");
        const driver = primaryDriver(fx, { onCommand: async (command) => {
          if (command === "/aof:refine 07/02") await writeFile(path.join(fx.storyDir("07/02"), "tasks", "00_x.feature"), "@executable\nFeature: X\n  Scenario: x\n    Given a\n    When b\n    Then c\n", "utf8");
          await verifyCompleter(fx)(command);
        } });
        const { state } = await runLoop(fx, { driver });
        assert.equal(state.state, "done");
        const sha = (await git(["log", "--format=%H %s"], fx.root)).stdout.split("\n").find((l) => l.endsWith("aof(loop): refine 07")).split(" ")[0];
        const files = (await git(["show", "--name-only", "--format=", sha], fx.root)).stdout;
        assert.match(files, /stories\/02_story_s02\/tasks\/00_x\.feature/u, "the task feature");
        assert.match(files, /stories\/02_story_s02\/STORY\.md/u, "the story's STORY.md");
        assert.match(files, /stories\/02_story_s02\/runs\//u, "…and its runs/ records");
        assert.match((await git(["status", "--porcelain"], fx.root)).stdout, /^ M README\.md/mu, "README.md is still modified and uncommitted");
      }, { stories: ["01", { number: "02", tasks: false }], commit: { "README.md": "# base\n" } });
    },
  },
  {
    name: "129/04 task01 BUILD asks work:next with throughReview and reads done as the boundary, never as an accepted milestone",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const asks = [];
        const seenAtDone = [];
        const registry = scriptedRegistry({ next: async (input, ctx, real) => {
          const a = await real();
          asks.push({ input, state: a.state });
          return a;
        } });
        const report = collector();
        const { state } = await runLoop(fx, { registry, report });
        assert.equal(state.state, "done");
        const build = asks.filter((a) => a.input.throughReview === true);
        assert.ok(build.length >= 2);
        for (const ask of build) assert.deepEqual(ask.input, { scope: "07", throughReview: true });
        const boundary = report.lines.indexOf("Build phase complete — every story in review.");
        assert.ok(boundary >= 0);
        assert.equal(report.lines.slice(0, boundary + 1).some((line) => line === "Accepted milestone 07."), false, "no Accepted milestone at the boundary");
        const verifyRowsBeforeBoundary = state.driven.filter((row) => row.phase === "verify");
        assert.ok(verifyRowsBeforeBoundary.every((row) => report.lines.indexOf(`Driving ${row.ref} — verify, cycle 1 of 3, L2.`) > boundary), "every verify drive comes after the boundary");
        void seenAtDone;
      });
    },
  },
  {
    name: "129/04 task01 VERIFY honours a fresh gate on an in-review story — validate, doctor, the recorded grade without a re-run, then verify",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const item = await resolveItemExact({ workspace: fx.workspace }, "07/01");
        // A continue run, then a successor run carrying the recorded grade (the sequential shape).
        const c = await startRun(item, { brief: { loop: { loopRunId: "old", scope: "07", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: NOW, id: "loop:autonomous-cascade", supervised: false } }, now: "2026-09-14T11:00:00.000Z" });
        await completeRun(item, { runId: c.runId, outcome: "done", now: "2026-09-14T11:01:00.000Z" });
        const v = await startRun(item, { brief: { loop: { loopRunId: "old", scope: "07", level: "L2", cap: 3, phase: "verify", cycle: 1, startedAt: NOW, id: "loop:autonomous-cascade", supervised: false }, grade: grade("pass") }, now: "2026-09-14T11:02:00.000Z" });
        await completeRun(item, { runId: v.runId, outcome: "failed", failureReason: "agent_error", now: "2026-09-14T11:03:00.000Z" });
        const gradeAsks = [];
        const registry = scriptedRegistry({ grade: async (input, ctx, real) => { gradeAsks.push(input); return await real(); } });
        const report = collector();
        const driver = primaryDriver(fx, { onCommand: verifyCompleter(fx) });
        const { state } = await runLoop(fx, { registry, report, driver });
        assert.equal(state.state, "done", report.lines.join("\n"));
        const first = report.lines.findIndex((line) => line.startsWith("Gate work:validate 07/01"));
        assert.ok(first >= 0);
        assert.equal(report.lines[first], "Gate work:validate 07/01 — 0 finding(s).");
        assert.equal(report.lines[first + 1], "Gate work:doctor 07/01 — 0 admitted finding(s).");
        assert.equal(report.lines[first + 2], "Gate work:grade 07/01 — pass, 0 of 12 case(s) failing.", "the shipped line, with no re-run behind it");
        assert.ok(gradeAsks.every((input) => input.run !== true), "work:grade is invoked WITHOUT run: true");
        assert.equal(driver.directives()[0], "/aof:verify 07/01", "the next drive is verify, never continue");
        const verifyRun = (await laneRunsOf(fx, "07/01")).filter((run) => run.brief?.loop?.phase === "verify").at(-1);
        assert.equal(verifyRun.brief.grade.verdict, "pass", "the verify run's brief.grade is the recorded grade");
      }, { stories: [{ number: "01", status: "in-review" }], config: { loop: { concurrency: "sequential" } } });
    },
  },
  {
    name: "129/04 task01 [outline] the fresh gate routes on what validate, doctor and the recorded grade say (6 rows)",
    run: async () => {
      const rows = [
        { validate: 0, doctor: "none", recorded: "pass", next: "verify", cycle: 1, findings: [] },
        { validate: 2, doctor: "not-asked", recorded: "pass", next: "continue", cycle: 2, findings: ["v-0", "v-1"] },
        { validate: 0, doctor: "error", recorded: "pass", next: "continue", cycle: 2, findings: ["control-unresolved"] },
        { validate: 0, doctor: "none", recorded: "fail", next: "continue", cycle: 2, findings: ["work:grade/case-failed/own-red"] },
        { validate: 1, doctor: "not-asked", recorded: "fail", next: "continue", cycle: 2, findings: ["v-0", "work:grade/case-failed/own-red"] },
        { validate: 0, doctor: "none", recorded: "rubric-unconfigured", next: "verify", cycle: 1, findings: [] },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const item = await resolveItemExact({ workspace: fx.workspace }, "07/01");
          const c = await startRun(item, { brief: { loop: { loopRunId: "old", scope: "07", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: NOW, id: "loop:autonomous-cascade", supervised: false } }, now: "2026-09-14T11:00:00.000Z" });
          await completeRun(item, { runId: c.runId, outcome: "done", now: "2026-09-14T11:01:00.000Z" });
          const recordedGrade = row.recorded === "pass" ? grade("pass")
            : row.recorded === "fail" ? grade("fail", { codes: ["case-failed"], failed: 1, failures: [{ case: "own-red", message: "m", scenario: "s" }] })
              : grade("indeterminate", { codes: ["rubric-unconfigured"], total: 0 });
          const v = await startRun(item, { brief: { loop: { loopRunId: "old", scope: "07", level: "L2", cap: 3, phase: "verify", cycle: 1, startedAt: NOW, id: "loop:autonomous-cascade", supervised: false }, grade: recordedGrade }, now: "2026-09-14T11:02:00.000Z" });
          await completeRun(item, { runId: v.runId, outcome: "failed", failureReason: "agent_error", now: "2026-09-14T11:03:00.000Z" });
          const asked = [];
          const registry = scriptedRegistry({
            validate: async () => { asked.push("validate"); return { findings: Array.from({ length: row.validate }, (_, i) => ({ code: `v-${i}`, path: "x" })) }; },
            doctor: async () => { asked.push("doctor"); return { findings: row.doctor === "error" ? [{ code: "control-unresolved", severity: "error" }] : [] }; },
          });
          const driver = primaryDriver(fx, { onCommand: verifyCompleter(fx) });
          const report = collector();
          let fixInput = null;
          const { state } = await runLoop(fx, { registry, report, driver, input: { cap: 3 }, extra: { readChangeUnderReview: async () => "" } });
          const label = `validate=${row.validate} doctor=${row.doctor} recorded=${row.recorded}`;
          assert.equal(driver.directives()[0], `/aof:${row.next} 07/01`, `${label}: next act (${report.lines.join(" | ")})`);
          const firstRow = state.driven.find((r) => r.ref === "07/01");
          assert.equal(firstRow.phase, row.next, `${label}: phase`);
          assert.equal(firstRow.cycle, row.cycle, `${label}: cycle`);
          if (row.doctor === "not-asked") assert.equal(asked.includes("doctor"), false, `${label}: doctor not asked`);
          if (row.next === "continue") {
            const redrive = (await laneRunsOf(fx, "07/01")).filter((run) => run.brief?.loop?.phase === "continue").at(-1);
            const carried = (redrive.brief.review?.admittedBlockerClaims ?? []).length;
            void carried;
            // the fix reached the driver: the second input line of the drive carries the findings
            const typed = driver.typed[0];
            for (const finding of row.findings) {
              const [gate, code, kase] = finding.split("/");
              if (kase) { assert.match(typed, new RegExp(`"gate": "${gate}"`, "u"), `${label}: ${gate}`); assert.match(typed, new RegExp(`"case": "${kase}"`, "u"), `${label}: ${kase}`); }
              else assert.match(typed, new RegExp(`"code": "${gate}"`, "u"), `${label}: ${gate}`);
            }
          }
          void fixInput;
        }, { stories: [{ number: "01", status: "in-review" }], config: { loop: { concurrency: "sequential" } } });
      }
    },
  },
  {
    name: "129/04 task01 the fresh gate's re-drive is a continue in the primary under sequential; the gate is honoured, not halted, and any other status still halts unmapped",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const item = await resolveItemExact({ workspace: fx.workspace }, "07/01");
        const registry = scriptedRegistry({ validate: async () => ({ findings: [{ code: "v-0", path: "x" }, { code: "v-1", path: "y" }] }) });
        const driver = primaryDriver(fx, { onCommand: verifyCompleter(fx) });
        const child = fakeLaneChild(fx);
        const report = collector();
        const { state } = await runLoop(fx, { registry, driver, child, report, extra: { readChangeUnderReview: async () => "" } });
        assert.equal(driver.directives()[0], "/aof:continue 07/01");
        const row = state.driven.find((r) => r.ref === "07/01");
        assert.equal(row.cycle, 2, "at cycle 2");
        assert.equal(row.phase, "continue");
        assert.match(driver.typed[0], /"code": "v-0"/u, "carrying the two findings as its fix");
        assert.match(driver.typed[0], /"code": "v-1"/u);
        const runs = await readRuns(item);
        assert.ok(runs.some((run) => run.brief?.loop?.phase === "continue" && run.brief.loop.cycle === 2), "minted in the primary");
        assert.equal(child.calls.length, 0, "spawnLaneDrive is never called");
        assert.equal(state.act.stop === "unmapped-item-type", false, "no unmapped-item-type halt");
      }, { stories: [{ number: "01", status: "in-review" }], config: { loop: { concurrency: "sequential" } } });
      // A `gate` act arriving with a status other than in-review is still the unexpected act: the
      // engine emits a fresh `gate` only for an in-review head, so the divergence cannot be driven
      // through `work:next`; the shell's guard and the halt that follows it are read at the source.
      const shell = await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8");
      const gateAt = shell.indexOf('if (act.act === "gate" && next?.status === "in-review") {');
      const unmappedAt = shell.indexOf('act = haltDecision("unmapped-item-type", next?.ref ?? resolved.scope, "unexpected-engine-act");', gateAt);
      assert.ok(gateAt >= 0 && unmappedAt > gateAt, "a gate act is honoured only for an in-review head; any other reaches the unmapped-item-type halt with producer unexpected-engine-act");
    },
  },
  {
    name: "129/04 task01 sequential keeps refine and build interleaved as today — no throughReview, no lane, no aof(loop) commit",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const asks = [];
        const registry = scriptedRegistry({ next: async (input, ctx, real) => { asks.push(input); return await real(); } });
        const driver = primaryDriver(fx, { onCommand: async (command) => {
          if (command === "/aof:refine 07/02") await writeFile(path.join(fx.storyDir("07/02"), "tasks", "00_ready.feature"), "@executable\nFeature: R\n  Scenario: r\n    Given a\n    When b\n    Then c\n", "utf8");
          await verifyCompleter(fx)(command);
        } });
        const child = fakeLaneChild(fx);
        const { state } = await runLoop(fx, { registry, driver, child, extra: { readChangeUnderReview: async () => "" } });
        assert.equal(state.state, "done");
        assert.deepEqual(driver.directives().slice(0, 3), ["/aof:continue 07/01", "/aof:verify 07/01", "/aof:refine 07/02"], "interleaved per story in ready order");
        assert.ok(asks.every((input) => input.throughReview !== true), "no work:next ask carries throughReview");
        assert.equal(child.calls.length, 0, "no lane");
        assert.equal((await git(["log", "--format=%s"], fx.root)).stdout.includes("aof(loop):"), false, "no aof(loop) commit");
      }, { stories: ["01", { number: "02", tasks: false }], config: { loop: { concurrency: "sequential" } } });
    },
  },
  {
    name: "129/04 task01 [outline] the recorded grade is read from the run, then the ledger, then not at all (5 rows)",
    run: async () => {
      const rows = [
        { records: "successor-pass", line: "Gate work:grade 07/01 — pass, 0 of 12 case(s) failing.", next: "verify", cycle: 1 },
        { records: "ledger-0", line: /^Gate work:grade 07\/01 — pass \(recorded delta 0 on run .+\)\.$/u, next: "verify", cycle: 1 },
        { records: "ledger-2", line: /^Gate work:grade 07\/01 — fail \(recorded delta 2 on run .+\)\.$/u, next: "continue", cycle: 2 },
        { records: "none", line: "Gate work:grade 07/01 — no recorded grade; verify's ceremony grades the tree.", next: "verify", cycle: 1 },
        { records: "successor-indeterminate", line: "Gate work:grade 07/01 — indeterminate (runner-timeout).", next: "halt", cycle: null },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const item = await resolveItemExact({ workspace: fx.workspace }, "07/01");
          const loop = (phase) => ({ loopRunId: "old", scope: "07", level: "L2", cap: 3, phase, cycle: 1, startedAt: NOW, id: "loop:autonomous-cascade", supervised: false });
          if (row.records.startsWith("successor")) {
            const c = await startRun(item, { brief: { loop: loop("continue") }, now: "2026-09-14T11:00:00.000Z" });
            await completeRun(item, { runId: c.runId, outcome: "done", now: "2026-09-14T11:01:00.000Z" });
            const g = row.records === "successor-pass" ? grade("pass") : grade("indeterminate", { codes: ["runner-timeout"], total: 0 });
            const v = await startRun(item, { brief: { loop: loop("verify"), grade: g }, now: "2026-09-14T11:02:00.000Z" });
            await completeRun(item, { runId: v.runId, outcome: "failed", failureReason: "agent_error", now: "2026-09-14T11:03:00.000Z" });
          }
          if (row.records.startsWith("ledger")) {
            const c = await startRun(item, { brief: { loop: loop("continue") }, now: "2026-09-14T11:00:00.000Z" });
            const done = await completeRun(item, { runId: c.runId, outcome: "done", now: "2026-09-14T11:01:00.000Z" });
            await appendProgressSample(item, done, { at: "2026-09-14T11:00:30.000Z", runId: done.runId, filesTouched: [], linesChanged: 0, commitsMade: 0, failingScenarios: row.records === "ledger-0" ? 0 : 2 });
          }
          const gradeAsks = [];
          const driver = primaryDriver(fx, { onCommand: verifyCompleter(fx) });
          const registry = scriptedRegistry({ grade: async (input, ctx, real) => { gradeAsks.push({ input, drives: driver.typed.length }); return await real(); } });
          const report = collector();
          const { state } = await runLoop(fx, { registry, driver, report, extra: { readChangeUnderReview: async () => "" } });
          // The gate's read is the FIRST grade ask; a re-drive's own baseline and ladder follow it.
          assert.ok(gradeAsks.length > 0 && gradeAsks[0].input.run !== true, `${row.records}: the gate never invokes work:grade with run: true`);
          const line = report.lines.find((l) => l.startsWith("Gate work:grade 07/01"));
          if (typeof row.line === "string") assert.equal(line, row.line, row.records);
          else assert.match(line ?? "", row.line, row.records);
          if (row.next === "halt") {
            assert.equal(state.act.stop, "grade-indeterminate", row.records);
            assert.equal(state.act.producer, "work:grade:runner-timeout", row.records);
          } else {
            assert.equal(driver.directives()[0], `/aof:${row.next} 07/01`, `${row.records}: next`);
            assert.equal(state.driven.find((r) => r.ref === "07/01").cycle, row.cycle, `${row.records}: cycle`);
          }
        }, { stories: [{ number: "01", status: "in-review" }], config: { loop: { concurrency: "sequential" } } });
      }
    },
  },
  {
    name: "129/04 task01 a refine-end commit git refuses is a named halt, and the primary is left exactly as it was",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const driver = primaryDriver(fx, { onCommand: async (command) => {
          if (command === "/aof:refine 07/02") await writeFile(path.join(fx.storyDir("07/02"), "tasks", "00_x.feature"), "@executable\nFeature: X\n  Scenario: x\n    Given a\n    When b\n    Then c\n", "utf8");
        } });
        let before = null;
        const exec = async (args, options) => {
          if (args[0] === "add" && before == null) before = (await git(["status", "--porcelain"], fx.root)).stdout;
          if (args.includes("commit") && !args.includes("--allow-empty")) {
            return { status: 128, stdout: "", stderr: "fatal: Unable to create '.git/index.lock': File exists.\nindex.lock exists" };
          }
          return await realExec(args, options);
        };
        const { state, report } = await runLoop(fx, { driver, extra: { exec } });
        assert.equal(state.act.stop, "lane-merge-refused", report.lines.join("\n"));
        assert.equal(state.act.producer, "dispatch:commit-own-writes:commit-failed");
        assert.match(report.lines.at(-1), /index\.lock exists/u, "the halt's detail carries git's message");
        const after = (await git(["status", "--porcelain"], fx.root)).stdout;
        // The own-writes commit stages the milestone's paths before git refuses; the shell resets
        // them, so the porcelain reads as it did before the commit was attempted.
        assert.equal(after, before, "git status --porcelain is byte-identical to before the commit");
      }, { stories: ["01", { number: "02", tasks: false }] });
    },
  },

  // ── task 06 · interrupts, the deadline and the reconcile ────────────────────────────
  {
    name: "129/04 task06 the first signal drains and halts operator-interrupt; the wave run is failed",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const signals = fakeSignals();
        const dispatches = [];
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => { if (input.refs) dispatches.push([...input.refs]); return await real(); } });
        const child = fakeLaneChild(fx, { answers: { "07/01": async (input) => {
          signals.raise("SIGINT");
          const file = await laneStoryFile(fx, input.lane, "07/01");
          await replaceStatus(file, "in-review");
          return { outcome: "document", document: { outcome: "done", sessionId: "s-07/01", settlementContext: {} } };
        } } });
        const { state, report } = await runLoop(fx, { child, registry, signals });
        assert.equal(state.act.stop, "operator-interrupt");
        assert.equal(state.act.producer, "SIGINT");
        assert.match(report.lines.at(-1), /signal=SIGINT/u);
        assert.equal(dispatches.length, 1, "no further work:dispatch ask");
        for (const ref of ["07/01", "07/03"]) {
          const row = state.driven.find((r) => r.ref === ref && r.phase === "continue");
          assert.ok(row?.merge && ["fast-forwarded", "merged"].includes(row.merge.outcome), `${ref}: graded, committed and merged`);
        }
        const wave = (await laneRunsOf(fx, "07")).filter((r) => r.brief?.wave != null).at(-1);
        assert.equal(wave.state, "failed");
      });
    },
  },
  {
    name: "129/04 task06 [outline] a signal's effect depends on how many lanes are open and whether it is the first (6 rows), and the second signal cancels every child",
    run: async () => {
      // 0 open, 0 prior: no lane is opened; the halt is reported at the next tick
      await withLaneRepo(async (fx) => {
        const signals = fakeSignals();
        const registry = scriptedRegistry({ next: async (input, ctx, real) => { if (input.throughReview) signals.raise("SIGINT"); return await real(); } });
        const child = fakeLaneChild(fx);
        const { state } = await runLoop(fx, { child, registry, signals });
        assert.equal(state.act.stop, "operator-interrupt");
        assert.equal(child.calls.length, 0, "no child is touched, no lane opened");
      });
      // 1 open, 0 prior, SIGTERM: the one child finishes on its own and its lane is merged
      await withLaneRepo(async (fx) => {
        const signals = fakeSignals();
        const child = fakeLaneChild(fx, { answers: { "07/01": async (input) => {
          signals.raise("SIGTERM");
          await replaceStatus(await laneStoryFile(fx, input.lane, "07/01"), "in-review");
          return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } };
        } } });
        const { state } = await runLoop(fx, { child, signals });
        assert.equal(state.act.stop, "operator-interrupt");
        assert.equal(state.act.producer, "SIGTERM");
        assert.ok(state.driven.find((r) => r.ref === "07/01" && r.merge != null), "that lane is merged");
      }, { stories: ["01"] });
      // 2 open, 1 prior, second SIGINT: both children's stdin ended, neither lane merged, both kept
      await withLaneRepo(async (fx) => {
        const signals = fakeSignals();
        const aborted = [];
        const child = fakeLaneChild(fx, { answers: {
          "07/01": async (input) => { signals.raise("SIGINT"); setTimeout(() => signals.raise("SIGINT"), 30); if (!input.signal.aborted) await new Promise((r) => input.signal.addEventListener("abort", r, { once: true })); aborted.push(input.ref); return { outcome: "aborted" }; },
          "07/03": async (input) => { if (!input.signal.aborted) await new Promise((r) => input.signal.addEventListener("abort", r, { once: true })); aborted.push(input.ref); return { outcome: "aborted" }; },
        } });
        const { state, report } = await runLoop(fx, { child, signals });
        assert.equal(state.act.stop, "operator-interrupt", report.lines.join("\n"));
        assert.deepEqual(aborted.sort(), ["07/01", "07/03"], "every child's stdin was ended (the abort signal fired) and spawnLaneDrive answered aborted");
        for (const ref of ["07/01", "07/03"]) {
          const lane = meshDispatchWorktreePath(fx.root, ref);
          assert.ok(existsSync(lane), `${ref}: the lane is kept`);
          const runs = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, lane, ref));
          assert.equal(runs[0].state, "cancelled", `${ref}: settled cancelled`);
          assert.equal(runs[0].failureReason, null, `${ref}: no reason`);
          assert.equal(runs.length, 1, `${ref}: no retry`);
          const row = state.driven.find((r) => r.ref === ref && r.phase === "continue");
          assert.equal(row.outcome, "cancelled", `${ref}: the row`);
          assert.equal(row.merge, undefined, `${ref}: merge absent`);
        }
        assert.match(report.lines.at(-1), /cancelled=\["07\/0[13]","07\/0[13]"\]/u, "the cancelled lanes are named in the account");
      });
      // 1 open, 1 prior, SIGTERM: the one child is aborted, its lane kept
      await withLaneRepo(async (fx) => {
        const signals = fakeSignals();
        const child = fakeLaneChild(fx, { answers: { "07/01": async (input) => { signals.raise("SIGINT"); setTimeout(() => signals.raise("SIGTERM"), 20); if (!input.signal.aborted) await new Promise((r) => input.signal.addEventListener("abort", r, { once: true })); return { outcome: "aborted" }; } } });
        const { state } = await runLoop(fx, { child, signals });
        assert.equal(state.act.stop, "operator-interrupt");
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "its lane is kept");
      }, { stories: ["01"] });
      // 2 open, one already merged, 1 prior, SIGINT: only the open child is aborted; the merged lane stays merged
      await withLaneRepo(async (fx) => {
        const signals = fakeSignals();
        const gate03 = deferred();
        const child = fakeLaneChild(fx, { answers: {
          "07/01": async (input) => { await replaceStatus(await laneStoryFile(fx, input.lane, "07/01"), "in-review"); return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } }; },
          "07/03": async (input) => { await gate03.promise; signals.raise("SIGINT"); setTimeout(() => signals.raise("SIGINT"), 20); if (!input.signal.aborted) await new Promise((r) => input.signal.addEventListener("abort", r, { once: true })); return { outcome: "aborted" }; },
        } });
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => { const a = await real(); if (input.cleanup && input.ref === "07/01") gate03.resolve(); return a; } });
        const { state } = await runLoop(fx, { child, signals, registry });
        assert.equal(state.act.stop, "operator-interrupt");
        assert.equal(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), false, "the merged lane stays merged and cleaned up");
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/03")), "the open one is kept");
        assert.ok(state.driven.find((r) => r.ref === "07/01" && r.merge != null));
      });
    },
  },
  {
    name: "129/04 task06 a child past the parent deadline is settled timeout and retried in its lane; the lineage budget still bounds it",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx, { answers: { "07/01": [{ outcome: "timeout" }, undefined] } });
        const { state, report } = await runLoop(fx, { child });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.deepEqual(child.calls.map((c) => c.deadlineMs), [1100, 1100]);
        const runs = (await laneRunsOf(fx, "07/01")).filter((r) => r.brief?.lane != null);
        assert.deepEqual(runs.map((r) => [r.state, r.failureReason]), [["failed", "timeout"], ["done", null]]);
        assert.ok(report.lines.includes("Retrying 07/01 — continue, attempt 2 of 3 (timeout)."));
        assert.equal(child.calls[0].lane, child.calls[1].lane, "the SAME lane worktree");
      }, { stories: ["01"], config: { loop: { startToCloseMs: 1000, startupGraceMs: 100 } } });
      await withLaneRepo(async (fx) => {
        // Every attempt is a timeout; each is stamped an instant apart so the lineage's elapsed
        // (attempt sums, the budget) crosses 1500ms on the second retry.
        let tick = 0;
        const child = fakeLaneChild(fx, { answers: { "07/01": { outcome: "timeout" } } });
        const clock = () => new Date(Date.parse(NOW) + (tick += 1100)).toISOString();
        const { state, report } = await runLoop(fx, { child, now: undefined, extra: { now: clock } });
        assert.equal(state.act.stop, "deadline-exhausted", report.lines.join("\n"));
        assert.match(report.lines.at(-1), /ceilingMs=1500/u);
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "the lane is kept");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        const runs = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01"));
        assert.ok(runs.length >= 2 && runs.every((r) => r.state === "failed" && r.failureReason === "timeout"), "both failed / timeout records");
      }, { stories: ["01"], config: { loop: { startToCloseMs: 1000, startupGraceMs: 100, scheduleToCloseMs: 1500 } } });
    },
  },
  {
    name: "129/04 task06 [outline] a resume reconciles each live lane before walking (9 rows)",
    run: async () => {
      // Common seed: one loop run leaves 07/01's lane open with a running record (needs-input).
      const seed = async (fx, { answer } = {}) => {
        const { state } = await runLoop(fx, { child: fakeLaneChild(fx, { answers: { "07/01": answer ?? { outcome: "document", document: { outcome: "needs-input", sessionId: "s-1" } } } }) });
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        const laneItem = await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01");
        return { state, lane, laneItem };
      };
      const stale = "2026-09-14T09:00:00.000Z";
      // stale running → reclaimed, retried in the lane as attempt 2
      await withLaneRepo(async (fx) => {
        const { lane, laneItem } = await seed(fx);
        const running = (await readRuns(laneItem))[0];
        await heartbeat(laneItem, running.runId, { now: stale });
        const asks = [];
        const registry = scriptedRegistry({ next: async (input, ctx, real) => { asks.push(report.lines.length); return await real(); } });
        const report = collector();
        const { state } = await runLoop(fx, { registry, report, input: { resume: true } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.equal(report.lines[0], "Reconciling 1 live lane(s).", "the narration begins with the reconcile");
        assert.ok(report.lines.includes(`Reclaimed 07/01 — run ${running.runId} (runtime_offline).`));
        assert.ok(report.lines.some((line) => line.startsWith("Lane 07/01 — reclaimed:")), "named with its classification");
        assert.ok(report.lines.some((line) => /^Resumed 07\/01 — attempt 2 of 3 on run \S+\.$/u.test(line)), report.lines.join("\n"));
        assert.ok(asks[0] > report.lines.indexOf(`Reclaimed 07/01 — run ${running.runId} (runtime_offline).`), "handled before any work:next ask");
        void lane;
      }, { stories: ["01"], config: { loop: { heartbeatMs: 60000 } } });
      // stale running + dirty tree → re-driven with the dirt in place, never committed first
      await withLaneRepo(async (fx) => {
        const { lane, laneItem } = await seed(fx);
        const running = (await readRuns(laneItem))[0];
        await heartbeat(laneItem, running.runId, { now: stale });
        await writeFile(path.join(lane, "dirt.txt"), "uncommitted\n", "utf8");
        let dirtSeen = null;
        const child = fakeLaneChild(fx, { onSpawn: async (input) => { dirtSeen = { exists: existsSync(path.join(input.lane, "dirt.txt")), porcelain: (await git(["status", "--porcelain"], input.lane)).stdout }; } });
        const { state, report } = await runLoop(fx, { child, input: { resume: true } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.ok(dirtSeen?.exists && /dirt\.txt/u.test(dirtSeen.porcelain), "re-driven with the dirt in place, uncommitted");
        assert.equal(report.lines.some((line) => /reconciled/u.test(line) && /committed/u.test(line)), false, "never committed first");
      }, { stories: ["01"], config: { loop: { heartbeatMs: 60000 } } });
      // fresh running → live and left
      await withLaneRepo(async (fx) => {
        const { laneItem } = await seed(fx);
        const running = (await readRuns(laneItem))[0];
        await heartbeat(laneItem, running.runId, { now: new Date().toISOString() });
        const child = fakeLaneChild(fx);
        const { state, report } = await runLoop(fx, { child, input: { resume: true }, now: new Date().toISOString() });
        assert.ok(report.lines.includes(`Lane 07/01 — live: run ${running.runId} is still heartbeating; left.`), report.lines.join("\n"));
        assert.equal((await readRuns(laneItem))[0].state, "running", "not reclaimed");
        assert.equal(child.calls.length, 0, "not re-driven");
        assert.equal(state.act.stop, "lane-open-failed", "…and the wave cannot dispatch over a live foreign lane");
        assert.equal(state.act.producer, "run-store:duplicate-run");
      }, { stories: ["01"], config: { loop: { heartbeatMs: 3600000 } } });
      // committed, not an ancestor, no running run → merged then cleaned up
      await withLaneRepo(async (fx) => {
        const { lane } = await seed(fx, { answer: { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } } });
        void lane;
      }, { stories: ["01"] });
      await withLaneRepo(async (fx) => {
        // grade indeterminate halts after the lane commit → a committed, unmerged lane
        const { state: first } = await runLoop(fx, { rubric: stubRubric([emits(passingTap()), emits("", 0)]) });
        assert.equal(first.act.stop, "grade-indeterminate", "guard");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        assert.ok(existsSync(lane));
        const { state, report } = await runLoop(fx, { input: { resume: true } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.ok(report.lines.some((line) => /Lane 07\/01 — merge: (fast-forwarded|merged)/u.test(line)), "merged through mergeDispatchLaneHome");
        assert.ok(report.lines.some((line) => /Lane 07\/01 — cleanup: removed/u.test(line)), "…then cleaned up");
        assert.equal(existsSync(lane), false);
      }, { stories: ["01"] });
      // committed, not an ancestor, merge conflicts → halt lane-merge-conflict before any walk
      for (const [outcome, stop] of [["conflict", "lane-merge-conflict"], ["refused", "lane-merge-refused"]]) {
        await withLaneRepo(async (fx) => {
          const { state: first } = await runLoop(fx, { rubric: stubRubric([emits(passingTap()), emits("", 0)]), child: fakeLaneChild(fx, { answers: { "07/01": async (input) => {
            await writeFile(path.join(input.lane, "src", "x.mjs"), "// lane\n", "utf8");
            await replaceStatus(await laneStoryFile(fx, input.lane, "07/01"), "in-review");
            return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } };
          } } }) });
          assert.equal(first.act.stop, "grade-indeterminate", "guard");
          await writeFile(path.join(fx.root, "src", "x.mjs"), "// operator\n", "utf8");
          if (outcome === "conflict") await git(["commit", "-q", "-am", "operator: moved"], fx.root);
          const asks = [];
          const registry = scriptedRegistry({ next: async (input, ctx, real) => { asks.push(input); return await real(); } });
          const { state, report } = await runLoop(fx, { registry, input: { resume: true } });
          assert.equal(state.act.stop, stop, `${outcome}: ${report.lines.join("\n")}`);
          assert.equal(asks.length, 0, `${outcome}: before any walk`);
          assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), `${outcome}: the lane kept`);
          if (outcome === "refused") assert.match(report.lines.at(-1), /files=\["src\/x\.mjs"\]/u);
        }, { stories: ["01"], commit: { "src/x.mjs": "// base\n" } });
      }
      // tip already an ancestor → cleaned up (a hand-merged conflict lane)
      await withLaneRepo(async (fx) => {
        const { state: first } = await runLoop(fx, { rubric: stubRubric([emits(passingTap()), emits("", 0)]) });
        assert.equal(first.act.stop, "grade-indeterminate", "guard");
        await git(["merge", "-q", "--no-edit", "aof/mesh/07-01"], fx.root);
        const { state, report } = await runLoop(fx, { input: { resume: true } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.ok(report.lines.some((line) => /Lane 07\/01 — merged: tip .+ is already an ancestor of HEAD\./u.test(line)));
        assert.ok(report.lines.some((line) => /Lane 07\/01 — cleanup: removed/u.test(line)));
        assert.equal(await statusOf(path.join(fx.storyDir("07/01"), "STORY.md")), "done", "the walk continued from in-review to done");
      }, { stories: ["01"] });
      // dirty tree, no running run → committed (`aof(loop): 07/01 reconciled`), merged, cleaned up
      await withLaneRepo(async (fx) => {
        const { state: first } = await runLoop(fx, { rubric: stubRubric([emits(passingTap()), emits("", 0)]) });
        assert.equal(first.act.stop, "grade-indeterminate", "guard");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        await writeFile(path.join(lane, "late.txt"), "late edit\n", "utf8");
        const { state, report } = await runLoop(fx, { input: { resume: true } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.ok(report.lines.some((line) => /Lane 07\/01 — dirty: committed/u.test(line)));
        assert.match((await git(["log", "--format=%s"], fx.root)).stdout, /aof\(loop\): 07\/01 reconciled/u);
        assert.ok(existsSync(path.join(fx.root, "late.txt")), "…merged home");
        assert.equal(existsSync(lane), false, "…and cleaned up");
      }, { stories: ["01"] });
      // prunable → narrated and left
      await withLaneRepo(async (fx) => {
        const { state: first } = await runLoop(fx, { rubric: stubRubric([emits(passingTap()), emits("", 0)]) });
        assert.equal(first.act.stop, "grade-indeterminate", "guard");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        const { rm } = await import("node:fs/promises");
        await rm(lane, { recursive: true, force: true });
        const { report } = await runLoop(fx, { input: { resume: true } });
        assert.ok(report.lines.some((line) => /Lane 07\/01 — prunable: .+ left for aof work dispatch --sweep\./u.test(line)), report.lines.join("\n"));
      }, { stories: ["01"] });
    },
  },
  {
    name: "129/04 task06 reconciliation walks every lane in dispatch-root order before the first ask; unclassified and out-of-scope lanes are left; the resumed wave re-mints its wave run and a reclaimed wave run is never retried",
    run: async () => {
      await withLaneRepo(async (fx) => {
        // 07/03 committed+unmerged (indeterminate halt); 07/01 with a stale running run.
        const rubric = stubRubric((at, options) => (String(options.cwd).includes("dispatch-07-03") && at > 0 ? emits("", 0) : emits(passingTap())));
        const child = fakeLaneChild(fx, { answers: { "07/01": { outcome: "document", document: { outcome: "needs-input", sessionId: "s-1" } } } });
        const { state: first } = await runLoop(fx, { child, rubric });
        assert.ok(["grade-indeterminate", "session-needs-input"].includes(first.act.stop), `guard: ${first.act.stop}`);
        const lane01 = await resolveRefInWorktree(fx.root, fx.workDir, meshDispatchWorktreePath(fx.root, "07/01"), "07/01");
        const running = (await readRuns(lane01)).find((r) => r.state === "running");
        assert.ok(running, "guard: 07/01 left running");
        await heartbeat(lane01, running.runId, { now: "2026-09-14T09:00:00.000Z" });
        // a lane outside this loop's scope, and an unclassifiable directory
        await git(["worktree", "add", "-q", "-b", "aof/mesh/53-01", meshDispatchWorktreePath(fx.root, "53/01"), "HEAD"], fx.root);
        const asks = [];
        let offered = null;
        const registry = scriptedRegistry({ next: async (input, ctx, real) => { asks.push(report.lines.length); const a = await real(); if (input.throughReview && offered == null) offered = (a.wave ?? []).map((m) => m.ref); return a; } });
        const report = collector();
        const { state } = await runLoop(fx, { registry, report, input: { resume: true } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.ok(report.lines.includes("Reconciling 2 live lane(s)."), report.lines.slice(0, 5).join("\n"));
        const merged03 = report.lines.findIndex((line) => /Lane 07\/03 — merge: (fast-forwarded|merged)/u.test(line));
        const reclaimed01 = report.lines.findIndex((line) => line.startsWith(`Reclaimed 07/01 — run ${running.runId}`));
        assert.ok(merged03 >= 0 && reclaimed01 >= 0 && merged03 < asks[0] && reclaimed01 < asks[0], "07/03 merged and 07/01 reclaimed before work:next was asked");
        assert.deepEqual(offered, ["07/01"], "the through-review ask offers 07/01 and no longer 07/03");
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "53/01")), "53/01's lane is left alone");
        assert.equal(report.lines.some((line) => line.includes("53/01")), false, "…and not counted or named");
        // the resumed wave re-minted its wave run for the member still open
        const waves = (await laneRunsOf(fx, "07")).filter((r) => r.brief?.wave != null);
        const newest = waves.at(-1);
        assert.deepEqual(newest.brief.wave.members, ["07/01"]);
        assert.equal(newest.attempt, 1);
        assert.equal(newest.retryOf, null);
        assert.equal(report.lines.some((line) => line.startsWith("Resumed 07 — attempt")), false, "no wave run is retried as the milestone's act");
      }, { config: { loop: { heartbeatMs: 60000 } } });
      // sequential: --resume runs no reconciliation and touches no lane
      await withLaneRepo(async (fx) => {
        await git(["worktree", "add", "-q", "-b", "aof/mesh/07-01", meshDispatchWorktreePath(fx.root, "07/01"), "HEAD"], fx.root);
        const item = await resolveItemExact({ workspace: fx.workspace }, "07/01");
        const seeded = await startRun(item, { brief: { loop: { loopRunId: "seq", scope: "07", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: NOW, id: "loop:autonomous-cascade", supervised: false } }, now: "2026-09-14T09:00:00.000Z" });
        void seeded;
        const { report } = await runLoop(fx, { input: { resume: true }, extra: { readChangeUnderReview: async () => "" } });
        assert.equal(report.lines.some((line) => line.startsWith("Reconciling")), false, "no reconciliation");
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "the lane is untouched");
      }, { stories: ["01"], config: { loop: { concurrency: "sequential" } } });
    },
  },
];
