import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, functionBody } from "../../support/source-slice.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { assertFamilyPurity, importSpecifiers } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const driverPath = path.join(root, "src", "agent-session-driver.mjs");
const sinkPath = path.join(root, "src", "mesh", "worker-execution.mjs");
const MOVED = Object.freeze([
  "NEEDS_INPUT_SENTINEL", "NEEDS_INPUT_INSTRUCTION", "DIRECTIVE_COMPLETE_SENTINEL",
  "DIRECTIVE_COMPLETE_INSTRUCTION", "WORKER_SESSION_INSTRUCTION", "COMPLETION_IDLE_MS",
  "DECLARED_COMPLETION_IDLE_MS", "HUMAN_INPUT_TOOL_NAMES", "INTERACTIVE_COMMAND_READY_DELAY_MS",
  "defaultWatchTranscriptSessionId", "defaultWatchTranscriptCompletion", "defaultPtySpawn",
  "resolveInteractiveDriverLaunch", "driveInteractiveClaudeSession", "buildDriverCommand",
  "defaultSpawnRuntime", "ensureWorktreeTrusted",
]);
// 63/03 RAISES THIS ONCE, from 2377, and it is an ADR decision rather than a diff:
// 63/ADR-006 §3 admits exactly ONE additive read in this sink (the directive's `launch`
// field) and 63/ADR-012 §3 places the caller-side obligation to compose the unattended
// launch HERE, because the launch seam may import no compiler (its own direct-import set
// and export set are frozen by the two controls this very file and its mesh-blind sibling
// hold). +85 lines, measured: the read, the composer, its two coded refusals and the one
// spread into the spawn options. 63/ADR-009 §5 names this file a 54-dependent god-node and
// routes it to its own TECH_DEBT entry — a ratchet that only ever moves up is exactly the
// evidence that entry exists to carry, so the number moves here and the reason is written
// down rather than the control being softened.
//
// 63/06 RAISES IT AGAIN, from 2462 to 2482, and again as an ADR decision (63/ADR-016 §1):
// ADR-013 §1 routes the premature-done fix to the CALLER — the one component that knows the
// launch kind — and this sink is that caller, so the twenty lines are the smallest place the
// fix can live. Measured: `loopShapedTranscriptWatch` and its pointer comment, the one
// `loopWatch` binding, and the two forwards ADR-013 §3a relaxes. The prose that would
// otherwise have doubled it lives in ADR-016 instead, which is TECH_DEBT item 84's rule
// applied to this file rather than to the registry. NO HEADROOM is taken: the ceiling is the
// measured count, so the next line still has to come here and be argued for.
//
// 119/04 LOWERS IT, from 2482 to 1957, and lowering is always admitted by a shrink-only ratchet —
// no ADR is owed for a fall, which is the whole asymmetry the instrument is built on. Item 83's
// seams 2 and 1 left this sink for `mesh/worker-launch.mjs` and `mesh/worker-repo-admission.mjs`:
// launch composition, the marker/membership join, clone-on-miss with its three source tiers, the
// askpass shim, the redaction and the scoped-checkout seam. 632 lines of block by the contract's own
// `sed`/`wc` counts, against a NET fall of 525 — the difference is the pointer comments and the six
// inward imports that stayed, which is what a subtraction looks like when it leaves a signpost. The
// exported surface did not move — FF-11907 below asserts it identical in both directions — so none
// of the 56 dependents is in that diff.
//
// 129/03 LOWERS IT AGAIN, from 1957 to 1914 (129/ADR-008 §4, item 83's seam 3 — one verb of it).
// `commitWorktreeChanges` left for `mesh/worktree.mjs`, the home m43/ADR-008 named for every git
// verb, and `resolveRefInWorktree` with its `worktreeWorkDir` helper left for `work/dispatch.mjs`,
// the lane's home; both ride re-exports so the frozen surface below did not move (FF-11907 asserts
// it identical in both directions). Fifty-two lines of definition left by the contract's own count,
// against a NET fall of 43 — the difference is the two pointer comments and the two inward imports
// that stayed, the signpost a subtraction leaves. A fall owes no ADR; the number is recorded so the
// next mover can reproduce it.
//
// MEASURED, never estimated:
//   wc -l src/mesh/worker-execution.mjs
// and the value below IS that number, with no headroom, so the next line still has to come here and
// be argued for. SINK_FLOOR is untouched: it is the leg that proves the file was really read, and
// lowering it to accommodate a larger cut would turn this ratchet's one non-vacuity check into
// decoration.
const SINK_CEILING = 1914;
const SINK_FLOOR = 1500;

function setDelta(actual, expected) {
  return {
    extra: actual.filter((name) => !expected.includes(name)),
    missing: expected.filter((name) => !actual.includes(name)),
  };
}


