// Fitness function: acd-lane-records-and-the-declaration (milestone 129 / story 05; FF-12903 and
// FF-12907; ADR-004 and ADR-007) —
//
//   FF-12903  "The tree that commits the change owns the record."
//   FF-12907  "Lanes are children of one declaration."
//
// FF-12903, STRUCTURAL LEG — in `src/loop/**`, every `transitionRunStart` / `transitionRunComplete`
// call made by a function that builds a LANE brief (a `runBrief(…, { …, lane: {…} })`) takes an
// item bound in that same function from a `resolveRefInWorktree(` call — the item AS IT LIVES IN
// THE LANE, never the primary's copy (`startedHere`'s rule: a control-side write of a status the
// worker's tree also writes hands the branch a conflict over one line). `resolveItemExact`, the
// primary's resolver, may appear in `wave.mjs` only inside the wave-run mint (`mintWaveRun`), the
// one primary-tree mint on the build path. FIXTURE LEG — a two-member wave driven through
// `runLoopBody` over `test/support/loop/lane-fixture.mjs` (a REAL git repo, the child and the
// rubric injected): the primary's two story dirs hold NO `runs/` record until the merge lands,
// each lane's story dir holds exactly one record whose `brief.lane.worktree` is that lane, and
// after the merge `readRuns(primaryStory)` returns that same run, `done`.
//
// FF-12907, STRUCTURAL LEG — `src/loop/**` assigns nothing to `brief.loop.scope` or
// `.loopRunId` and passes no `scope:` / `loopRunId:` override into `declarationFor(` or
// `runBrief(`: the declaration is the shell's, passed in WHOLE, so a lane run is a run of this
// loop and never a declaration of its own. FIXTURE LEG — over the same wave, every lane run's
// `brief.loop` deep-equals the wave run's except `cycle`, and `decideSupervisedDeclarations`
// over the milestone plus both stories after the merge yields exactly ONE row, carrying the
// loop's own `loopRunId` — even when every one of the three runs is left dead and resumable, so
// a lane is never a second thing for the supervisor to relaunch.
//
// NON-VACUOUS: each structural leg must FIND its subject (the lane mint's `resolveRefInWorktree(`
// call; the `brief.loop` pass-through into the lane mint) before it judges it, and each fixture
// leg asserts what it FOUND (two lane records; at least one supervisor row) before the claim.
//
// Red probes (VERIFICATION.md's register): mint the lane run against `resolveItemExact(ctx, ref)`
// in place of `resolveRefInWorktree(…)` (FF-12903, both legs); mint a lane run with `scope: ref`
// overriding the wave run's `brief.loop` (FF-12907, both legs).
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedBraceBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FAMILY_DIR = "src/loop";
const WAVE = "src/loop/wave.mjs";
const WAVE_RUN_MINT = "mintWaveRun";

const TRANSITION_RE = /\btransitionRun(?:Start|Complete)\s*\(/gu;
const LANE_BRIEF_RE = /\blane\s*:\s*\{/u;

// Every function declaration in a module (nested included), with its body and its ABSOLUTE span —
// cut on the language's own structure, never by a window. `ownerOf` answers the INNERMOST
// declaration containing an offset, so a call inside `mintWaveRun` is `mintWaveRun`'s and never
// the enclosing `runWaveBuild`'s.
export function declaredFunctions(code) {
  const found = [];
  for (const match of code.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gu)) {
    const name = match[1];
    const header = `function ${name}(`;
    const at = code.indexOf(header, match.index);
    const params = matchedParenSpan(code, at);
    if (params == null) continue;
    const body = matchedBraceBody(code, params.close);
    if (body == null) continue;
    const start = code.indexOf("{", params.close);
    found.push({ name, at, body, start, end: start + body.length + 2 });
  }
  return found;
}

export function ownerOf(fns, offset) {
  return fns.filter((fn) => fn.start <= offset && offset < fn.end).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0] ?? null;
}

