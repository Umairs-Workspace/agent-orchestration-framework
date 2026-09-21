// FF-13002 + FF-13004 — THE INTERRUPT PATH ALWAYS SETTLES, AND A HONOURED DECLARATION YIELDS NO
// ROW (milestone 130 / story 05; ARCHITECTURE `## Fitness functions`, ADR-003 and ADR-004 §4).
// Which of this directory's three subjects: the LADDER — what the shell does after a drive returns
// under an interrupt, and what the declarations engine answers for a loop the operator stopped.
//
// FF-13002, structural. For every drive site the binding it assigns reaches a `settleDriven(` call
// before any `return` in the enclosing function — the enclosing-function textual rule FF-12702
// uses, through `classifySites` — and there are EXACTLY THREE drive sites, counted as FF-12602
// counts them: the main site in `src/commands/loop.mjs`, the in-process retry and the cross to
// verify in `src/loop/cycle.mjs` (129/04 moved the ladder there after the register was written on
// 2026-09-13; the register's "in `src/commands/loop.mjs`" is enforced over the family the cited
// control sweeps, so the count it states can hold). Every `haltDecision("operator-interrupt"` in
// the shell receives a producer bound from `source.producer()` — the third argument, cut by
// matching parens and split at depth-0 commas, never a message match.
//
// FF-13002, fixture. `runLoopBody` driven with an injected `stopSource`: (a) raised to level 2
// during the drive, the fake driver honouring `signal` with `{ failed, cancelled }` — the record
// is `cancelled` with `failureReason: null`, the `driven` row's outcome is `"cancelled"`, the halt
// is `operator-interrupt` with producer `stop-request` and `Details` `cancelled=<runId>`, the
// request file reads `honoured`, and NO run in the fixture is `running` (20/ADR-006 — the leaked
// row that walls the next mint); (b) raised to level 1 between drives — the drive settles `done`,
// the halt names the request; (c) `runLoopBody({ resume: true })` over a standing request clears
// the file and narrates `Cleared stop request` exactly once.
//
// FF-13004, engine fixture. `decideSupervisedDeclarations` over one supervised lineage whose
// latest run is `failed/timeout` (retryable) answers one row; the same input plus `stopped: new
// Set([loopRunId])` answers none; `stopped: new Set()` and no `stopped` at all answer deep-equal
// rows (the DEFAULT-ABSENT discipline); `src/work/loop.mjs` has zero import statements (cited:
// `acd-clock-counts-attempts`). Producer fixture: `supervisedDeclarations` over a fixture home
// holding a `honoured` request for that `loopRunId` answers no row, and a `requested` one still
// answers the row. Structural: `src/mesh/declarations.mjs` imports `readStopRequest` from
// `src/loop/stop-request.mjs` (resolved, through module-family.mjs) and passes `stopped` to the
// engine — the argument the register's red probe drops.
//
// The fixture legs ride the loop fixture and the stop-source double `test/loop/loop-command-probe`
// exports (130/02's, the shape ADR-001 §5 fixes); the producer fixture mirrors
// `test/loop/work-loop-declarations`'s on-disk workspace. Every cut is structural
// (`test/support/source-slice.mjs`); every sweep reports what it read.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLoopBody } from "../../../src/commands/loop.mjs";
import { decideSupervisedDeclarations } from "../../../src/work/loop.mjs";
import { supervisedDeclarations } from "../../../src/mesh/declarations.mjs";
import { isRunning, isStale, readRuns, retryReadiness } from "../../../src/run-store.mjs";
import { loadWorkspace, listItems } from "../../../src/work.mjs";
import {
  clearStopRequest,
  loopStopsDir,
  markStopHonoured,
  requestLoopStop,
  stopRequestPath,
} from "../../../src/loop/stop-request.mjs";
import { importSpecifiers, computedDynamicImports } from "../../support/module-family.mjs";
import { NESTED_FUNCTION_DECLARATION_RE, classifySites, functionBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";
import {
  DECLARATION_L1,
  cancellableDriver,
  completingDriver,
  fakeStopSource,
  loopFixture,
  resetLoopStops,
  runCollected,
  writeDeclarationRun,
} from "../../loop/loop-command-probe.test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SHELL = "src/commands/loop.mjs";
const LADDER = "src/loop/cycle.mjs";
const ENGINE = "src/work/loop.mjs";
const PRODUCER = "src/mesh/declarations.mjs";
const HOME = "src/loop/stop-request.mjs";
// THE DRIVE SITES, as FF-12602 counts them: `await drivePhase(` in either file, and the ladder's
// `await drive(retried.record)` seam (the shell hands it `drivePhase`, the wave a child spawn).
// The binding each assigns is what must reach `settleDriven(`.
const DRIVE_SITE_RE = /\b(\w+)\s*=\s*await\s+(?:drivePhase\s*\(|drive\s*\(\s*retried\.record\s*\))/u;
const EXPECTED_DRIVE_SITES = 3;
const NOW = "2026-09-13T12:00:00.000Z";

async function source(rel) {
  return stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
}

function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

function resolved(fromRel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return specifier;
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
  return joined.endsWith(".mjs") ? joined : `${joined}.mjs`;
}

// EVERY DRIVE SITE in `code`, each with the function that owns it (FF-12702's enclosing-function
// rule through `classifySites` — the owner is the nearest declaration above the site) and the
// settle it must reach: `<binding> = await settleDriven(<binding>` inside that owner's body, with
// no `return` between the drive and the settle. PURE over `{ rel, code }`, so the non-vacuity probe
// (the needle misspelled) is shown to answer zero sites rather than assumed to.
export function driveSiteProblems(units, { siteRe = DRIVE_SITE_RE } = {}) {
  const problems = [];
  let sites = 0;
  for (const { rel, code } of units) {
    for (const site of classifySites(code, { siteRe, guardRe: /$^/u, declarationRe: NESTED_FUNCTION_DECLARATION_RE })) {
      sites += 1;
      const binding = siteRe.exec(site.text)?.[1] ?? null;
      const label = `${rel}:${site.line} (${site.fn}) \`${site.text.trim()}\``;
      if (binding == null) { problems.push(`${label}: the drive assigns no binding`); continue; }
      const body = functionBody(code, `function ${site.fn}(`);
      if (body == null) { problems.push(`${label}: the enclosing function ${site.fn} could not be cut`); continue; }
      const driveAt = body.indexOf(site.text);
      if (driveAt < 0) { problems.push(`${label}: the site was not found inside ${site.fn}'s body`); continue; }
      const after = body.slice(driveAt + site.text.length);
      const settleAt = after.indexOf(`${binding} = await settleDriven(${binding}`);
      if (settleAt < 0) {
        problems.push(`${label}: the binding ${binding} never reaches a settleDriven( call before any return in the enclosing block — ${binding} = await settleDriven(${binding} is absent from ${site.fn}`);
        continue;
      }
      const between = after.slice(0, settleAt);
      if (/\breturn\b/u.test(between)) {
        problems.push(`${label}: the binding ${binding} must reach a settleDriven( call before any return in the enclosing block (the FF-12702 enclosing-function rule) — a return stands between the drive and its settle in ${site.fn}: \`${between.trim().split("\n").find((line) => /\breturn\b/u.test(line))?.trim()}\``);
      }
    }
  }
  return { sites, problems };
}

// EVERY `haltDecision("operator-interrupt"` call in `code`, with its third argument — the
// producer — cut by matching parens and split at depth-0 commas.
export function interruptProducers(code) {
  const found = [];
  for (const match of code.matchAll(/\bhaltDecision\s*\(\s*"operator-interrupt"/gu)) {
    const span = matchedParenSpan(code, match.index);
    if (span == null) { found.push({ producer: null }); continue; }
    const args = topLevelArguments(span.body);
    found.push({ producer: args[2] ?? null, call: `haltDecision(${span.body.trim()})` });
  }
  return found;
}

// ── FF-13004's engine fixture — the literal run records `test/loop/work-loop-declarations` drives.
const loop = (over = {}) => ({
  loopRunId: "lr-1", scope: "53", level: "L2", cap: 3,
  phase: "continue", cycle: 1, startedAt: "2026-09-08T10:00:00.000Z",
  id: "loop:autonomous-cascade", supervised: true, ...over,
});
const failedTimeout = (over = {}) => ({
  runId: "run-1", retryOf: null, state: "failed", attempt: 1, failureReason: "timeout", resumeAfter: null,
  reclaimedAt: null, createdAt: "2026-09-08T11:00:00.000Z", heartbeatAt: null,
  updatedAt: "2026-09-08T11:05:00.000Z", brief: { loop: loop() }, ...over,
});
function askEngine(runs, extra = {}) {
  return decideSupervisedDeclarations({
    workspaces: [{ workspaceId: "ws-1", projectRoot: "C:/repo", items: [{ ref: "53", runs }] }],
    maxAttempts: 3,
    ceilingMs: 7_200_000,
    stalenessMs: 900_000,
    now: "2026-09-08T12:00:00.000Z",
    isRunning,
    isStale,
    retryReadiness,
    ...extra,
  });
}

// ── FF-13004's producer fixture — one workspace on disk holding milestone 53 with one reclaimed
// run record (a listed row), read through the REAL producer under the isolated home.
const PRODUCER_NOW = "2026-09-08T12:00:00.000Z";
async function makeProducerWorkspace(root, name = "repo-a", { nodeId = "node-1" } = {}) {
  const dir = path.join(root, name);
  const itemDir = path.join(dir, "wiki", "work", "53_milestone_fixture");
  await mkdir(path.join(itemDir, "runs"), { recursive: true });
  await mkdir(path.join(dir, ".aof"), { recursive: true });
  await writeFile(path.join(itemDir, "SPEC.md"), `---
type: milestone
number: 53
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
  const record = {
    runId: "run-1", itemRef: "53", retryOf: null, state: "failed", attempt: 1,
    failureReason: "runtime_offline", resumeAfter: null,
    reclaimedAt: "2026-09-08T11:30:00.000Z",
    createdAt: "2026-09-08T11:00:00.000Z",
    heartbeatAt: "2026-09-08T11:20:00.000Z",
    updatedAt: "2026-09-08T11:30:00.000Z",
    brief: { loop: loop() },
  };
  await writeFile(path.join(itemDir, "runs", "run-1.json"), JSON.stringify(record, null, 2));
  await writeFile(path.join(dir, ".aof", "aof.config.json"), JSON.stringify({
    name, work: { dir: "wiki/work" }, mesh: { nodeId, workspaceId: `ws-${name}` },
  }, null, 2));
  return dir;
}

export const archTests = [
  {
    name: "arch/130 FF-13002 (acd-loop-stop-settles-the-run): structural — every drive binding reaches settleDriven( before any return in its enclosing function, and there are exactly three drive sites",
    run: async () => {
      const units = [{ rel: SHELL, code: await source(SHELL) }, { rel: LADDER, code: await source(LADDER) }];
      assertRead("the shell and the ladder", units.reduce((sum, unit) => sum + unit.code.length, 0), 10_000, "bytes");
      const { sites, problems } = driveSiteProblems(units);
      assert.equal(sites, EXPECTED_DRIVE_SITES, `there are exactly three drive sites — the main site (shell), the in-process retry and the cross to verify (both in the ladder, FF-12602 cited): ${sites} found. A sweep that finds fewer is reading the wrong needle, not a cleaner tree`);
      assert.deepEqual(problems, [], `for every await drivePhase( site the assigned binding reaches a settleDriven( call before any return in the enclosing block (ADR-003 §3):\n  - ${problems.join("\n  - ")}`);

      // SELF-CHECK — the detector reds on the `:1833` shape the register's red probe re-inserts
      // (an early return between the drive and its settle), and on a drive that is never settled.
      const early = [{ rel: "planted.mjs", code: "async function body() {\n  let phaseRun = await drivePhase({ ref }, ctx);\n  if (interrupted) return state;\n  phaseRun = await settleDriven(phaseRun, ctx);\n}\n" }];
      const earlyAnswer = driveSiteProblems(early);
      assert.equal(earlyAnswer.sites, 1, "self-check: the planted site is found");
      assert.equal(earlyAnswer.problems.length, 1, "self-check: the early return between the drive and its settle is reported");
      assert.match(earlyAnswer.problems[0], /before any return in the enclosing block/u);
      const unsettled = driveSiteProblems([{ rel: "planted.mjs", code: "async function body() {\n  let phaseRun = await drivePhase({ ref }, ctx);\n  driven.push(phaseRun);\n}\n" }]);
      assert.equal(unsettled.problems.length, 1, "self-check: a drive that never settles is reported");
      const clean = driveSiteProblems([{ rel: "planted.mjs", code: "async function body() {\n  let phaseRun = await drivePhase({ ref }, ctx);\n  phaseRun = await settleDriven(phaseRun, ctx);\n  if (interrupted) return state;\n}\n" }]);
      assert.deepEqual(clean.problems, [], "self-check: settle-then-return is the clean shape");
    },
  },
  {
    name: "arch/130 FF-13002 (acd-loop-stop-settles-the-run): structural — every haltDecision(\"operator-interrupt\" in the shell receives a producer bound from source.producer(), never a message match",
    run: async () => {
      const shell = await source(SHELL);
      const producers = interruptProducers(shell);
      assertRead("the operator-interrupt sweep of the shell", producers.length, 1, "halt site(s)");
      for (const { producer, call } of producers) {
        assert.equal(producer, "source.producer()", `every haltDecision("operator-interrupt" receives a producer bound from source.producer() (ADR-003 §5) — found: ${call}`);
      }
      assert.doesNotMatch(shell, /message\s*\.\s*(?:includes|match|indexOf|search|startsWith|endsWith)\s*\(/u, "stop attribution never matches rendered prose (FF-5304 cited)");
      assert.deepEqual(interruptProducers('haltDecision("operator-interrupt", ref, interrupted)').map((p) => p.producer), ["interrupted"], "self-check: a flag-bound producer is seen and named");
    },
  },
  {
    name: "arch/130 FF-13002 (acd-loop-stop-settles-the-run): fixture (a) — raised to level 2 during the drive, the record settles cancelled with no reason, the driven row says so, the halt names the run, the request reads honoured, and no run is left running",
    run: async () => {
      await resetLoopStops();
      const fx = await loopFixture();
      try {
        // A prior `verify` run carrying the declaration pins `loopRunId` to L1, so the request
        // can be keyed by it before the loop mints its first drive (130/02 task 04's recipe).
        await writeDeclarationRun(fx, { declaration: { ...DECLARATION_L1, phase: "verify" }, state: "done", at: "2026-09-13T11:00:00.000Z" });
        const dir = loopStopsDir();
        const source = fakeStopSource({ reads: { dir, loopRunId: "L1" } });
        const request = async () => {
          for (let rung = 0; rung < 2; rung += 1) await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: null, by: { node: "umamis-msi", pid: 4242 }, now: () => new Date("2026-09-13T11:59:00.000Z") });
          source.raise(2, "stop-request");
        };
        const driver = cancellableDriver(fx, { script: ["hold"], async onCommand(command, n) { if (n === 1) await request(); } });
        const { state, last } = await runCollected({ scope: "03", resume: true, now: NOW }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        assert.equal(driver.spawnCalls.length, 1, "one drive was spawned");
        assert.equal(state.loopRunId, "L1");
        assert.deepEqual(state.act, { act: "halt", stop: "operator-interrupt", ref: "03/01", producer: "stop-request" }, `the halt is operator-interrupt with producer stop-request: ${last}`);
        const runs = await readRuns({ ref: "03/01", dir: fx.storyDir });
        const cancelled = runs.filter((run) => run.brief?.loop?.phase === "continue");
        assert.equal(cancelled.length, 1, "exactly one continue drive was minted");
        assert.equal(cancelled[0].state, "cancelled", "the record is cancelled");
        assert.equal(cancelled[0].failureReason, null, "…with failureReason: null");
        assert.deepEqual(state.driven, [{ ref: "03/01", phase: "continue", runId: cancelled[0].runId, outcome: "cancelled", attempt: 1, cycle: 1 }], "the driven row's outcome is \"cancelled\"");
        assert.ok(last.endsWith(`Details: signal=stop-request; level=2; request=${stopRequestPath(dir, "L1")}; by=umamis-msi:4242; cancelled=${cancelled[0].runId}.`), `Details names the request and cancelled=<runId>: ${last}`);
        const file = JSON.parse(await readFile(stopRequestPath(dir, "L1"), "utf8"));
        assert.equal(file.state, "honoured", "the request file reads honoured");
        assert.equal(file.cancelled, cancelled[0].runId, "…naming the run it cancelled");
        assert.equal(file.level, 2);
        // NO RUN IN THE FIXTURE IS RUNNING — across every item, not just the driven one.
        const everyRun = [];
        for (const item of await listItems(fx.workDir)) everyRun.push(...await readRuns(item));
        assertRead("the fixture's run records", everyRun.length, 2, "run(s)");
        assert.deepEqual(everyRun.filter((run) => run.state === "running").map((run) => run.runId), [], "NO run in the fixture is running — the leaked row 20/ADR-006 names is exactly what a dropped settle leaves");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "arch/130 FF-13002 (acd-loop-stop-settles-the-run): fixture (b) + (c) — raised to level 1 between drives the drive settles done and the halt names the request; a resume over a standing request clears the file and narrates Cleared stop request exactly once",
    run: async () => {
      // (b) — level 1 raised at the POST-DRIVE poll (the second poll: tick head, then after the
      // drive), so the drive has already ended on its own and settles as it ended.
      await resetLoopStops();
      const fx = await loopFixture();
      try {
        await writeDeclarationRun(fx, { declaration: { ...DECLARATION_L1, phase: "verify" }, state: "done", at: "2026-09-13T11:00:00.000Z" });
        const dir = loopStopsDir();
        const source = fakeStopSource({ reads: { dir, loopRunId: "L1" } });
        source.onPoll = async (n) => {
          if (n !== 2) return;
          await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: null, by: { node: "umamis-msi", pid: 4242 }, now: () => new Date("2026-09-13T11:59:00.000Z") });
          source.raise(1, "stop-request");
        };
        const driver = cancellableDriver(fx, { script: [{ outcome: "done" }] });
        const { state, last } = await runCollected({ scope: "03", resume: true, now: NOW }, { ...fx.ctx, agentSessionDriverOptions: driver.options, stopSource: source });
        assert.equal(driver.spawnCalls.length, 1, "one drive, and no second — the level stops dispatch");
        const runs = (await readRuns({ ref: "03/01", dir: fx.storyDir })).filter((run) => run.brief?.loop?.phase === "continue");
        assert.equal(runs.length, 1);
        assert.equal(runs[0].state, "done", "the drive settles done — as it ended");
        assert.equal(runs[0].failureReason, null);
        assert.deepEqual(state.act, { act: "halt", stop: "operator-interrupt", ref: "03/01", producer: "stop-request" }, last);
        assert.deepEqual(state.driven.map((row) => [row.phase, row.outcome]), [["continue", "done"]]);
        assert.ok(last.includes(`request=${stopRequestPath(dir, "L1")}`), `the halt names the request: ${last}`);
        assert.doesNotMatch(last, /cancelled=/u, "…and cancelled nothing");
        const file = JSON.parse(await readFile(stopRequestPath(dir, "L1"), "utf8"));
        assert.equal(file.state, "honoured");
        assert.equal(file.cancelled, null);
        assert.equal(file.level, 1);
      } finally {
        await fx.cleanup();
      }

      // (c) — a standing request (whatever its state) is cleared by --resume, said once.
      for (const standing of ["requested", "honoured"]) {
        await resetLoopStops();
        const rx = await loopFixture();
        try {
          await writeDeclarationRun(rx, { declaration: { ...DECLARATION_L1, phase: "verify" }, state: "done", at: "2026-09-13T11:00:00.000Z" });
          const dir = loopStopsDir();
          await requestLoopStop(dir, { loopRunId: "L1", scope: "03", workspaceId: null, by: { node: "umamis-msi", pid: 4242 }, now: () => new Date("2026-09-13T11:59:00.000Z") });
          if (standing === "honoured") await markStopHonoured(dir, "L1", { now: () => new Date("2026-09-13T11:59:30.000Z") });
          assert.ok(existsSync(stopRequestPath(dir, "L1")), "guard: the request stands before the resume");
          const fake = completingDriver(rx);
          const { lines } = await runCollected({ scope: "03", resume: true, now: NOW }, { ...rx.ctx, agentSessionDriverOptions: fake.options });
          assert.equal(existsSync(stopRequestPath(dir, "L1")), false, `${standing}: runLoopBody({ resume: true }) over a standing request clears the file`);
          const cleared = lines.filter((line) => line.startsWith("Cleared stop request"));
          assert.equal(cleared.length, 1, `${standing}: …and narrates Cleared stop request exactly once: ${JSON.stringify(cleared)}`);
          assert.equal(cleared[0], `Cleared stop request for L1 (${standing}, level 1) — resumed.`);
        } finally {
          await rx.cleanup();
        }
      }
    },
  },
  {
    name: "arch/130 FF-13004 (acd-loop-stop-settles-the-run): engine fixture — a retryable lineage answers one row, the same input plus stopped: new Set([loopRunId]) answers none, and an empty or absent stopped answer deep-equal rows",
    run: () => {
      const runs = [failedTimeout()];
      const listed = askEngine(runs);
      assert.equal(listed.rows.length, 1, "one supervised lineage whose latest run is failed/timeout answers one row");
      assert.equal(listed.rows[0].loopRunId, "lr-1");
      assert.deepEqual(askEngine(runs, { stopped: new Set(["lr-1"]) }).rows, [], "a honoured request for that loopRunId answers no row — the same input plus stopped: new Set([loopRunId]) drops it (ADR-004 §4)");
      assert.deepEqual(askEngine(runs, { stopped: new Set() }), askEngine(runs), "stopped: new Set() and no stopped at all answer deep-equal rows — the default-absent discipline");
      assert.deepEqual(askEngine(runs, { stopped: new Set(["lr-2"]) }).rows, listed.rows, "another id's mark drops nothing");
    },
  },
  {
    name: "arch/130 FF-13004 (acd-loop-stop-settles-the-run): producer fixture — a honoured request for the loopRunId answers no row, and a requested one still answers the row",
    run: async () => {
      await resetLoopStops();
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-arch-130-producer-"));
      try {
        const dir = await makeProducerWorkspace(root);
        const ws = await loadWorkspace(dir, undefined, { env: process.env });
        const ask = async () => supervisedDeclarations(ws, "node-1", PRODUCER_NOW, { globalWorkStoreOptions: { env: process.env } });
        const stops = loopStopsDir();
        const listed = await ask();
        assert.equal(listed.ok, true, "the producer answered");
        assert.equal(listed.rows.length, 1, "guard: with no request the lineage is listed");
        assert.equal(listed.rows[0].id, "lr-1");

        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        const requested = await ask();
        assert.equal(requested.rows.length, 1, "a requested one still answers the row — a draining loop keeps its row");

        await markStopHonoured(stops, "lr-1");
        const honoured = await ask();
        assert.equal(honoured.ok, true);
        assert.deepEqual([...honoured.rows], [], "a honoured request for that loopRunId answers no row — the producer reads the mark through the one module and the engine drops it (ADR-004 §4-§5)");
        await clearStopRequest(stops, "lr-1");
        assert.equal((await ask()).rows.length, 1, "…and --resume's clear brings the row back");
      } finally {
        await rm(root, { recursive: true, force: true });
        await resetLoopStops();
      }
    },
  },
  {
    name: "arch/130 FF-13004 (acd-loop-stop-settles-the-run): structural — the producer imports readStopRequest from the one home by resolved specifier and passes stopped to the engine, and the engine imports nothing",
    run: async () => {
      const producer = await source(PRODUCER);
      const imports = importSpecifiers(producer);
      assertRead("the producer's import clauses", imports.length, 3, "specifier(s)");
      assert.ok(imports.some(({ specifier }) => resolved(PRODUCER, specifier) === HOME), `src/mesh/declarations.mjs imports readStopRequest from src/loop/stop-request.mjs (resolved) — specifiers: ${imports.map((entry) => entry.specifier).join(", ")}`);
      assert.match(producer, /\breadStopRequest\s*\(/u, "…and calls it");
      const callAt = producer.indexOf("decideSupervisedDeclarations(");
      assert.ok(callAt >= 0, `NOT FOUND: ${PRODUCER} — the engine call`);
      const span = matchedParenSpan(producer, callAt);
      assert.ok(span != null, "the engine call's arguments were cut structurally");
      const [input] = topLevelArguments(span.body);
      assert.match(input ?? "", /\bstopped\s*:/u, `the producer passes stopped to the engine — the honoured marks ride decideSupervisedDeclarations's input (ADR-004 §4); the call reads: decideSupervisedDeclarations(${span.body.trim().split("\n").map((line) => line.trim()).join(" ")})`);

      // THE ENGINE IMPORTS NOTHING (cited: acd-clock-counts-attempts keeps its zero).
      const engine = await source(ENGINE);
      assertRead("the engine", engine.length, 10_000, "bytes");
      assert.deepEqual(importSpecifiers(engine), [], "src/work/loop.mjs has zero import statements — Set is a global, and the stopped input adds no dependency");
      assert.deepEqual(computedDynamicImports(engine), [], "…and no computed dynamic import either");
      assert.match(engine, /stopped instanceof Set \? stopped : EMPTY_STOPPED/u, "the default-absent discipline is spelled once: an absent or ill-typed input drops nothing");
    },
  },
];