// ── 119/04 · FF-11907 — THE SPLIT SUBTRACTS ───────────────────────────────────────────────
//
// Item 83's seams 2 and 1 left this sink for siblings of its own family. A contract that only
// asserted "the new modules exist" would pass on a copy-paste, which is this refactor's real
// failure mode — so the subtraction is asserted as an ABSENT DEFINITION paired with a PRESENT
// RE-EXPORT, per symbol, which is the idiom this very file already runs at the seventeen driver
// names above. Asserting the NAME absent would forbid the re-export that keeps the dependents
// untouched; asserting only the export COUNT would let an extra name in, which this file has said
// since 53/00 is as much a defect as a missing one.

// The sink's exported surface, measured BEFORE the split and frozen here:
//   node -e 'import("./src/mesh/worker-execution.mjs").then((m) => console.log(Object.keys(m).sort().join("\n")))'
// (42 names, 2026-09-07, at c5139669 — the commit before this story's first edit.)
//
// This is the one STORED DECISION in this file rather than a derived fact, and it has to be
// (ADR-003 §1 admits exactly that trade): after the split the pre-split surface is no longer
// readable from the tree, and it is precisely the claim that makes 56 dependents untouched by
// construction rather than by inspection.
const SINK_SURFACE = Object.freeze([
  "ASSIGNMENT_LOOP_LAUNCH_SCOPELESS", "ASSIGNMENT_LOOP_LAUNCH_UNDECLARED", "COMPLETION_IDLE_MS",
  "DECLARED_COMPLETION_IDLE_MS", "DIRECTIVE_COMPLETE_INSTRUCTION", "DIRECTIVE_COMPLETE_SENTINEL",
  "HUMAN_INPUT_TOOL_NAMES", "INTERACTIVE_COMMAND_READY_DELAY_MS", "NEEDS_INPUT_INSTRUCTION",
  "NEEDS_INPUT_SENTINEL", "WORKER_SESSION_INSTRUCTION", "buildAskpassShim", "buildDriverCommand",
  "checkoutRootForWorktree", "clearActiveWorktree", "cloneRepoForWorkspace", "commitWorktreeChanges",
  "createMeshRecoveryPushHandler", "createMeshWorkerExecutionHandler",
  "createMeshWorkerTerminalInputHandler", "createMeshWorkerTerminalResumeHandler",
  "createMeshWorkerWithdrawHandler", "defaultPtySpawn", "defaultSpawnRuntime",
  "defaultWatchTranscriptCompletion", "defaultWatchTranscriptSessionId",
  "driveInteractiveClaudeSession", "ensureWorktreeTrusted", "isUnderMeshCheckoutsRoot",
  "listActiveWorktrees", "listStrandedWorktreeAssignments", "meshCheckoutPath", "meshCheckoutsRoot",
  "parseRepoFromCloneUrl", "pinWorkspaceIdInCheckout", "pushWorktreeBranch", "registerActiveWorktree",
  "resolveCloneUrl", "resolveInteractiveDriverLaunch", "resolveRefInWorktree",
  "settleStrandedRunRecords", "workerHasRepo",
]);

// The two modules item 83's seams became. WHICH files are this split's children is a decision;
// WHAT each of them extracted is derived from the child's own body, never retyped here.
const EXTRACTED_HOMES = Object.freeze([
  "src/mesh/worker-launch.mjs",
  "src/mesh/worker-repo-admission.mjs",
]);

// The floor under that derived set (ADR-003 §1 again: store a decision, derive a fact). The
// derivation is what keeps the absence check honest as the split grows; this floor is what stops a
// child that extracted nothing — or a derivation that quietly stopped finding anything — from
// passing over an empty set. It names the seam symbols the contract names, and no more.
const SEAM_SYMBOLS = Object.freeze([
  "composeDirectiveLaunchOptions", "ASSIGNMENT_LOOP_LAUNCH_UNDECLARED", "ASSIGNMENT_LOOP_LAUNCH_SCOPELESS",
  "workerHasRepo", "resolveCloneUrl", "parseRepoFromCloneUrl", "pinWorkspaceIdInCheckout",
  "meshCheckoutPath", "cloneRepoForWorkspace",
]);

// The value SINK_CEILING replaced, kept so the shrink-only leg is a comparison rather than a
// promise. 2482 was 63/06's raise; 1957 is what the two seams left behind.
const SINK_CEILING_BEFORE_SPLIT = 2482;

const SINK_REL = "src/mesh/worker-execution.mjs";

function definitionPattern(name) {
  return new RegExp(`(?:export\\s+)?(?:async\\s+)?(?:function|const|let|class)\\s+${name}\\b`, "u");
}