// PURE — FF-12903's structural rule over one module's comment-stripped source.
// Answers `{ problems, found }` where `found.laneMints` counts the transition calls owned by a
// lane-brief function and `found.resolves` the `resolveRefInWorktree(` bindings among them.
export function laneRecordOwnershipProblems(rel, code) {
  const problems = [];
  const found = { laneMints: 0, resolves: 0 };
  const fns = declaredFunctions(code);
  // Every transition call, attributed to its INNERMOST function; the rule applies to the
  // functions that build a lane brief.
  const byOwner = new Map();
  for (const match of code.matchAll(TRANSITION_RE)) {
    const owner = ownerOf(fns, match.index);
    if (owner == null || !LANE_BRIEF_RE.test(owner.body)) continue;
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner).push(match);
  }
  for (const [fn, mints] of byOwner) {
    found.laneMints += mints.length;
    // The identifiers this function binds from the lane resolver.
    const bound = new Set();
    for (const match of fn.body.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*await\s+resolveRefInWorktree\s*\(/gu)) bound.add(match[1]);
    found.resolves += bound.size;
    for (const mint of mints) {
      const span = matchedParenSpan(code, mint.index);
      const item = topLevelArguments(span?.body ?? "")[0] ?? "";
      const verb = mint[0].replace(/\s*\($/u, "");
      if (!bound.has(item)) {
        // A function that binds NOTHING from the lane resolver has lost its subject as well as its
        // rule: the finding says both, so a removed call reads as NOT FOUND and a replaced one
        // (`resolveItemExact(ctx, ref)`) as the mint on the wrong item.
        const prefix = bound.size === 0 ? `NOT FOUND — ${fn.name} binds nothing from resolveRefInWorktree(, and ` : "";
        problems.push(`${rel}: ${prefix}${fn.name} calls ${verb}(${item}, …) on a lane brief, but \`${item}\` is not bound from a resolveRefInWorktree( call in that function — the record must be minted on the item as it lives in the LANE, never the primary's copy (129/ADR-004 §1)`);
      }
    }
  }
  return { problems, found };
}