// topLevelDefinitions(source) — every name a module defines at column zero. Deliberately anchored:
// a nested `const` inside a function body is not this module's contribution to the split.
function topLevelDefinitions(source) {
  return [...source.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gmu)].map((match) => match[1]);
}

// reachesFrom(rel) — the transitive set of repo-relative module paths a file reaches through
// relative specifiers. "and none reaches it through a third module" is a claim about the CLOSURE,
// not about one line, so it is walked rather than grepped.
//
// The specifiers come from `test/support/module-family.mjs` — 119/ADR-002's ONE HOME for "what does
// this module depend on?", and FF-11901 asserts as a class that no control under `test/arch/**`
// spells an extractor of its own. This leg is the tenth guard that rule was written for, and it
// obeys it rather than re-deriving `from "…"` a tenth time.
function reachesFrom(rel, readRel) {
  const seen = new Set();
  const queue = [rel];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const { specifier } of importSpecifiers(readRel(current) ?? "")) {
      if (!specifier.startsWith(".")) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(current), specifier));
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }
  return seen;
}

// ── the detectors, as functions, so every red probe below drives the SAME code the real tree does ──

function absentDefinitionProblems(parentSource, extracted) {
  const problems = [];
  if (extracted.length === 0) {
    problems.push("the extracted set is EMPTY — the absence check below would assert nothing at all");
  }
  for (const name of SEAM_SYMBOLS) {
    if (!extracted.includes(name)) problems.push(`${name} is not among the children's own definitions — the derived set has lost a seam symbol, so the floor caught it`);
  }
  for (const name of extracted) {
    if (definitionPattern(name).test(parentSource)) problems.push(`${name} is still DEFINED in ${SINK_REL} — a definition in both homes is a copy, not a move`);
  }
  return problems;
}

function importBackProblems(entries) {
  const problems = [];
  for (const { rel, reaches, reexportsParent } of entries) {
    if (reaches.has(SINK_REL)) problems.push(`${rel} reaches ${SINK_REL} — an extracted module is a leaf of its parent, never a peer`);
    if (reexportsParent) problems.push(`${rel} re-exports the parent's names — the split's dependency runs one way`);
  }
  return problems;
}

function ratchetProblems({ ceiling, floor, before, measured }) {
  const problems = [];
  if (typeof ceiling !== "number") problems.push("there is no ceiling to read — a ratchet without one is not a ratchet");
  if (typeof floor !== "number" || floor <= 0) problems.push("the floor is gone or zero — the leg that proves the file was actually read");
  if (typeof ceiling === "number" && ceiling >= before) problems.push(`the ceiling ${ceiling} is not below the ${before} it replaced — shrink-only means the split lowers it or the split did not happen`);
  if (typeof ceiling === "number" && measured !== ceiling) problems.push(`the ceiling ${ceiling} is not the measured count ${measured} — no headroom, ever`);
  if (typeof floor === "number" && measured <= floor) problems.push(`the measured count ${measured} is at or under the floor ${floor}`);
  return problems;
}

function dependentBindingProblems(surface, dependents) {
  const problems = [];
  for (const { rel, names } of dependents) {
    for (const name of names) {
      if (!surface.includes(name)) problems.push(`${rel} imports "${name}" from ${SINK_REL}, which no longer exports it — this dependent is in the diff, and the whole claim was that none of them would be`);
    }
  }
  return problems;
}

// sinkImporters() — every file under src/, scripts/ and test/ that IMPORTS the sink, derived from
// the tree rather than listed. The list is what a story like this one changes, so listing it would
// be storing the very fact the claim is about (ADR-003 §1).
async function sinkImporters() {
  const found = [];
  const walk = async (dir) => {
    for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        await walk(rel);
        continue;
      }
      if (!entry.name.endsWith(".mjs")) continue;
      if (rel === SINK_REL) continue;
      const source = await readFile(path.join(root, ...rel.split("/")), "utf8");
      if (/\bfrom\s*["'][^"']*worker-execution\.mjs["']|\bimport\s*\(\s*["'][^"']*worker-execution\.mjs["']/u.test(source)) found.push(rel);
    }
  };
  for (const dir of ["src", "scripts", "test"]) await walk(dir);
  return found;
}

// namedImportsOf(source, specifierSuffix) — the bindings a dependent takes from the sink.
//
// Anchored to the start of a line on purpose. Several controls in this tree carry PLANTED import
// statements inside template literals — `acd-phase-door-not-a-driver` plants
// `import { runAssignment } from "./mesh/worker-execution.mjs"` as a violation for its own detector
// to catch — and a binding nobody actually takes is not a dependent this claim is about. An
// unanchored match reads those plants as real importers and reports the control as broken by a
// story that never touched it.
function namedImportsOf(source, specifierSuffix) {
  const bindings = [];
  const pattern = new RegExp(`^\\s*import\\s*\\{([^}]*)\\}\\s*from\\s*["'][^"']*${specifierSuffix}["']`, "gmu");
  for (const match of source.matchAll(pattern)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/u)[0].trim();
      if (name.length > 0) bindings.push(name);
    }
  }
  return bindings;
}

export const archTests = [
  {
    name: "arch/53 FF-5302 (acd-session-driver-single-home): the driver export set is exactly the frozen seventeen and the sink re-exports every binding by identity",
    run: async () => {
      const [driverModule, sinkModule] = await Promise.all([
        import("../../../src/agent-session-driver.mjs"),
        import("../../../src/mesh/worker-execution.mjs"),
      ]);
      const actual = Object.keys(driverModule).sort();
      const expected = [...MOVED].sort();
      assert.deepEqual(setDelta(actual, expected), { extra: [], missing: [] }, "an extra export is as much a defect as a missing export");
      assert.equal(actual.length, 17, "sixteen moved names plus the admitted ensureWorktreeTrusted re-export");
      for (const name of MOVED) assert.strictEqual(sinkModule[name], driverModule[name], `${name} must be the same binding through the sink`);
      assert.equal(typeof driverModule.defaultPtySpawn, "function", "the formerly-private defaultPtySpawn is carried on both sides");
    },
  },
  {
    name: "arch/53 FF-5302 (acd-session-driver-single-home): the sink defines none of the moved names and names the driver re-export",
    run: async () => {
      const source = stripComments(await readFile(sinkPath, "utf8"));
      assert.match(source, /from\s+["'](?:\.\.?\/)+agent-session-driver\.mjs["']/u, "the sink's re-export/import source remains explicit");
      for (const name of MOVED) {
        const definition = new RegExp(`(?:export\\s+)?(?:async\\s+)?(?:function|const|let|class)\\s+${name}\\b`, "u");
        assert.doesNotMatch(source, definition, `${name} was copied back into the sink`);
      }
    },
  },
  {
    name: "arch/53 FF-5302 (acd-session-driver-single-home): the assignment sink carries a non-vacuous shrink-only line-count ratchet",
    run: async () => {
      const count = (await readFile(sinkPath, "utf8")).split(/\r?\n/u).length - 1;
      assert.ok(count >= SINK_FLOOR, `sink was actually read: ${count} lines, floor ${SINK_FLOOR}`);
      assert.ok(count <= SINK_CEILING, `sink grew to ${count} lines past the ${SINK_CEILING} post-move ceiling; raising the ceiling is an ADR decision, not a diff`);
      assert.ok(SINK_CEILING < 3286, "the ceiling is post-move, never the pre-move size");
      assert.ok((await readFile(driverPath, "utf8")).length > 1000, "the extracted driver file was actually read");
    },
  },
  {
    name: "arch/53 FF-5302 (acd-session-driver-single-home): the exact-set detector names both planted directions",
    run: async () => {
      assert.deepEqual(setDelta(["a", "b"], ["a", "c"]), { extra: ["b"], missing: ["c"] });
      assert.deepEqual(setDelta(["a"], ["a"]), { extra: [], missing: [] });
    },
  },
  {
    name: "arch/53 FF-7002 (acd-session-driver-single-home, extended): the driver imports the pure phase-brief leaf WITHOUT re-exporting it, the leaf is pure, and the driver's export set stays the frozen seventeen",
    run: async () => {
      const [driverModule, phaseBriefModule] = await Promise.all([
        import("../../../src/agent-session-driver.mjs"),
        import("../../../src/phase-brief.mjs"),
      ]);
      // the driver's export set is STILL exactly the frozen seventeen (phase-brief is NOT re-exported)
      const actual = Object.keys(driverModule).sort();
      assert.deepEqual(setDelta(actual, [...MOVED].sort()), { extra: [], missing: [] }, "adding the phase-brief import must not leak any phase-brief export onto the driver");
      assert.equal(actual.length, 17, "the driver's export set stays the frozen seventeen");
      // the driver DOES import phase-brief (per ADR-002), and its exports are disjoint from the driver's
      const driverSource = await readFile(driverPath, "utf8");
      assert.match(driverSource, /from\s+["'](?:\.\.?\/)+phase-brief\.mjs["']/u, "the driver imports the pure phase-brief leaf");
      assert.doesNotMatch(driverSource, /export\s+[^;]*from\s+["'](?:\.\.?\/)+phase-brief\.mjs["']/u, "…without re-exporting it");
      const phaseBriefNames = Object.keys(phaseBriefModule);
      for (const name of phaseBriefNames) {
        assert.ok(!MOVED.includes(name), `phase-brief export "${name}" is not smuggled into the driver's frozen export set`);
      }
      // THE LEAF IS PURE AS A FAMILY (119/ADR-002). Purity is a claim about a module's EXTERNAL
      // dependencies, never about how many files it occupies: the subject resolves to
      // `src/phase-brief/` when that directory exists and to `src/phase-brief.mjs` when it does not,
      // an intra-family specifier is admitted, and every other leg — node builtins, the filesystem,
      // the clock, `fetch`, an outward dynamic `import()` — is re-asserted per file over the whole
      // family. The predicate widened; the guard did not weaken. The old token ban made the only
      // decomposition that would fix this file (1,651 lines, 432 when this guard was written)
      // illegal, which is TECH_DEBT item 61's measured cost.
      await assertFamilyPurity(assert, root, "src/phase-brief");
      const leafSource = await readFile(path.join(path.dirname(driverPath), "phase-brief.mjs"), "utf8");
      assert.doesNotMatch(leafSource, /\b(?:Date\.now|performance\.now|process\.hrtime|new Date)\b/u, "the phase-brief leaf reads no wall-clock");
    },
  },
  // milestone 70 / story 01 (ADR-004, ADR-005) — FF-7005: ONE launch seam. Every
  // production `claude` argv is built by `resolveInteractiveDriverLaunch`; no other
  // module assembles one, so the flags of ADR-004/005 cannot be bypassed by a second
  // spawn site.
  {
    name: "arch/53 FF-7005 (acd-session-driver-single-home, extended): no production claude launch argv is assembled anywhere outside the one launch seam",
    run: async () => {
      // The launch seam's signature tokens. `--permission-mode` + the append form + the
      // stable-prefix flag are built in exactly one place; a second module carrying any
      // of them is a second (unmanaged) claude launch builder.
      const realFiles = await readSrcFiles(root);
      const offenders = findOffenders(realFiles, driverPath);
      assert.deepEqual(offenders, [], "no module outside resolveInteractiveDriverLaunch's home assembles a claude launch argv (permission-mode / append-system-prompt / stable-prefix)");

      // Red probe: a SECOND module constructs a claude launch argv → the detector trips.
      const probe = [
        ...realFiles,
        { rel: "commands/rogue.mjs", path: path.join(root, "src", "commands", "rogue.mjs"), body: 'function rogue() { return ["--permission-mode", "auto"]; }\n' },
      ];
      assert.deepEqual(findOffenders(probe, driverPath), ["commands/rogue.mjs builds --permission-mode"], "a second claude launch builder trips the detector");
    },
  },
  {
    name: "arch/119 FF-11907 (acd-session-driver-single-home, extended): the exported surface is identical across item 83's split, in both directions, and every binding a dependent takes is still on it",
    run: async () => {
      const sinkModule = await import("../../../src/mesh/worker-execution.mjs");
      const actual = Object.keys(sinkModule).sort();
      assert.deepEqual(setDelta(actual, [...SINK_SURFACE].sort()), { extra: [], missing: [] }, "an extra name is as much a defect as a missing one — the split subtracts definitions, never surface");
      assert.equal(actual.length, 42, "the surface measured before the split");
      assert.equal(typeof sinkModule.createMeshWorkerExecutionHandler, "function", "the factory every one of the 56 dependents reaches the module through is still a function");

      // EVERY importer of the sink, derived — the four under src/ and scripts/ and the suites and
      // fixtures under test/. "The dependents are unchanged by this diff" is asserted as the
      // property that MAKES them unchanged: every binding any of them takes is still exported.
      // A git-diff-shaped version of this claim would be vacuously true the moment it merged.
      const dependents = [];
      for (const rel of await sinkImporters()) {
        const source = await readFile(path.join(root, ...rel.split("/")), "utf8");
        dependents.push({ rel, names: namedImportsOf(source, "worker-execution\\.mjs") });
      }
      assert.ok(dependents.length >= 4, `the importer sweep found ${dependents.length} dependents — it must at least find the four non-test ones`);
      for (const rel of ["src/global-node-registry.mjs", "src/mesh/clone-credential-provider.mjs", "src/mesh/launcher.mjs", "scripts/pin-checkout-id.mjs"]) {
        assert.ok(dependents.some((dependent) => dependent.rel === rel), `${rel} is one of the four non-test dependents and the sweep must see it`);
      }
      assert.deepEqual(dependentBindingProblems([...SINK_SURFACE], dependents), [], "every binding every dependent takes from the sink is still on its surface");
      for (const { rel, names } of dependents) {
        for (const name of names) assert.ok(name in sinkModule, `${rel}'s binding "${name}" resolves through the sink`);
      }
    },
  },
  {
    name: "arch/119 FF-11907 (acd-session-driver-single-home, extended): each extracted symbol is absent from the parent as a DEFINITION and present as a re-export, and the extracted set is DERIVED from the children rather than retyped",
    run: async () => {
      const parentSource = stripComments(await readFile(sinkPath, "utf8"));
      const extracted = [];
      for (const rel of EXTRACTED_HOMES) {
        extracted.push(...topLevelDefinitions(stripComments(await readFile(path.join(root, ...rel.split("/")), "utf8"))));
      }
      // The set the absence check runs over is the children's OWN definitions. A literal here would
      // be a list a later extraction silently outgrows, which is the failure ADR-003 §1 names.
      assert.ok(extracted.length > 0, "the derived extracted set is non-empty");
      for (const name of SEAM_SYMBOLS) assert.ok(extracted.includes(name), `the derived set contains the seam symbol ${name} — the floor a child that extracted nothing fails on`);
      assert.deepEqual(absentDefinitionProblems(parentSource, extracted), [], "no extracted symbol is still defined in the parent");

      // …and every extracted symbol that was ON the pre-split surface is STILL on it, which is the
      // pairing that distinguishes a move from a deletion.
      const sinkModule = await import("../../../src/mesh/worker-execution.mjs");
      for (const rel of EXTRACTED_HOMES) {
        const child = await import(`../../../${rel}`);
        for (const [name, value] of Object.entries(child)) {
          if (!SINK_SURFACE.includes(name)) continue;
          assert.strictEqual(sinkModule[name], value, `${name} is re-exported by identity, so a dependent's import resolves to the SAME reference`);
        }
      }
      // `redactCredentialFromText` is the counter-case that keeps the surface claim honest: the
      // push path imports it inward from the extracted module, and it is deliberately NOT
      // re-exported, because a name this file never exported must not start being exported now.
      assert.equal("redactCredentialFromText" in sinkModule, false, "an extracted helper the sink never exported does not join its surface");
    },
  },
  {
    name: "arch/119 FF-11907 (acd-session-driver-single-home, extended): no extracted module imports its parent back — not directly, not through a third module, and none re-exports the parent's names",
    run: async () => {
      const cache = new Map();
      const readRel = (rel) => {
        if (!cache.has(rel)) {
          try {
            cache.set(rel, readFileSync(path.join(root, ...rel.split("/")), "utf8"));
          } catch {
            cache.set(rel, null);
          }
        }
        return cache.get(rel);
      };
      const entries = EXTRACTED_HOMES.map((rel) => ({
        rel,
        reaches: reachesFrom(rel, readRel),
        reexportsParent: /export\s[^;]*from\s*["'][^"']*worker-execution\.mjs["']/u.test(readRel(rel) ?? ""),
      }));
      for (const entry of entries) assert.ok(entry.reaches.size > 0, `${entry.rel}'s import closure was actually walked`);
      assert.deepEqual(importBackProblems(entries), [], "the split's dependency runs one way");
    },
  },
  {
    name: "arch/119 FF-11907 (acd-session-driver-single-home, extended): the ceiling FELL to the post-split measured count, carries the command that produced it, and the floor is untouched",
    run: async () => {
      const measured = (await readFile(sinkPath, "utf8")).split(/\r?\n/u).length - 1;
      assert.deepEqual(ratchetProblems({ ceiling: SINK_CEILING, floor: SINK_FLOOR, before: SINK_CEILING_BEFORE_SPLIT, measured }), [], "the ratchet shrank to the measured count with no headroom, and the floor still proves the file was read");
      assert.equal(SINK_FLOOR, 1500, "SINK_FLOOR is untouched by this story — lowering it to keep a larger cut green would convert the one non-vacuity leg on this ratchet into decoration");

      // The command that measured the new value lives in the constant's OWN comment, so whoever
      // moves it next can reproduce the number rather than re-derive the method.
      //
      // Cut STRUCTURALLY — the run of `//` lines immediately above the declaration — never by a
      // character offset or an `indexOf` sentinel. Those are F-47-04-ARCH-2's two banned species,
      // and this leg would have been a new instance of the second one.
      const controlLines = (await readFile(fileURLToPath(import.meta.url), "utf8")).split(/\r?\n/u);
      const declaration = controlLines.findIndex((line) => /^const SINK_CEILING = \d+;$/u.test(line));
      assert.ok(declaration > 0, "the ceiling's own declaration line was found");
      const ownComment = [];
      for (let index = declaration - 1; index >= 0 && controlLines[index].startsWith("//"); index -= 1) ownComment.unshift(controlLines[index]);
      assert.ok(ownComment.length > 0, "the declaration carries a comment block of its own — an empty one would make the next assertion vacuous");
      assert.ok(ownComment.some((line) => line.includes("wc -l src/mesh/worker-execution.mjs")), "the constant's own comment carries the command that produced its value");
    },
  },
  {
    name: "arch/119 FF-11907 (ADR-001: an EXTENDED control owes a red probe over its ORIGINAL claim too): every mutation this extension admits is named by the detector that admits it",
    run: async () => {
      const parentSource = stripComments(readFileSync(sinkPath, "utf8"));

      // (1) an extracted function copied back into the parent — named on the definition leg.
      const copiedBack = `${parentSource}\nexport async function cloneRepoForWorkspace(ws) { return ws; }\n`;
      assert.ok(absentDefinitionProblems(copiedBack, [...SEAM_SYMBOLS]).some((problem) => /cloneRepoForWorkspace is still DEFINED/u.test(problem)), "a copied-back definition is named");

      // (2) an export name ADDED to the parent, and (3) one DROPPED — both directions, because
      // this file has said since 53/00 that an extra name is as much a defect as a missing one.
      assert.deepEqual(setDelta([...SINK_SURFACE, "somethingNew"].sort(), [...SINK_SURFACE].sort()), { extra: ["somethingNew"], missing: [] }, "an added export name is named");
      const dropped = SINK_SURFACE.filter((name) => name !== "workerHasRepo");
      assert.deepEqual(setDelta([...dropped].sort(), [...SINK_SURFACE].sort()), { extra: [], missing: ["workerHasRepo"] }, "a dropped export name is named");
      assert.ok(
        dependentBindingProblems([...dropped], [{ rel: "src/mesh/launcher.mjs", names: ["workerHasRepo"] }]).some((problem) => /launcher\.mjs imports "workerHasRepo"/u.test(problem)),
        "…and the dependent's own binding is named with it, which is the reason the surface is frozen at all",
      );

      // (4) THE ORIGINAL CLAIM. One of the delivered seventeen driver names re-defined in the
      // parent still reds, so this extension did not quietly replace the claim it extends.
      const redefinedDriverName = `${parentSource}\nexport const NEEDS_INPUT_SENTINEL = "x";\n`;
      assert.ok(definitionPattern("NEEDS_INPUT_SENTINEL").test(redefinedDriverName), "a driver name re-defined in the sink is caught by the same definition pattern the seventeen use");
      assert.ok(MOVED.every((name) => !definitionPattern(name).test(parentSource)), "…and none of the seventeen is defined in the real sink");

      // (5) an extracted module importing the parent back, and one re-exporting its names.
      assert.ok(
        importBackProblems([{ rel: "src/mesh/worker-launch.mjs", reaches: new Set([SINK_REL]), reexportsParent: false }]).some((problem) => /is a leaf of its parent/u.test(problem)),
        "a child that reaches its parent is named",
      );
      assert.ok(
        importBackProblems([{ rel: "src/mesh/worker-launch.mjs", reaches: new Set(["src/mesh/repo-marker.mjs"]), reexportsParent: true }]).some((problem) => /re-exports the parent's names/u.test(problem)),
        "…and so is one that re-exports them",
      );

      // (6)-(8) the ratchet's own three mutations: raised above the value it replaced, deleted
      // outright, and a floor deleted or dropped to zero.
      const measured = 1957;
      assert.ok(ratchetProblems({ ceiling: SINK_CEILING_BEFORE_SPLIT + 1, floor: SINK_FLOOR, before: SINK_CEILING_BEFORE_SPLIT, measured }).some((problem) => /shrink-only/u.test(problem)), "a ceiling raised above the value it replaced is named on the shrink-only leg");
      assert.ok(ratchetProblems({ ceiling: undefined, floor: SINK_FLOOR, before: SINK_CEILING_BEFORE_SPLIT, measured }).some((problem) => /no ceiling to read/u.test(problem)), "a deleted ceiling is named");
      assert.ok(ratchetProblems({ ceiling: measured, floor: 0, before: SINK_CEILING_BEFORE_SPLIT, measured }).some((problem) => /proves the file was actually read/u.test(problem)), "a floor dropped to zero is named");
      assert.ok(ratchetProblems({ ceiling: measured, floor: undefined, before: SINK_CEILING_BEFORE_SPLIT, measured }).some((problem) => /proves the file was actually read/u.test(problem)), "…and so is a deleted one");
      assert.ok(ratchetProblems({ ceiling: measured + 40, floor: SINK_FLOOR, before: SINK_CEILING_BEFORE_SPLIT, measured }).some((problem) => /no headroom/u.test(problem)), "headroom taken 'because the split will settle' is named");

      // …and the delivered values are clean, so every probe above is refusing a defect rather than
      // refusing the shape of the split.
      assert.deepEqual(ratchetProblems({ ceiling: SINK_CEILING, floor: SINK_FLOOR, before: SINK_CEILING_BEFORE_SPLIT, measured: SINK_CEILING }), [], "the delivered ratchet is clean");
    },
  },

  {
    name: "arch/119 FF-11907 (acd-session-driver-single-home, extended): the parent PERFORMS neither extracted concern any more — it reads no directive field of its own, and what it still CALLS it imports inward rather than defining again",
    run: async () => {
      const parent = stripComments(await readFile(sinkPath, "utf8"));

      // TASK 00, SCENARIO 4. The reads have ONE home, and it is not this file. A parent keeping
      // "just one" `directive.launch` read for a log line or a brief is the shape that turns a move
      // into a second speller, and it is invisible in a diff that otherwise looks like a clean cut.
      const spelled = ["directive.launch", "directive.command", "directive?.command", "directive?.launch"]
        .filter((token) => parent.includes(token));
      assert.deepEqual(spelled, [], `the parent still reads the directive frame directly: ${spelled.join(", ")}`);
      assert.doesNotMatch(parent, /Object\.hasOwn\s*\(\s*directive\s*,/u, "the parent performs no launch PRESENCE test of its own — 63/ADR-006 §3's `?? <empty>` door has one home now");

      // …and it OBTAINS them from that home. Absence alone would also be satisfied by the reads
      // simply having been deleted, which is a different story with the same diff shape.
      assert.match(parent, /import\s*\{[^}]*\breadDirectiveCommand\b[^}]*\}\s*from\s*["']\.\/worker-launch\.mjs["']/u, "the command comes from the extracted reader");
      assert.match(parent, /import\s*\{[^}]*\breadDirectiveLaunch\b[^}]*\}\s*from\s*["']\.\/worker-launch\.mjs["']/u, "…and so do the launch's presence and value, as a pair");
      assert.match(parent, /import\s*\{[^}]*\bcomposeDirectiveLaunchOptions\b[^}]*\}\s*from\s*["']\.\/worker-launch\.mjs["']/u, "…and the composer is called, not re-defined");

      // `phaseBriefContext` still takes the ALREADY-READ command string as an argument. It reading
      // the frame itself would be a second directive reader wearing a different name — the exact
      // species this scenario closes.
      const briefBody = functionBody(parent, "async function phaseBriefContext(");
      assert.ok(briefBody != null, "phaseBriefContext's body was cut structurally — a null cut is reported, never asserted over");
      assert.doesNotMatch(briefBody, /\bdirective\b/u, "phaseBriefContext reads no directive frame — it is handed the command string");

      // TASK 01, LAST SCENARIO. What the parent still CALLS from the admission module, it imports.
      // Copying `buildAskpassShim` or the redaction into the push path — which stays here as seam 3
      // — would be two spellings of one credential discipline, and is this cut's named failure mode.
      const inward = ["meshCheckoutPath", "meshCheckoutsRoot", "buildAskpassShim", "redactCredentialFromText"];
      for (const name of inward) {
        assert.match(
          parent,
          new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["']\\./worker-repo-admission\\.mjs["']`, "u"),
          `${name} is imported inward from the module it moved to`,
        );
        assert.doesNotMatch(parent, definitionPattern(name), `…and is not defined here as well, which would be a copy`);
      }
      // Non-vacuity: each of those four is genuinely still USED here, so the imports are load-bearing
      // rather than four names kept alive to satisfy the leg above.
      for (const name of inward) {
        const uses = [...parent.matchAll(new RegExp(`(?<![\\w$.])${name}\\s*\\(`, "gu"))].length;
        assert.ok(uses > 0, `${name} is actually called in the parent — an unused inward import would make this leg decorative`);
      }

      // RED PROBES over the same detectors, so none of the above is a claim about a clean tree only.
      assert.ok(`${parent}\nconst extra = directive.launch;\n`.includes("directive.launch"), "a re-spelled directive read is visible to the token check");
      assert.match(`${parent}\nfunction redactCredentialFromText(t) { return t; }\n`, definitionPattern("redactCredentialFromText"), "a copied-back credential helper is visible to the definition check");
      assert.equal(functionBody(parent, "async function noSuchFunctionExistsHere("), null, "…and a cut that cannot be made answers null rather than asserting over the wrong region");
    },
  },

];

// findOffenders(files, driverPath) — which files (outside the launch seam) carry a
// claude launch signature token. `files` entries may carry an optional pre-read `body`
// (used by the red probe); otherwise each file is read from disk. Returns a list of
// `"<rel> builds <token>"` strings, or [].
const LAUNCH_TOKENS = ["--permission-mode", "--append-system-prompt", "--exclude-dynamic-system-prompt-sections"];
function findOffenders(files, driverPath) {
  const offenders = [];
  for (const file of files) {
    if (file.path === driverPath) continue; // the one launch seam itself
    const source = file.body ?? stripComments(readFileSync(file.path, "utf8"));
    for (const token of LAUNCH_TOKENS) {
      if (source.includes(JSON.stringify(token)) || source.includes(`'${token}'`)) {
        offenders.push(`${file.rel} builds ${token}`);
      }
    }
  }
  return offenders;
}