// PURE — `resolveItemExact` in the wave only inside the wave-run mint.
export function primaryResolverProblems(rel, code) {
  const problems = [];
  if (rel !== WAVE) return problems;
  const fns = declaredFunctions(code);
  for (const match of code.matchAll(/\bresolveItemExact\s*\(/gu)) {
    const owner = ownerOf(fns, match.index);
    if (owner?.name !== WAVE_RUN_MINT) {
      problems.push(`${rel}: resolveItemExact( in ${owner?.name ?? "(module scope)"} is outside ${WAVE_RUN_MINT} — the primary's resolver serves the wave run's mint and nothing else on the build path`);
    }
  }
  return problems;
}

// PURE — FF-12907's structural rule: no override of the declaration anywhere in the family.
export function declarationOverrideProblems(rel, code) {
  const problems = [];
  const found = { passThroughs: 0 };
  const fns = declaredFunctions(code);
  for (const match of code.matchAll(/\.loop\.(scope|loopRunId)\s*=(?!=)/gu)) {
    problems.push(`${rel}: assigns brief.loop.${match[1]} — the declaration is passed in whole and never edited (129/ADR-007 §1)`);
  }
  for (const match of code.matchAll(/\b(declarationFor|runBrief)\s*\(/gu)) {
    const span = matchedParenSpan(code, match.index);
    if (span == null) continue;
    const firstArg = topLevelArguments(span.body)[0] ?? "";
    const target = match[1] === "runBrief" ? firstArg : span.body;
    for (const key of ["scope", "loopRunId"]) {
      if (new RegExp(`(?:^|[{,\\s])${key}\\s*:`, "u").test(target)) {
        problems.push(`${rel}: ${match[1]}( carries \`${key}:\` — a lane run overriding brief.loop.${key} would be a declaration of its own, and the supervisor would relaunch it as a second loop (129/ADR-007 §1)`);
      }
    }
    if (match[1] === "runBrief") {
      // THE PASS-THROUGH: the brief's first argument is an identifier bound from declarationFor(
      // IN THE SAME FUNCTION — the lane mint's own binding, never a sibling's.
      const name = firstArg.trim();
      const owner = ownerOf(fns, match.index);
      // Counted for the LANE mint alone — the function that builds a lane brief; the wave run's
      // own pass-through in `mintWaveRun` is not the subject.
      const bound = owner != null && LANE_BRIEF_RE.test(owner.body) && /^[A-Za-z_$][\w$]*$/u.test(name) && new RegExp(`\\b${name}\\s*=\\s*declarationFor\\s*\\(`, "u").test(owner.body);
      if (bound) found.passThroughs += 1;
    }
  }
  if (/\bloop\s*:\s*\{/u.test(code) && !/function runBrief\(/u.test(code)) {
    problems.push(`${rel}: constructs a \`loop: {…}\` object — the loop key is runBrief's own, built from the declaration it is handed`);
  }
  return { problems, found };
}

async function familyUnits() {
  const units = [];
  for (const entry of (await readdir(path.join(repoRoot, FAMILY_DIR), { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.isFile() && entry.name.endsWith(".mjs")) {
      const rel = `${FAMILY_DIR}/${entry.name}`;
      units.push({ rel, code: stripComments(await readFile(path.join(repoRoot, rel), "utf8")) });
    }
  }
  return units;
}

// ── the fixture leg, shared by both controls: one two-member wave, everything injected ──
async function driveTwoMemberWave() {
  const fixture = await import("../../support/loop/lane-fixture.mjs");
  const { runLoopBody } = await import("../../../src/commands/loop.mjs");
  const { readRuns } = await import("../../../src/run-store.mjs");
  const { resolveItemExact } = await import("../../../src/commands/resolve.mjs");
  const { resolveRefInWorktree } = await import("../../../src/work/dispatch.mjs");
  const { meshDispatchWorktreePath } = await import("../../../src/mesh/worktree.mjs");
  return await fixture.withLaneRepo(async (fx) => {
    const seenBeforeMerge = new Map();
    // Each child is HELD (`pause`) until the spawn-time inspection has read both trees, so the
    // lane's record is read while the child runs and not after the settle.
    const gates = new Map([["07/01", fixture.deferred()], ["07/03", fixture.deferred()]]);
    const child = fixture.fakeLaneChild(fx, {
      pause: Object.fromEntries([...gates].map(([ref, gate]) => [ref, gate.promise])),
      onSpawn: async (input) => {
        const primaryItem = await resolveItemExact({ workspace: fx.workspace }, input.ref);
        const laneItem = await resolveRefInWorktree(fx.root, fx.workDir, input.lane, input.ref);
        seenBeforeMerge.set(input.ref, {
          primaryDir: primaryItem.dir,
          primaryRunsDir: existsSync(path.join(primaryItem.dir, "runs")),
          primary: await readRuns(primaryItem),
          lane: laneItem == null ? [] : await readRuns(laneItem),
          laneDir: laneItem?.dir ?? null,
        });
        gates.get(input.ref)?.resolve();
      },
    });
    const driver = fixture.primaryDriver(fx, { onCommand: fixture.verifyCompleter(fx) });
    const ctx = fixture.laneCtx(fx, { child, rubric: fixture.stubRubric(fixture.emits(fixture.passingTap())), driver, report: fixture.collector(), timers: fixture.fakeTimers(), signals: fixture.fakeSignals(), now: "2026-09-14T12:00:00.000Z" });
    const state = await runLoopBody({ scope: fx.milestone, supervised: true }, ctx);
    const members = ["07/01", "07/03"];
    const after = new Map();
    for (const ref of members) after.set(ref, await readRuns(await resolveItemExact({ workspace: fx.workspace }, ref)));
    const milestoneRuns = await readRuns(await resolveItemExact({ workspace: fx.workspace }, fx.milestone));
    return {
      state,
      members,
      childCalls: child.calls,
      seenBeforeMerge,
      after,
      milestoneRuns,
      lanePath: (ref) => meshDispatchWorktreePath(fx.root, ref),
      primaryRoot: fx.root,
      milestone: fx.milestone,
    };
  });
}

export const archTests = [
  {
    name: "arch/129/05 FF-12903 structural leg: every lane-brief mint in src/loop/** takes an item bound from resolveRefInWorktree( in the same function, and resolveItemExact serves the wave-run mint alone",
    run: async () => {
      const units = await familyUnits();
      const wave = units.find((unit) => unit.rel === WAVE);
      assert.ok(wave != null, `${WAVE}: NOT FOUND`);
      let laneMints = 0;
      let resolves = 0;
      const problems = [];
      for (const unit of units) {
        const ownership = laneRecordOwnershipProblems(unit.rel, unit.code);
        laneMints += ownership.found.laneMints;
        resolves += ownership.found.resolves;
        problems.push(...ownership.problems, ...primaryResolverProblems(unit.rel, unit.code));
      }
      assert.ok(laneMints > 0, `${WAVE}: NOT FOUND — no function builds a lane brief and mints on it; the leg is reading the wrong tree`);
      // The problems carry their own NOT FOUND when a lane mint binds nothing from the resolver,
      // naming the mint beside it; the bare guard below is the belt to that brace.
      assert.deepEqual(problems, [], `the tree that commits the change owns the record:\n${problems.join("\n")}`);
      assert.ok(resolves > 0, `${WAVE}: NOT FOUND — the lane mint's resolveRefInWorktree( call is absent; there is no lane item to mint on`);
    },
  },
  {
    name: "arch/129/05 FF-12903 fixture leg: over a real two-member wave the primary's story dirs hold no runs/ record until the merge, each lane holds its own, and the merge brings the same run home done",
    run: async () => {
      const wave = await driveTwoMemberWave();
      // THE SPAWN-TIME OBSERVATIONS FIRST — what each tree held while its child ran is the claim,
      // and it was read before the wave's end state, whatever that end state turned out to be.
      // FOUND before CLAIMED: a spawned member's lane story dir holds exactly one run record.
      assert.ok(wave.seenBeforeMerge.size > 0, "NOT FOUND — no child was spawned; the wave dispatched nothing this leg can judge");
      for (const [ref, seen] of wave.seenBeforeMerge) {
        assert.equal(seen.lane.length, 1, `${ref}: NOT FOUND — the lane's story dir (${seen.laneDir}) holds ${seen.lane.length} run record(s), expected exactly one, while the primary's ${path.join(seen.primaryDir, "runs")}/ holds ${seen.primary.length}`);
      }
      for (const [ref, seen] of wave.seenBeforeMerge) {
        assert.equal(seen.primary.length, 0, `${ref}: ${path.join(seen.primaryDir, "runs")}/ holds ${seen.primary.length} record(s) before the merge — the primary's story dir is written by the merge and by nothing else (129/ADR-004 §1)`);
      }
      assert.equal(wave.state.state, "done", "the wave ran to the build phase's end");
      assert.equal(wave.childCalls.length, 2, "two spawnLaneDrive calls, one per member, and no real child process");
      assert.deepEqual(wave.childCalls.map((call) => call.ref).sort(), [...wave.members], "one per member ref");
      for (const ref of wave.members) {
        const seen = wave.seenBeforeMerge.get(ref);
        assert.ok(seen != null, `${ref}: the child was spawned`);
        assert.equal(seen.primaryRunsDir, false, `${ref}: ${path.join(seen.primaryDir, "runs")}/ does not exist before the merge`);
        const laneRecord = seen.lane[0];
        assert.equal(laneRecord.state, "running", `${ref}: the lane's record is running while the child runs`);
        assert.equal(path.resolve(laneRecord.brief.lane.worktree), path.resolve(wave.lanePath(ref)), `${ref}: brief.lane.worktree is the lane`);
        assert.ok(seen.laneDir != null && path.resolve(seen.laneDir).startsWith(path.resolve(wave.lanePath(ref))), `${ref}: the record was read from the lane's story dir`);
        const home = wave.after.get(ref).find((run) => run.runId === laneRecord.runId);
        assert.ok(home != null, `${ref}: after the merge readRuns(primaryStory) returns the run the lane minted (${laneRecord.runId})`);
        assert.equal(home.state, "done", `${ref}: …settled done`);
        assert.equal(path.resolve(home.brief.lane.worktree), path.resolve(wave.lanePath(ref)), `${ref}: the record that came home still names its lane`);
      }
    },
  },
  {
    name: "arch/129/05 FF-12907 structural leg: src/loop/** assigns nothing to brief.loop.scope or .loopRunId and passes no override into declarationFor( or runBrief( — the declaration travels whole",
    run: async () => {
      const units = await familyUnits();
      const wave = units.find((unit) => unit.rel === WAVE);
      assert.ok(wave != null, `${WAVE}: NOT FOUND`);
      let passThroughs = 0;
      const problems = [];
      for (const unit of units) {
        const overrides = declarationOverrideProblems(unit.rel, unit.code);
        passThroughs += overrides.found.passThroughs;
        problems.push(...overrides.problems);
      }
      const laneMint = declarationOverrideProblems(WAVE, wave.code);
      assert.ok(laneMint.found.passThroughs > 0, `${WAVE}: NOT FOUND — no runBrief( call takes a declaration bound from declarationFor(; the brief.loop pass-through into the lane mint is absent`);
      assert.ok(passThroughs > 0, "the family passes the declaration through at least once");
      assert.deepEqual(problems, [], `lanes are children of one declaration:\n${problems.join("\n")}`);
    },
  },
  {
    name: "arch/129/05 FF-12907 fixture leg: every lane run's brief.loop equals the wave run's except cycle, and decideSupervisedDeclarations over the merged milestone yields exactly one row carrying the loop's id",
    run: async () => {
      const { decideSupervisedDeclarations } = await import("../../../src/work/loop.mjs");
      const { isRunning, isStale, retryReadiness } = await import("../../../src/run-store.mjs");
      const wave = await driveTwoMemberWave();
      assert.equal(wave.state.state, "done");
      const waveRuns = wave.milestoneRuns.filter((run) => run.brief?.wave != null);
      assert.ok(waveRuns.length > 0, `${wave.milestone}: NOT FOUND — no wave run was minted in the primary`);
      const waveRun = waveRuns[0];
      const laneRuns = [];
      for (const ref of wave.members) {
        const laneRun = wave.after.get(ref).find((run) => run.brief?.lane != null);
        assert.ok(laneRun != null, `${ref}: NOT FOUND — no lane run came home`);
        laneRuns.push({ ref, run: laneRun });
        assert.equal(laneRun.brief.loop.scope, waveRun.brief.loop.scope, `${ref}: brief.loop.scope is ${JSON.stringify(laneRun.brief.loop.scope)} — the lane run's scope is the loop's (${JSON.stringify(waveRun.brief.loop.scope)}), never the story ref`);
        assert.equal(laneRun.brief.loop.loopRunId, wave.state.loopRunId, `${ref}: brief.loop.loopRunId is the loop's`);
        assert.deepEqual({ ...laneRun.brief.loop, cycle: waveRun.brief.loop.cycle }, waveRun.brief.loop, `${ref}: brief.loop deep-equals the wave run's except cycle`);
      }

      // THE SUPERVISOR, over the milestone plus both stories after the merge. Every run is left
      // DEAD AND RESUMABLE — running, stale, supervised — so the predicate has every reason to
      // list each of the three, and lists ONE: a scope, not a run, is its unit (129/ADR-007 §1).
      const nowMs = Date.now();
      const at = (offsetMs) => new Date(nowMs + offsetMs).toISOString();
      const dead = (run, ageMs) => ({ ...run, state: "running", outcome: null, createdAt: at(-ageMs), updatedAt: at(-ageMs + 60_000), heartbeatAt: at(-ageMs + 60_000), brief: { ...run.brief, loop: { ...run.brief.loop, supervised: true } } });
      const items = [
        { ref: wave.milestone, runs: [dead(waveRun, 3_600_000)] },
        ...laneRuns.map(({ ref, run }) => ({ ref, runs: [dead(run, 7_200_000)] })),
      ];
      const { rows } = decideSupervisedDeclarations({ workspaces: [{ workspaceId: "w", projectRoot: wave.primaryRoot, items }], maxAttempts: 3, ceilingMs: 43_200_000, stalenessMs: 900_000, now: at(0), isRunning, isStale, retryReadiness });
      assert.ok(rows.length > 0, "NOT FOUND — decideSupervisedDeclarations listed nothing over three dead supervised runs; the predicate is not reading them");
      assert.equal(rows.length, 1, `exactly one declaration row for the loop, never one per lane — got ${rows.length}: ${rows.map((row) => `${row.scope} (${row.loopRunId})`).join(", ")}`);
      assert.equal(rows[0].loopRunId, wave.state.loopRunId, "the row carries the loop's own id");
      assert.equal(rows[0].scope, wave.milestone, "…and the loop's scope");
    },
  },
  {
    name: "arch/129/05 FF-12903 / FF-12907 self-check: each planted defect is caught by the structural detector the real tree is measured by",
    run: async () => {
      const units = await familyUnits();
      const wave = units.find((unit) => unit.rel === WAVE);
      assert.ok(wave != null, `${WAVE}: NOT FOUND`);

      // The lane run minted on the primary's item.
      const primaryMint = wave.code.replace(/laneItem = await resolveRefInWorktree\(primaryRoot, primaryWorkDir, open\.worktree, ref\);/u, "laneItem = await resolveItemExact(ctx, ref);");
      assert.notEqual(primaryMint, wave.code, "the plant applied");
      const planted = laneRecordOwnershipProblems(WAVE, primaryMint);
      assert.ok(planted.problems.some((problem) => problem.includes("transitionRunStart") && problem.includes("resolveRefInWorktree")), `a lane mint on the primary's item is named:\n${planted.problems.join("\n")}`);
      assert.ok(primaryResolverProblems(WAVE, primaryMint).some((problem) => problem.includes("resolveItemExact")), "…and resolveItemExact outside the wave-run mint is named");
      // The lane resolver removed altogether: NOT FOUND, never a green.
      assert.equal(laneRecordOwnershipProblems(WAVE, wave.code.replace(/resolveRefInWorktree\(/gu, "resolveElsewhere(")).found.resolves, 0, "with the resolver gone the leg finds nothing to bind");
      assert.ok(laneRecordOwnershipProblems(WAVE, wave.code).found.laneMints >= 2, "the shipped wave mints on a lane brief at least twice (the fresh mint and the retry)");

      // A lane run minted with its own scope, three spellings.
      const scoped = wave.code.replace(/declarationFor\(\{ \.\.\.resolved, loopRunId, phase: "continue", cycle, startedAt \}\)/u, 'declarationFor({ ...resolved, loopRunId, phase: "continue", cycle, startedAt, scope: ref })');
      assert.notEqual(scoped, wave.code, "the plant applied");
      const scopedProblems = declarationOverrideProblems(WAVE, scoped).problems;
      assert.ok(scopedProblems.some((problem) => problem.includes(WAVE) && problem.includes("brief.loop.scope")), `a scope override in declarationFor( is named:\n${scopedProblems.join("\n")}`);
      const assigned = declarationOverrideProblems(WAVE, `${wave.code}\nexport function plant(brief, ref) { brief.loop.scope = ref; }\n`).problems;
      assert.ok(assigned.some((problem) => problem.includes("brief.loop.scope")), "an assignment to brief.loop.scope is named");
      const spread = declarationOverrideProblems(WAVE, wave.code.replace(/runBrief\(declaration, \{\s*admittedBlockerClaim/u, "runBrief({ ...declaration, loopRunId: ref }, {\n          admittedBlockerClaim")).problems;
      assert.ok(spread.some((problem) => problem.includes("brief.loop.loopRunId")), "a loopRunId override spread into runBrief's declaration is named");
      // The pass-through removed: NOT FOUND.
      assert.equal(declarationOverrideProblems(WAVE, wave.code.replace(/const declaration = declarationFor\(/gu, "const declaration = buildElsewhere(")).found.passThroughs, 0, "with declarationFor( gone there is no pass-through to find");
      assert.deepEqual(declarationOverrideProblems(WAVE, wave.code).problems, [], "the shipped wave carries no override");
    },
  },
];
