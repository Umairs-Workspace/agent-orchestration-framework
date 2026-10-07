import { workspaceTestInventory } from "../../../scripts/workspace-tests.mjs";
import { workspaceSourceRoots } from "../../../scripts/source-inventory.mjs";
// Fitness function: FF-11904 (119/ADR-009; TECH_DEBT items 10, 63, 78) —
//
//   "Every flat layer is a row in ONE table, and the next sibling is a decision."
//
// ── WHY ONE TABLE AND NOT THREE ───────────────────────────────────────────────────────────
// Three ledger entries ask for a count ratchet and each names a different directory. Item 78
// names why three would fail, and it is the whole argument for this file: item 10's
// measurements walk `packages/core/src/` root and stop, item 63's walk `test/arch/`, and THE FASTEST-GROWING
// FLAT DIRECTORY IN THE TREE IS THE ONE NEITHER ENTRY CAN SEE. `packages/core/src/commands/` was 18 siblings
// on 2026-07-01 and 99 on 2026-09-06. Three separate ratchets would have rebuilt that blind
// spot three times over; one table with a row per layer cannot, because leg 2 below refuses to
// pass while a layer has neither a row nor a declared exemption.
//
// ── AND WHY IT LANDS NOW, WITH THE FIRST CUT ──────────────────────────────────────────────
// 49/ARCHITECTURE bad cut 4: a ratchet authored AFTER the growth it was meant to question
// RATIFIES that growth. So the table lands in the diff that moves 71 modules and counts the
// files that land with it. Item 78 is equally clear about the other half — a count-only cap
// with NO admitted decomposition is item 61's measured failure — which is why this control was
// not admissible until ADR-002 ruled that a `packages/core/src/<name>/` family is one module and ADR-005 took
// the partition. The cap and the decomposition arrive together or neither is honest.
//
// ── THE MODEL IS `acd-ui-directory-budget`, ONE TOOLCHAIN OVER ────────────────────────────
// 49/ADR-001 already built exactly this instrument for `apps/ui/src`, and this file is deliberately
// its shape rather than a second invention: a NAMED table with a per-entry ceiling and a `why`
// that names what the next growth should do instead; every allowance declared and every one 0;
// a BOTH-DIRECTIONS sweep, because a table naming three of four layers passes silently on the
// fourth; non-vacuity, so a rename REDS a row instead of emptying it; and a budgeted subject
// that no longer exists is a FAILURE, never a skip.
//
// ── THE EXEMPTION LIST IS RULED, NOT CURATED ─────────────────────────────────────────────
// "An exemption list that grows a member instead of a row whenever a layer becomes
// inconvenient" is the named way to quietly undo this, so an exemption here is not a judgement
// about a directory — it is a claim about its SIZE, and the claim is checked. A layer with more
// than FLAT_LAYER_THRESHOLD direct children owes a ROW; one at or under it may be exempt, and an
// exempt layer that crosses the threshold FAILS naming the row it now owes. The list cannot
// absorb growth, because growth is the one thing it is measured against.
//
// ── PLANTS NEVER TOUCH THE REAL TREE ─────────────────────────────────────────────────────
// No lane may `mkdir src/<plant>`: it races every other suite reading the same tree, and a
// crashed run leaves the plant behind so every subsequent run is red for the wrong reason.
// Plants are SYNTHESIZED LISTINGS handed to THE SHIPPED DETECTOR — never a copy of it (49's own
// review found a plant fed to a locally re-implemented detector, so the shipped one was never
// once driven to a violation). Every plant asserts it LANDED before the detector is asked, and
// the clean listing is shown quiet in the same lane.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// ── THE COUNTING RULE, DECLARED ONCE ─────────────────────────────────────────────────────
// One rule produces BOTH the ceiling and the sweep, which is the only way the two can be
// compared at all. A subdirectory is never a member of its parent's row: `packages/core/src/mesh/worktree.mjs`
// counts toward `packages/core/src/mesh/` and never toward `packages/core/src/`, which is what makes the partition a
// REDUCTION rather than a relabelling.
//
//   root-mjs         — direct children ending `.mjs`      (the `packages/core/src/` root: item 10's own metric)
//   test-suites      — direct children ending `.test.mjs` (the `test/` root: `test/installer-shell.mjs`
//                      is a HARNESS, not a suite, and is excluded by this rule — the ceiling below
//                      was produced by this same predicate, so the two cannot disagree)
//   direct-children  — every direct child file
export const COUNTING_RULES = Object.freeze({
  "root-mjs": (name) => name.endsWith(".mjs"),
  "test-suites": (name) => /\.(?:test|suite)\.mjs$/u.test(name),
  "direct-children": () => true,
});

// A layer holding more than this many direct children owes a ROW. At or under it, a declared
// exemption is admitted — and re-checked on every run.
//
// WHY 8, since FF-11902 requires an admitted literal to carry its reason: it sits in a real gap
// in this tree rather than at a round number. The largest exempt layer is `packages/core/src/work-acceptor/`
// at 6 and the smallest row is `packages/core/src/work-audit/` at 10, so 8 has slack in both directions — a
// layer has to grow by a third before it changes category, and no existing layer sits on the
// boundary where a single file would flip it.
export const FLAT_LAYER_THRESHOLD = 8;

// How deep a layer has to be before it stops being one. Three path segments: depth 1 is the two
// roots, depth 2 is `packages/core/src/commands/` and `test/arch/` and their siblings, and depth 3 is where
// the next two stories of this milestone put their partitions — `packages/core/src/commands/mesh/` (119/02)
// and `test/arch/<subject>/` (119/03). Those are the layers that must not be able to appear
// unmetered, and they are the reason this bound is 3 rather than 2: the first cut of this table
// stopped at 2 and would have let every one of them in unbudgeted, which is item 78's blind spot
// rebuilt one level down inside its own remedy. One level deeper is a leaf of a leaf — a single
// skill's own directory — where a row would meter nothing this milestone is about.
export const LAYER_DEPTH = 3;

// A layer whose SUBTREE this table has no mandate over. One member, and it is the milestone's
// own scoping rather than this control's preference: 119's SPEC puts the bundled prompt layer
// (TECH_DEBT item 79) explicitly out of scope — "flat and repetitive for the same reason, but it
// is prose, not modules, and its consumers are agents rather than importers". `packages/core/assets/` still
// carries its own row for its four direct children; what is declined here is metering the prose
// beneath it, which is a different milestone's subject and a different argument.
const SUBTREE_OUT_OF_SCOPE = new Set(["packages/core/assets"]);

// ── THE NAMED TABLE ──────────────────────────────────────────────────────────────────────
// Measured 2026-09-06 in the working tree by the predicates above, in the diff that delivers
// the counts. Every ceiling EQUALS its measured count and every allowance is 0.
export const SOURCE_DIRECTORY_BUDGETS = Object.freeze([
  Object.freeze({ directory: "packages/execution/test", ceiling: 21, allowance: 0, counts: "direct-children", why: "142/09 established execution's eighteen owned suite entries. 154/00 adds runtime-session.suite.mjs for the shared boundary's ordered persistence and Claude compatibility, separate from the existing launch driver suite. The ceiling equals the delivered nineteen entries with no allowance. Further boundary cases belong in this suite; a new runtime subject must state its own ownership before adding a sibling. 154/01 adds runtime-selection.suite.mjs for selection/provenance and malformed-record refusal, a policy subject distinct from the native transport lifecycle. Future policy cases belong here. 154/02 adds codex-app-server.suite.mjs for the native lifecycle; fixture data lives beside its owner." }),
  Object.freeze({ directory: "packages/mesh/test", ceiling: 36, allowance: 0, counts: "direct-children", why: "142/06: mesh owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 142/09 ownership moves added seven suites (14 -> 21): the enrollment device flow, the launcher lock, two registry suites and three relay suites, each building its subject from @aof/mesh factories; the ceiling rose with the suites that arrived, not as headroom. 142/09 ownership moves (second wave) added fifteen suites (21 -> 36): presence, sessions, the node registry, terminal mirroring, the stream client and server, fleet query and UI serve, each measured to execute only @aof/mesh and built from its factories through support/mesh-services.mjs; the ceiling rose with the suites that arrived, not as headroom." }),
  Object.freeze({ directory: "packages/work/test", ceiling: 53, allowance: 0, counts: "direct-children", why: "142/06: work owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 142/09 moved 4 more owned suite(s) in (37 -> 41); growth is the owner gaining the tests it proves, stated rather than assumed. 142/09 ownership moves (second wave) added eleven suites (41 -> 52): discovery, readiness, the doctor, the observer and the acceptor ledger and rule, each measured to execute only @aof/work and built from its factories through support/; the ceiling rose with the suites that arrived, not as headroom. 135/01: 52 -> 51, example-map-parse.suite.mjs moved to @aof/specification-by-example with the grammar it proves (135/ADR-001). 148: 51 -> 53, two suites owned by @aof/work for the memory vocabulary it now homes — 148/02's memory-vocabulary.suite.mjs (the enums, readers and normalisers of memory-vocabulary.mjs) and 148/04's lesson-meta-hold.suite.mjs (validate's hold on a live lesson and doctor's archived lesson-meta lane), each a new subject rather than a case on an existing suite." }),
  Object.freeze({ directory: "apps/ui/test/support", ceiling: 18, allowance: 0, counts: "direct-children", why: "142/09: the UI test harnesses (mini React, DOM simulation, the esbuild-bundled .tsx entries) that only @aof/ui suites and the guards over them use, moved from test/support with their importers rewritten. No growth allowance; a new harness belongs beside the surface it mounts." }),
  Object.freeze({ directory: "packages/core/test", ceiling: 41, allowance: 0, counts: "direct-children", why: "154/04: 40 -> 41 for core-owned Codex shared-file ownership and migration checks; subsequent ownership cases extend that suite, with zero allowance. 154/03: 38 -> 40 for native Codex asset rendering and typed asset-reference suites, owned by core; no growth allowance. 142/09: core owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 142/09 ownership moves added twelve suites (26 -> 38): the assets namespace (DSL, config inspection, config editing, work init) is core's own logic, so its suites build it from core's assemblers; the ceiling rose with the suites that arrived, not as headroom." }),
  Object.freeze({ directory: "packages/knowledge/test", ceiling: 12, allowance: 0, counts: "direct-children", why: "142/06: knowledge owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. Was an exemption below the flat-layer threshold; 142/09 ownership moves (scope flags, graphify posture, memory hooks, the recall block, gap discharge) took it to 10, over the threshold, so it is a row: the ceiling is the delivered count. 148: 10 -> 12, two suites on the retrospective parser knowledge owns — 148/02's memory-meta-normalised.suite.mjs (the meta line normalised on read, on both backends) and 148/03's story-retrospectives-indexed.suite.mjs (every item's RETROSPECTIVE.md read, path-driven)." }),
  Object.freeze({ directory: "packages/work-loop/test", ceiling: 11, allowance: 0, counts: "direct-children", why: "142/09: work-loop owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 142/09 ownership moves added the trigger level-ceiling suite (10 -> 11), built from createTriggerDeclarations; the ceiling rose with the suite that arrived, not as headroom." }),
  Object.freeze({ directory: "apps/ui/test", ceiling: 35, allowance: 0, counts: "direct-children", why: "142/09: @aof/ui owns its UI-only array suites (33 suites plus the index); independent and aggregate executed counts are checked. No growth allowance. 135/03: 34 -> 35 for board-rule-groups.suite.mjs, the task card's rule headings (135/ADR-005) mounted through the board app harness beside the surface it proves; the ceiling rose with the suite that arrived, not as headroom." }),
  Object.freeze({"directory":"packages/core/src/commands","counts":"direct-children","ceiling":6,"allowance":0,"why":"142 Plan 06 preserves the explicit budget of this command or work family after its implementations move. Its ceiling shrinks to the actual remaining composition files; growth must name the owning API rather than consume a freed slot."}),
  Object.freeze({"directory":"packages/core/src/commands/assets","counts":"direct-children","ceiling":1,"allowance":0,"why":"142 Plan 06 preserves the explicit budget of this command or work family after its implementations move. Its ceiling shrinks to the actual remaining composition files; growth must name the owning API rather than consume a freed slot."}),
  Object.freeze({"directory":"packages/core/src/work","counts":"direct-children","ceiling":10,"allowance":0,"why":"142 Plan 06 preserves the explicit budget of this command or work family after its implementations move. Its ceiling shrinks to the actual remaining composition files; growth must name the owning API rather than consume a freed slot."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/commands/assets","counts":"direct-children","ceiling":8,"allowance":0,"why":"142 Plan 06 preserves the explicit budget of this command or work family after its implementations move. Its ceiling shrinks to the actual remaining composition files; growth must name the owning API rather than consume a freed slot."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/commands/graph","counts":"direct-children","ceiling":4,"allowance":0,"why":"142 Plan 06 preserves the explicit budget of this command or work family after its implementations move. Its ceiling shrinks to the actual remaining composition files; growth must name the owning API rather than consume a freed slot."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/commands/work","counts":"direct-children","ceiling":1,"allowance":0,"why":"128 founded the memory family; the fold of other work commands remains a separate item. Plan 06 retains its single composition binding and zero allowance after moving implementation ownership."}),
  Object.freeze({"directory":"packages/execution/src","counts":"direct-children","ceiling":23,"allowance":0,"why":"142 Plan 06 established execution's source ownership. 154/ADR-001 adds runtime-session.mjs, the shared session boundary and Claude adapter, keeping native lifecycle ownership out of loop policy. The ceiling equals the delivered twenty files with no allowance. Further adapters or selection policy must state a distinct owner rather than extend the loop or consume hidden headroom. 154/01 adds runtime-selection.mjs as ADR-002's single runtime/provenance and pinned-resume policy owner; this distinct policy does not belong in the transport boundary. Future choices extend this owner, not another sibling. 154/02 adds the stdio lifecycle owner and its version-specific protocol shapes, separate from runtime policy."}),
  Object.freeze({"directory":"packages/integration-notion/src","counts":"direct-children","ceiling":11,"allowance":0,"why":"154/04: codex-settings.mjs owns lossless shared-file merge and recovery intent beside the existing claude-settings writer; no growth allowance. 142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/mesh/src","counts":"direct-children","ceiling":52,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/mesh/src/commands","counts":"direct-children","ceiling":20,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/messaging/src","counts":"direct-children","ceiling":11,"allowance":0,"why":"142/06: messaging owns the 131/10 gateway.mjs, bot.mjs, replies.mjs and discord-commands.mjs implementations, and notify's ask-messages.mjs, form.mjs and secret.mjs. The exact eleven-file ceiling has no growth allowance; the next addition must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/app","counts":"direct-children","ceiling":13,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/board","counts":"direct-children","ceiling":26,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership. 25 -> 26 at aof:verify 135 (F-135-01): TasksTab.tsx, the board-owned TASKS tab extracted from DetailPanel.tsx under its 1,000-line ratchet; owned by the board, imported only by DetailPanel.tsx."}),
  Object.freeze({"directory":"apps/ui/src/fleet","counts":"direct-children","ceiling":20,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/home","counts":"direct-children","ceiling":18,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/terminal","counts":"direct-children","ceiling":30,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work-loop/src","counts":"direct-children","ceiling":13,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src","counts":"direct-children","ceiling":42,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership. 148/02: 41 -> 42 for memory-vocabulary.mjs, the one home of a lesson's meta-line vocabulary (148/ADR-001): the parser, validate and memory status all read it, and knowledge depends on work, never the reverse, so it lives here."}),
  Object.freeze({"directory":"packages/work/src/audit","counts":"direct-children","ceiling":9,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/commands","counts":"direct-children","ceiling":36,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/doctor","counts":"direct-children","ceiling":11,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership. 134/04: 10 -> 11 for examples.mjs, the tenth doctor lane (a story's example map judged against the answers a person gave), owned by the doctor family like the diagrams lane before it. 135/01: 11 -> 10, the examples lane moved to @aof/specification-by-example as doctor-lane.mjs (135/ADR-001); core appends it through the engine's extensionGroups seam, so the freed slot is not headroom. 148/04: 10 -> 11 for lesson-meta.mjs, the archived lesson-meta lane (an archived retrospective whose lesson meta line is outside the memory vocabulary, 148/ADR-007), owned by the doctor family like the depends lane before it."}),
  Object.freeze({"directory":"packages/core/src","counts":"root-mjs","ceiling":28,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application","counts":"direct-children","ceiling":15,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings","counts":"direct-children","ceiling":36,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/commands","counts":"direct-children","ceiling":62,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/commands/mesh","counts":"direct-children","ceiling":17,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/effects","counts":"direct-children","ceiling":11,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/mesh","counts":"direct-children","ceiling":24,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/work","counts":"direct-children","ceiling":15,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership. 134/04: 14 -> 15 for doctor-examples.mjs, the examples lane's core binding, one per injected lane as doctor-diagrams.mjs is."}),
  Object.freeze({"directory":"packages/core/src/work","counts":"direct-children","ceiling":10,"allowance":0,"why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),

  
  

  
  
  
  
  
  
  Object.freeze({
    directory: "test",
    counts: "test-suites",
    ceiling: 0,
    allowance: 0,
    why: "ITEM 63's first layer. A new suite belongs in a SUBJECT directory under `test/`, which is story 119/03's partition and which lowers this row; adding one here instead is the growth that made 591 flat siblings and a 5,142-line registry. The rule counts `*.test.mjs` direct children, so `test/installer-shell.mjs` — a harness, not a suite — is outside it.",
  }),
  Object.freeze({
    directory: "test/arch",
    counts: "direct-children",
    ceiling: 0,
    allowance: 0,
    why: "ITEM 63's larger and faster half: 433 when this milestone's contract was authored, 436 after 119/00's three controls, 438 with 119/01's two, and 439 with 119/02's one (FF-11908), by ADR-009's rule that a ceiling counts the files landing with it. Note what this row is doing to its own milestone: every story here pays a sibling to buy a control, which is the cost ADR-009's consequences record rather than count as neutral. A control is a file this tree needs; a control in a SUBJECT directory is one it can still find, which is story 119/03's partition and lowers this row.",
  }),
  
  
  Object.freeze({
    directory: "packages/core/assets",
    counts: "direct-children",
    ceiling: 4,
    allowance: 0,
    why: "THE ENTRY THAT STATES WHICH CHILDREN IT COUNTS, because this is the one budgeted layer with subdirectories: it counts its four DIRECT children and none of the six subdirectories' members, which are prose assets rather than modules (TECH_DEBT item 79's subject, and explicitly not this milestone's). A fifth direct child here is a new bundle-layer module and a decision.",
  }),
  
  
  Object.freeze({
    directory: "test/integration/features",
    counts: "direct-children",
    ceiling: 9,
    allowance: 0,
    why: "the integration feature files — the contracts the steps satisfy, one per scenario set. EXEMPT until story 128 on the claim that it held eight, and leg 6 is what turned that claim into this row: `work-memory.feature` (task 00's last scenario names it; the integration README's ritual is that a migrated verb lands WITH its feature) is the ninth, over FLAT_LAYER_THRESHOLD, and an exemption that has stopped being true owes a row rather than a wider list. The next feature here should be a scenario on the feature that owns the verb family it concerns — `command-spine.feature` is the contract every routed verb inherits and most migrations need only a scenario there — and a genuinely new feature is a new steps module too (the runner's convention), so both rows move together.",
  }),
  Object.freeze({
    directory: "test/integration/steps",
    counts: "direct-children",
    ceiling: 10,
    allowance: 0,
    why: "the integration step definitions — the one layer under `test/integration/` that grows a file per FEATURE rather than per subject, which is the shape this whole table meters. A tenth belongs beside the steps it shares a subject with. 9 -> 10 is story 128 adding `work-memory.steps.mjs`, and it is the tenth this row was written against, so the choice is STATED: the runner resolves a feature's steps BY CONVENTION from its basename (`features/<name>.feature` ↔ `steps/<name>.steps.mjs`, `test/integration/cli.mjs`), with one hard-coded legacy exception, so a feature file cannot share a steps module without a second exception in the runner — and the migrated verb owes its feature (task 00's last scenario names it). The module carries the common grammar and nothing of its own, which is what makes it a candidate for the fold this row wants: when the runner learns to resolve a feature onto a shared subject module, this file goes.",
  }),
  Object.freeze({
    directory: "test/support",
    counts: "direct-children",
    ceiling: 48,
    allowance: 0,
    why: "THE LARGEST UNENTERED LAYER the contract names — 66 files when it was measured, 68 after 119/00 added `census-carrier-plants.mjs` and `module-family.mjs`. A shared helper is exactly the file everybody adds and nobody groups, and it is inside the tree item 63 governs; a 69th belongs in a subject directory under `test/support/` rather than beside the other 68. 142/09 moved owned suites out to their workspace (68 -> 66); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved the UI test harnesses and their suites out to apps/ui/test (66 -> 48); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/arch/assignment",
    counts: "direct-children",
    ceiling: 29,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 28 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on an existing assignment suite — the lifecycle is one subject and its edges (admission, reclaim, withdrawal, worktree) already have homes here — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/arch/audit",
    counts: "direct-children",
    ceiling: 18,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 17 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a lane on an existing audit suite; the census, the instrument sweep and the control-derives guard are three files and a fourth audit *subject* is rare — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/arch/bundle",
    counts: "direct-children",
    ceiling: 24,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 23 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite that owns the artefact it concerns — the manifest, the installer, the adapters and the hooks each already have one — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. This row is also held from BELOW by 124/02's FF-12405 leg 10, which freezes the parity controls here at 23 with a ceiling that may only fall — so a new control of another subject that happens to concern a shipped artefact goes to its subject's directory, never here (story 125 first placed two here, and moved them).",
  }),
  Object.freeze({
    directory: "test/arch/command",
    counts: "direct-children",
    ceiling: 25,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 22 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the command's own family; a new file here should mean a new command LAYER, not a new command — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 23 -> 24 is story 128 adding `acd-work-memory-routed.test.mjs`, and it is what this row says a new file here should mean: a new command LAYER. `packages/core/src/commands/work/` is founded by that story (its own row above), and this control is the structural half of the founding — the ladder door closed behind the migrated verb, the help tail, the four frozen lists that moved, the printer ratchet that fell, and 125's README control gone green — none of which is a case on any one command's existing suite. 24 -> 25 is story 125 adding `acd-readme-names-what-ships.test.mjs`, first placed under `test/arch/bundle/` and moved here before it landed: the README may not name a command that does not resolve, and the resolver is `deriveRouteTable` — a control on the route table is a control of this subject. Under `bundle`, 124/02's FF-12405 leg 10 holds the parity controls at 23 with a ceiling that may only fall; that freeze was never about a README control, and the answer to it is the right directory rather than a raised ceiling.",
  }),
  Object.freeze({
    directory: "test/arch/grade",
    counts: "direct-children",
    ceiling: 24,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 23 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the grade record, the rubric or the acceptance-horizon suite; the evidence rules are one subject and adding a file splits an argument across two — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/arch/graph",
    counts: "direct-children",
    ceiling: 17,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 16 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the driver, the normalizer or the impact suite — the graph surface is three seams and its controls belong on them — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/arch/loop",
    counts: "direct-children",
    ceiling: 66,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 49 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the loop registry, the record or the ladder suite; this is the largest subject in the tree and a new file here needs to name which of those it is not — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 50 -> 51 is milestone 124 story 01 adding `acd-cap-exhaustion-returns-to-the-plan.test.mjs` (FF-12404), and it names which of the three this row asks for: the LADDER suite — the cycle-cap decision that ends a range, moved out of the shell into the engine the ladder already consults. A control on an existing subject of this directory rather than a new one. 51 -> 53 is milestone 126 story 00 adding `acd-clock-counts-attempts.test.mjs` (FF-12601) and `acd-loop-narrates-in-flight.test.mjs` (FF-12602), and both name which of the three this row asks for: the LADDER suite, twice. FF-12601 is the bound that ENDS a range — `scheduleToClose` measured over the attempt series the ladder already retries, rather than over a wall clock that keeps running while nothing does. FF-12602 is that same ladder REPORTING itself while it is still running, through the one printer it already owns. Neither touches the loop registry or the record, so neither is a new subject. They arrive together because the story is one story: the clock and the narration land in the same two files, and the second could never wave before the first. 53 -> 54 is milestone 126 story 02 adding `acd-declaration-predicate-is-composed.test.mjs` (FF-12604), and it names which of the three this row asks for: the LADDER suite — one pure decider says which declarations should be running on this node now, composing verdicts the run store owns and naming none of them. A control on an existing subject of this directory, not a new one. 54 -> 55 is story 125 adding `acd-site-is-projected-not-copied.test.mjs`, first placed under `test/arch/bundle/` and moved here before it landed, and it names which of the three: the RECORD — the loop document is the registry's committed projection, and this is the placement control on its readership (the site builder reaches `loopDocumentPath` from outside the `packages/core/src/` walk `acd-loop-document-current` asserts over, spells no basename, and nothing under `docs/` is a copy of the document). It shares its predicate with the reader-set control it now sits beside; `bundle` was the wrong home, and 124/02's FF-12405 leg 10 (a ceiling that may only fall) is what said so. 55 -> 59 is milestone 129 story 05 adding the four files its register declares — `acd-loop-concurrency-single-home.test.mjs` (FF-12901), `acd-loop-family-boundary.test.mjs` (FF-12902, FF-12906), `acd-lane-records-and-the-declaration.test.mjs` (FF-12903, FF-12907) and `acd-lane-grade-is-lane-scoped.test.mjs` (FF-12905) — and every one names which of the three this row asks for: the LADDER, four times. The wave tick is the ladder run in worktree lanes (129/ADR-008), and these are the controls on where its grade is taken, whose record a lane writes, what declaration it rides and what the family may reach; the seventh control, FF-12904, is an extension of `test/arch/grade/acd-gate-propagation-never-discards` and moves no row. Exactly the four, by the story's own count, so the delta is asserted and never the literal. 59 -> 62 is milestone 130 story 05 adding the three files its register declares — `acd-loop-stop-request-single-home.test.mjs` (FF-13001, FF-13003), `acd-loop-stop-settles-the-run.test.mjs` (FF-13002, FF-13004) and `acd-loop-stop-reaches-every-face.test.mjs` (FF-13005, FF-13006, FF-13007's node leg) — and every one names which of the three this row asks for. The RECORD, twice: the stop request is one file under the aof home keyed by the loop's id (130/ADR-001), the verb that writes it is a probe-shaped write through one core (ADR-002), and the loop's presence entry is the record every face reads — carried additively by the same pass as `activeRuns`, rendered as a local-only button that reaches one route, spawned by the desktop from an argv formed in core (ADR-004 §3, ADR-005). The LADDER, once: what the shell does after a drive returns under an interrupt — settle first, always, so a cancelled session settles `cancelled` and no `running` row is leaked (ADR-003) — and what the declarations engine answers for a loop the operator stopped (ADR-004 §4). Exactly the three, by the story's own count: the register wrote `55 -> 58` on 2026-09-13, before 129/05's four landed, and the DELTA is the invariant it states, never the literal. 62 -> 65 is milestone 131 story 06 adding the three files its register declares — `acd-loop-ask-single-home.test.mjs` (FF-13101, FF-13102, FF-13103), `acd-loop-ask-waits-in-place.test.mjs` (FF-13104, FF-13105) and `acd-loop-ask-reaches-every-face.test.mjs` (FF-13106 to FF-13109) — and every one names which of the three this row asks for. The RECORD, twice: the ask a waiting session leaves is one file under the aof home keyed by its run, read off the transcript by one reader, and carried on the run record as `asks` without making the run reclaimable or charging the wait (131/ADR-001 §4, ADR-002, ADR-003); and the notifier, the one zero-import form and the guarded answer route are how every face reads and writes that record (ADR-005, ADR-006). The LADDER, once: what the loop does with a drive that stopped to ask — the answer resumes the same session as a command, and a waiting lane holds its slot and parks at the bound while the wave builds on (ADR-001, ADR-004). Exactly the three, by the story's own count, measured as the delta over the 62 this row read when the story was built. 65 -> 66 is milestone 131 story 10 founding `acd-loop-ask-answered-from-discord.test.mjs` (FF-13111, FF-13112; story 11 appends FF-13113 to it) — the RECORD once more: a Discord reply is one more face that writes the ask, through one gateway connection and one allowlisted `work:answer` (ADR-008). One file, by the register's own count.",
  }),
  Object.freeze({
    directory: "test/arch/memory",
    counts: "direct-children",
    ceiling: 22,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 18 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the recall, the digest or the index suite — the memory backend is one seam behind three faces and the faces already have files — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 19 -> 20 is milestone 124 story 02 adding `acd-learning-edge-reaches-every-cut.test.mjs` (FF-12405), and it is a control on this subject rather than a new one: the learning edge — which commands recall accumulated lessons, and whether the form they spell exists in the memory module's own parse surface. This directory already holds the controls over the memory index and its recall; this is the one that asks the same question of the CUT-MAKING commands, which is a case on an existing subject rather than a new subject needing its own row. 20 -> 22 is milestone 148: 148/01's acd-memory-retrieval-eval.test.mjs (FF-14801, the ranking held by a fixed eval over the live corpus) and 148/05's acd-memory-layer-map-total.test.mjs (FF-14803, every record type has a layer and status accounts for every record) — two controls on this subject whose red probes are different edits to different files.",
  }),
  Object.freeze({
    directory: "test/arch/mesh",
    counts: "direct-children",
    ceiling: 50,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 46 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the mesh seam it concerns; the mesh subject is deep enough to have its own second level under test/, and an arch control should name which seam it guards — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 47 -> 48 is milestone 126 story 02 adding `acd-declarations-ride-the-one-data-command.test.mjs` (FF-12605): the loop argv gets one zero-import home and the declarations answer rides `mesh status`, which 36/ADR-004 §2 makes the supervisor's ONE data command. A control on this directory's existing subject — what the mesh commands may and may not become — rather than a new one. 48 -> 49 is 126/04 adding `acd-autostart-is-one-injected-runner.test.mjs` (FF-12607): ONE control, on this directory's existing subject — what the mesh commands may and may not become — for the one mesh verb that now writes OUTSIDE aof entirely, into the login registry. Its BEHAVIOUR is driven over fakes in `test/mesh/desktop/`; what lands here are the absences a passing test cannot see, and the reason they need a sweep is exact: a direct spawnSync of `reg` added beside the injected runner leaves every behavioural test green while CI and an operator's machine reach the real hive. 49 -> 50 is 132/03 adding `acd-run-records-name-no-machine.test.mjs`: ONE control on this directory's existing subject — what the mesh may publish — the guard that no tracked `runs/<node>/` segment or run-record `node` key names a machine. It shipped in 132's accept commit without its row, and 133's gate raised the row with this reason (aof:verify 133).",
  }),
  Object.freeze({
    directory: "test/arch/notion",
    counts: "direct-children",
    ceiling: 15,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 14 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the sync, the descriptor or the mapping suite — the vendor surface is deliberately narrow and its controls should stay on it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/arch/planning",
    counts: "direct-children",
    ceiling: 36,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 34 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the tune, proposal or headroom suite; the planning family is a pipeline and a new file should be a new STAGE, which is an ADR-level act — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 35 -> 36 is 124/00 adding `acd-contract-set-has-one-home.test.mjs` (FF-12403), the control over the declared contract set having ONE home and `ready-wave` adopting its coverage predicate. A control on the declared-contract stage of the planning pipeline, which is the STAGE-shaped growth this row asks the next file to be.",
  }),
  Object.freeze({
    directory: "test/arch/run",
    counts: "direct-children",
    ceiling: 24,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 22 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the run-store, the lifecycle or the outcome suite — the run record is one shape and its controls belong beside the leg they constrain — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 23 -> 24 is milestone 126 story 01 adding `acd-run-status-renders-the-record.test.mjs` (FF-12603), and it names which of the three this row asks for: the RUN RECORD's own shape — that the human face may now name every key the record holds while the machine document gains none, which is 53/ADR-004 narrowed in the open rather than worked around. A control on an existing subject of this directory, not a new one.",
  }),
  Object.freeze({
    directory: "test/arch/session",
    counts: "direct-children",
    ceiling: 35,
    allowance: 0,
    why: "119/03 established this session-control layer. 154/00 adds FF-15401: native protocol and transcript ownership stay behind the shared session boundary, an identity and attribution constraint across runtime adapters. The ceiling is the delivered 33 files with zero allowance. Further assertions on this boundary belong in that control; a different subject requires its own ownership decision and directory rather than an unreasoned sibling. 154/01 adds acd-runtime-choice-owner.test.mjs (FF-15402), the one-owner control for execution choices and resume provenance. Future ownership cases extend this control. 154/02 adds FF-15403, an executable permission refusal and actual-source bypass control.",
  }),
  Object.freeze({
    directory: "test/arch/store",
    counts: "direct-children",
    ceiling: 18,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 15 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the global-store, the cache or the lock suite — the durable stores are three and a fourth file here should mean a fourth store — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 154/04: 17 -> 18 for FF-15404, the install lock ownership boundary across native Codex files and their recovery intent; this is the lock suite subject and further assertions extend this control, with zero allowance. 16 -> 17 is 126/05 adding `acd-sqlite-runtime-has-one-home.test.mjs` (FF-12608). The row said a fourth file here should mean a fourth STORE, and this is not one — it is a control over the RUNTIME the existing stores are built on, which is the subject this directory already guards from the other side (`acd-publish-on-mutate-ledgered`, `acd-shared-store-concurrency`). It is one file rather than two because its three claims are one rule read at three depths: the runtime has one import home, that home's filter is targeted and restored, and no blanket flag exists to make the home pointless.",
  }),
  Object.freeze({
    directory: "test/arch/testing",
    counts: "direct-children",
    ceiling: 10,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 9 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the registration, the selection or the budget suite; a control about the test tree that fits none of those is the rarest file in this repository and deserves the pause — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/arch/ui",
    counts: "direct-children",
    ceiling: 35,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 32 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the surface it concerns — the board, the fleet, the home shell and the terminals each already carry one, and design conformance is its own — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 33 -> 34 is 126/03 adding `acd-desktop-supervises-a-supplied-set.test.mjs` (FF-12606): ONE control, on the surface it concerns — the desktop supervisor, which already carries four here — asserting the absences `cargo test` cannot see, because `apps/desktop/Cargo.toml`'s workspace EXCLUDES `crates/app` and a Rust test written beside the spawning code would never run. It is one file rather than two because ADR-006 §8's spawn-roster half is NOT a new control: it is an EXTENSION of `acd-desktop-read-only-fleet.test.mjs`, in that control's own file, as a second exported binding the index spreads — the sibling-control species this tree keeps refusing, refused again here rather than budgeted for. 34 -> 35 is milestone 133 story 04 adding `acd-diagram-rendered-as-image.test.mjs` (FF-13304): a control on this directory's existing subject — what the board may render and how — for the one GENERATED body the board now shows. Refine read this row as having a free slot; it had none, so the rise is stated here.",
  }),
  Object.freeze({
    directory: "test/arch/work",
    counts: "direct-children",
    ceiling: 50,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 40 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the work-stream act it constrains; this subject has a second level under test/ for the same reason, and an arch control should name record, stream, gate or lifecycle — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 41 -> 43 is 124/00 adding `acd-census-reports-its-denominator.test.mjs` (FF-12401) and `acd-advisory-lane-never-gates.test.mjs` (FF-12402). Two controls, and each names the work-stream act it constrains: the depends census stating its own denominator, and the gate an advisory lane may not reach. Two rather than one because they constrain different acts — a report and a gate — and folding them into one file would be one control asserting two unrelated things. 43 -> 46 is 127/01 landing FF-12701 (`acd-work-root-one-enumerator.test.mjs`), FF-12702 (`acd-number-null-safe.test.mjs`) and FF-12706 (`acd-next-walkers-exclude-archived.test.mjs`) — three controls, each named by the milestone register and each constraining a different work-stream act: the ONE enumerator (no second `readdir` + item-name pairing outside `packages/core/src/work.mjs`), the null-safety of every `.number` consumer once a row may carry none, and which walkers filter through the live-row predicate. Three rather than one because their red probes are different edits to different files, and a stream act is what this row asks a control to name. 46 -> 48 is 127/02 landing FF-12703 (`acd-one-mint.test.mjs`) and FF-12704 (`acd-intake-write-side-only.test.mjs`) — two controls named by the milestone register, each constraining a different work-stream act: the ONE mint (`appendPosition` exported from one home and called from exactly the promote family; no `insert-*` computes a number of its own) and the intake read on the WRITE side only (`work.intake` seen by the scaffold path, `init` and `promote`, and by no reader). Two rather than one because their red probes are different edits to different files — `max + 1` inside `insert-milestone.mjs` against `listItems` skipping `backlog/` under a stream intake. 48 -> 49 is 127/03 landing FF-12705 (`acd-archive-never-renumbers.test.mjs`) — one control named by the milestone register, constraining the work-stream act it names: the archive touches no number (closed import sets for the face and the engine, the transitive path to the reindex engine crossing the seam and nothing else, no `number:` write, a rewriter that matches link syntax only, and the command calling the seam rather than the engine). 49 -> 50 is 148/02 landing FF-14802 (acd-memory-vocabulary-one-home.test.mjs): the meta-label grammar and the gap-status token spelled only in the vocabulary module, and the retrospective prompt and OUTCOME template naming exactly its enums.",
  }),
  Object.freeze({
    directory: "test/assignment",
    counts: "direct-children",
    ceiling: 4,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 4 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on an existing assignment suite — the lifecycle is one subject and its edges (admission, reclaim, withdrawal, worktree) already have homes here — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (5 -> 4); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/audit",
    counts: "direct-children",
    ceiling: 6,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 5 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a lane on an existing audit suite; the census, the instrument sweep and the control-derives guard are three files and a fourth audit *subject* is rare — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/bundle",
    counts: "direct-children",
    ceiling: 24,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 29 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite that owns the artefact it concerns — the manifest, the installer, the adapters and the hooks each already have one — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 30 -> 31 is story 125 adding `site-build.test.mjs`: the static lint over the Pages workflow (`.github/workflows/pages.yml`, in `release-workflow-lint`'s idiom) and the rows that drive the staging step (`scripts/site/build-site.mjs`), including the gate run the way the workflow runs it. One file rather than two because the workflow and the builder are the two halves of one publishing path, and a row about the gate has to read both. 31 -> 32 is milestone 133 story 05 adding `bundle-architect-draws.test.mjs`: the bundle PROSE suite for the architect rule and refine Decide's one diagram step (ADR-008) — its subject is what the bundle tells an agent, which is this directory's, and it reads the six rendered copies beside the sources. Every ceiling here equals its count, so the rise is stated rather than assumed. 32 -> 33 is story 137 adding `digest-template-ships.test.mjs`: the shipped `AOF.md` template is a bundle artefact with no suite of its own to take a case, so its ship-and-render check is this directory's subject; landed without this row and raised at milestone 130's gate. 33 -> 34 is the Yarn migration adding `yarn-installation.test.mjs`: repository dependency auditing, lockfile safety and copied production dependency closure are one installation boundary, distinct from assistant asset-package rendering. 34 -> 35 is Plan 03 adding core-workspace.test.mjs: the actual installer payload runs from a path with spaces without source aliases or optional apps, preserving all command descriptors and child entry points. Further core packaging cases belong in that suite. 142/09 moved owned suites out to their workspace (34 -> 25); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (25 -> 23); a ceiling that shrinks with the tree is the ratchet working, never headroom. 23 -> 24 is story 150 adding `explain-command.test.mjs`: the prose suite for `/aof:explain`, a new bundle command with no existing suite to take its cases; landed without this row and raised at 151, whose run of this guard first met it.",
  }),
  Object.freeze({
    directory: "test/command",
    counts: "direct-children",
    ceiling: 10,
    allowance: 0,
    why: "142 Plan 02 adds application-assembly.test.mjs for the new application construction layer: descriptor parity, isolated instances, shared transports and resource cleanup. created by 119/03's own diff and budgeted in it: the 10 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the command's own family; a new file here should mean a new command LAYER, not a new command — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 11 -> 12 is story 128 adding `work-memory-command.test.mjs`, the behavioural half of founding `packages/core/src/commands/work/` (the new command LAYER this row asks a new file to mean): the door's route resolution, the byte-identity of every verb's render against the ladder it replaced, the `--json` shapes, the zero-byte empty block, the adapter's parsing rules and the coded refusals — driven through the real CLI and the seam, not a case on any existing command's suite. 142/09 moved owned suites out to their workspace (13 -> 12); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (12 -> 10); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/grade",
    counts: "direct-children",
    ceiling: 24,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 27 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the grade record, the rubric or the acceptance-horizon suite; the evidence rules are one subject and adding a file splits an argument across two — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (27 -> 26); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (26 -> 24); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/graph",
    counts: "direct-children",
    ceiling: 11,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 13 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the driver, the normalizer or the impact suite — the graph surface is three seams and its controls belong on them — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (14 -> 13); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (13 -> 12); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (12 -> 11); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/loop",
    counts: "direct-children",
    ceiling: 63,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 68 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the loop registry, the record or the ladder suite; this is the largest subject in the tree and a new file here needs to name which of those it is not — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 69 -> 70 is milestone 126 story 00 adding `loop-command-narration.test.mjs`, the DRIVEN half of FF-12602, and it names which of the three this row asks for: the LADDER suite — what reaches the operator while a drive or a gate is still pending, and what `--quiet` does and does not silence. It is split from its structural half because a walk's behaviour is measured by walking and a claim about the tree by reading it, not because it is a new subject. 70 -> 71 is milestone 126 story 02 adding `work-loop-declarations.test.mjs`, the DRIVEN half of FF-12604: the predicate walked over literal run records, with the store's own `isRunning`, `isStale` and `retryReadiness` handed in rather than substituted. The LADDER suite again, and split from its structural half for the reason every such pair is split here. 71 -> 72 is `loop-diag.test.mjs` (2026-09-11), the exit-reason recorder's suite: the loop command is what installs it, so its cases sit beside the command's, driven against an injected process double so no real listener outlives the runner. 72 -> 74 is milestone 129 story 04 adding `loop-command-wave.test.mjs` and `loop-command-reconcile.test.mjs` — the LADDER suite again, twice: the wave tick (the ladder extracted to `packages/core/src/loop/cycle.mjs`, the lanes, the per-base baseline, the wave run, dispatch's admission) and what surrounds it (the three phases, the fresh gate, the signals, the deadline, the resume reconciliation), split by subject because one file over ~100 scenarios of a real git repo is a file nobody reads. 142/09 moved owned suites out to their workspace (70 -> 64); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (64 -> 63); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/memory",
    counts: "direct-children",
    ceiling: 11,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 10 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the recall, the digest or the index suite — the memory backend is one seam behind three faces and the faces already have files — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 11 -> 12 is story 137 adding `import-digest-template.test.mjs`, the import's render through the shipped template — landed without this row and raised at milestone 130's gate; by this row's own rule it is a case the digest suite could absorb, which is the fold the next change here should make. 142/09 moved owned suites out to their workspace (11 -> 9); a ceiling that shrinks with the tree is the ratchet working, never headroom. 9 -> 11 is milestone 148: 148/01's retrieval-eval.test.mjs (the eval's runner and its pair table) and 148/05's memory-status.test.mjs (status composed at the seam: types, layers and conformance on every backend) — the status face had no suite of its own to take the case.",
  }),
  Object.freeze({
    directory: "test/mesh",
    counts: "direct-children",
    ceiling: 23,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 23 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the mesh seam it concerns; the mesh subject is deep enough to have its own second level under test/, and an arch control should name which seam it guards — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/assignment",
    counts: "direct-children",
    ceiling: 9,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 8 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on an existing assignment suite — assign, withdraw, the directive and the reclaim are four files and the fifth act is rare — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/clone",
    counts: "direct-children",
    ceiling: 16,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 16 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the credential or the checkout suite; the clone path is one flow and splitting it further hides the order its steps run in — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (17 -> 16); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/desktop",
    counts: "direct-children",
    ceiling: 7,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 4 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the install, run or stop suite — the desktop supervisor has three verbs and a fourth is a product decision — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 5 -> 6 is 126/04 adding `mesh-desktop-autostart.test.mjs`. The row said the next file should be a case on the install, run or stop suite and that a fourth VERB is a product decision — and autostart is deliberately NOT a fourth verb: ADR-007 §1 makes it two flags on `install`, because the act is part of installing and a separate `aof mesh desktop autostart` would be a second door to one act. The suite is its own file rather than a section of the install suite because its fixture is a different KIND: a fake that models the Run key's prior state, where the install suite's fixture is a temp install dir. The preflight, which belongs to install and run alike, went into those two suites instead. 6 -> 7 is 126/06 adding mesh-desktop-preflight-heartbeat.test.mjs. The row's own guidance said the next file should be a case on the install, run or stop suite, and this one deliberately is not: the preflight belongs to install AND run alike, so its cases had nowhere to live that was not one of two places. 126/04 put the three-check preflight into BOTH suites for exactly that reason; 126/06's fourth check would have made that duplication a third time, so the preflight's own cases get the one file the subject always wanted, and the shared preflightProbes fixture stays where the install suite already owns it. The next file here is still a case on an existing suite.",
  }),
  Object.freeze({
    directory: "test/mesh/enrollment",
    counts: "direct-children",
    ceiling: 4,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 4 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the invite, join or revoke suite; enrollment is a three-step protocol and a fourth file should mean a fourth step — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (5 -> 4); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/fleet",
    counts: "direct-children",
    ceiling: 8,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 8 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the projection or the render suite — the fleet view is a read model and its tests belong with the read they exercise — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (9 -> 8); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/identity",
    counts: "direct-children",
    ceiling: 8,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 7 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the node-identity or the staleness suite; identity derivation has one home in src/ and its tests should mirror that — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 8 -> 9 is milestone 126 story 02 adding `mesh-status-declarations.test.mjs`, the DRIVEN half of FF-12605: the flagless document proved byte-identical, and exactly one additive key when the flag is asked for. A case on this directory's existing subject — what `mesh:status` answers — not a new one. 142/09 moved owned suites out to their workspace (9 -> 8); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/launcher",
    counts: "direct-children",
    ceiling: 5,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 5 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the launcher or the coordination suite — the launcher is one seam with two callers — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (6 -> 5); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/presence",
    counts: "direct-children",
    ceiling: 3,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 6 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the record or the degradation suite; presence is one published shape and a new file here usually means a new FIELD, which belongs on the existing suite — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (6 -> 3); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/registry",
    counts: "direct-children",
    ceiling: 3,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 7 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the store-seam or the lifecycle suite — the registry is one atomic writer and its tests should stay next to it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (8 -> 6); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (6 -> 3); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/relay",
    counts: "direct-children",
    ceiling: 4,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 6 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the auth-gate, the fanout or the envelope suite; the relay is a transport and its three concerns already have files — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (7 -> 4); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/session",
    counts: "direct-children",
    ceiling: 7,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 9 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the per-session record, the ladder or the reaper suite — session lifetime is one story told in three parts — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (10 -> 7); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/terminal",
    counts: "direct-children",
    ceiling: 4,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 5 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the mirror, the relay-bridge or the input suite; the terminal path is a pipe and a new file should be a new STAGE of it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (6 -> 4); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/mesh/ui",
    counts: "direct-children",
    ceiling: 11,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 10 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the assign-route, the read-only-posture or the serve suite — the fleet face is one server with three postures — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/worker",
    counts: "direct-children",
    ceiling: 15,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 14 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the driver, the clone or the completion suite; the worker is 119/04's subject and its tests will move with the split, not multiply before it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/notion",
    counts: "direct-children",
    ceiling: 14,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 19 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the sync, the descriptor or the mapping suite — the vendor surface is deliberately narrow and its controls should stay on it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (18 -> 17); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (17 -> 14); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/planning",
    counts: "direct-children",
    ceiling: 10,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 16 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the tune, proposal or headroom suite; the planning family is a pipeline and a new file should be a new STAGE, which is an ADR-level act — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (15 -> 14); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (14 -> 12); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (12 -> 10); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/run",
    counts: "direct-children",
    ceiling: 24,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 27 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the run-store, the lifecycle or the outcome suite — the run record is one shape and its controls belong beside the leg they constrain — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 28 -> 30 is milestone 126 story 01 adding `run-status-render.test.mjs` and `run-status-document-frozen.test.mjs`, and both name which of the three this row asks for: the RUN RECORD's own shape, from the two sides that story has to keep apart. The first drives what the human render prints for a record — the sixteen keys it used to throw away, and the two time figures derived from the injected instant. The second drives the `--json` document through every one of its six answering paths, asserting it did NOT move. They are two files because they are two claims about one shape and a single suite would let a change to either read as a change to both; neither is a new subject. 142/09 moved owned suites out to their workspace (30 -> 24); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/session",
    counts: "direct-children",
    ceiling: 15,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 36 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the identity, the attribution or the transcript suite; a session control that fits none of those is usually a mesh or a run control wearing a session name — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved UI-only suites out to apps/ui/test (36 -> 23); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (23 -> 21); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved the UI test harnesses and their suites out to apps/ui/test (21 -> 17); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (17 -> 15); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/store",
    counts: "direct-children",
    ceiling: 21,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 20 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the global-store, the cache or the lock suite — the durable stores are three and a fourth file here should mean a fourth store — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 21 -> 22 is 126/05 adding `sqlite-runtime.test.mjs`. The row said a fourth file here should mean a fourth STORE, and this is not one — it is the suite for the RUNTIME all three durable stores are built on, which is why it sits with them rather than beside either caller: its rows drive the projection store and the effects journal side by side, asserting that the two callers refuse DIFFERENTLY through one shared import home, and a suite that lived in either callers directory could only ever see half of that. 142/09 moved owned suites out to their workspace (22 -> 21); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/testing",
    counts: "direct-children",
    ceiling: 8,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 7 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the registration, the selection or the budget suite; a control about the test tree that fits none of those is the rarest file in this repository and deserves the pause — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (8 -> 7); a ceiling that shrinks with the tree is the ratchet working, never headroom. 7 -> 8 is story 144 adding `test-sharded-report.test.mjs`, a case on the REGISTRATION suite this row names: it drives the pure report module behind the sharded whole-tree run — a registered case the run lost, or ran red twice, is a column-0 `not ok`; a case red in the pool and green alone is a `# not isolated` comment; the slowest-files block sums each file across its chunks — without starting a pool. It is its own file because no suite here drives the sharded runner, and folding it into `test-command-contract` would make a change to the runner's accounting read as a change to `aof test`'s face.",
  }),
  Object.freeze({
    directory: "test/surfaces",
    counts: "direct-children",
    ceiling: 40,
    allowance: 0,
    why: "142 Plan 09 renamed this layer from test/ui: it holds the surfaces (board, fleet, shell, terminal) mounted against the real server, mesh and assembled application — integration, which is why it is not in apps/ui/test with the UI-only suites. created by 119/03's own diff and budgeted in it: the 55 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the surface it concerns — the board, the fleet, the home shell and the terminals each already carry one, and design conformance is its own — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 56 -> 57 is 127/04 adding `board-backlog-and-archive.test.mjs`: a case on the BOARD surface (the backlog region, the archive toggle and its mark) that also carries the fleet's one partition lane, over the REAL <Board/> and <Fleet/> mounted against their real faces — the surface this row says the next file here should be a case on, stated as this story's own suite in its STORY.md. 57 -> 58 is milestone 133 story 04 adding `board-diagrams.test.mjs`, the headless suite over `apps/ui/src/board/diagrams.mjs` (the ARCHITECTURE tab's figure states, markup and renderer), beside the board's other ramp suites (`board-freshness`, `board-action`) because it is one more of them. Refine read this row as having a free slot; every ceiling here equals its count, so the rise is stated rather than assumed. 142/09 moved UI-only suites out to apps/ui/test (58 -> 50); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (50 -> 49); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved the UI test harnesses and their suites out to apps/ui/test (49 -> 41); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (41 -> 40); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/work",
    counts: "direct-children",
    ceiling: 46,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 55 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the work-stream act it constrains; this subject has a second level under test/ for the same reason, and an arch control should name record, stream, gate or lifecycle — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 56 -> 57 is 124/00 adding `doctor-depends-lane.test.mjs`, the behavioural suite for the depends lane — a suite for the work-stream act it constrains, which is exactly the shape this row asks the next file to take. 57 -> 58 is 127/02 adding `work-intake-write-side.test.mjs`: the phase door's `phase-backlog-ref` refusal (`work:continue|refine|verify` over a backlog ref, 127/ADR-003 §7) and the mode-less READ side under all three intake settings (127/ADR-005) — a suite for the work-stream act it constrains, driven over 127/01's three-root fixture, and not a case on the promote suite because the act is the door and the readers, which promote does not own. 58 -> 59 is milestone 133 story 03 adding `doctor-diagrams-lane.test.mjs`, the ninth doctor lane's suite, beside its sibling lane suites (`doctor-depends-lane.test.mjs` and the rest) because a lane's behaviour is judged where the other lanes' is. Refine read this row as having a free slot; it had none, because every ceiling here equals its count, so the rise is stated here rather than assumed. 142/09 moved owned suites out to their workspace (58 -> 57); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (57 -> 52); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved the scope-flags/scope-fields agreement suite to @aof/knowledge, whose own memory module is its only subject (52 -> 51); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (51 -> 49); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (49 -> 44); a ceiling that shrinks with the tree is the ratchet working, never headroom. 44 -> 45 is 145 adding `loop-wave-plan.test.mjs`, the behavioural suite for the loop wave plan (`planLoopWaves` beside the files partition in `ready-wave.mjs`): a suite for the work-stream act it constrains, beside `story-context-contract.test.mjs`, which already judges that partition. Every ceiling here equals its count, so the rise is stated rather than assumed. 45 -> 46 is 146 adding `work-add-in-stream.test.mjs`, the suite for the capture act under a backlog intake (`--in-stream` on the five add prompts runs `aof work promote` straight after the scaffold): a suite for the work-stream act it constrains, beside `work-intake-write-side.test.mjs`, and not a case on it because that file is 127/02 task 04's traceability wiring. 146 shipped without this rise and the budget went red at verify; the rise is stated here rather than assumed.",
  }),
  Object.freeze({
    directory: "test/work/gate",
    counts: "direct-children",
    ceiling: 9,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 9 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the validate, doctor or grade suite — the gate ladder has a fixed number of rungs and a new file should mean a new rung — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 10 -> 11 is story 137 adding `work-validate-digest-template.test.mjs`, validate's closed key and section sets for a digest record doc — landed without this row and raised at milestone 130's gate; by this row's own rule it is a case the validate suite could absorb, which is the fold the next change here should make. 142/09 moved owned suites out to their workspace (10 -> 9); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/work/lifecycle",
    counts: "direct-children",
    ceiling: 10,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 15 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the run, status or dispatch suite; the item lifecycle is a state machine and its edges already have homes — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (15 -> 14); a ceiling that shrinks with the tree is the ratchet working, never headroom. 142/09 moved owned suites out to their workspace (14 -> 10); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/work/record",
    counts: "direct-children",
    ceiling: 4,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 4 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the record suite for the document it concerns; STORY, SPEC, STATE and VERIFICATION each have one and a fifth document is a refine act — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 142/09 moved owned suites out to their workspace (5 -> 4); a ceiling that shrinks with the tree is the ratchet working, never headroom.",
  }),
  Object.freeze({
    directory: "test/work/stream",
    counts: "direct-children",
    ceiling: 36,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 30 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the insert, reindex or promote suite — the stream's write acts are enumerable and a new one is an ADR — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 31 -> 32 is 127/01 adding `work-backlog-archive-enumerate.test.mjs`: the stream gained two ROOTS (`backlog/**`, `archive/`), and the suite drives the one three-root fixture through every executable scenario of the story's five task features — the enumerator, the live-row predicate on next/list, validate and doctor over the three roots, the mint and the shift set. It is one file rather than five because the fixture is one, and it is not a case on the insert, reindex or promote suite because the act it constrains is enumeration, which those suites consume rather than own. 32 -> 33 is 127/02 adding `work-promote-mints-the-number.test.mjs`, THE promote suite — the third of the three write acts this row itself names (insert, reindex, promote), which until 127/02 had no suite of its own because the verb did not exist. It drives the resolver, the mint, the stamp, the `--at` slot-open through the existing reindex engine and the depends check over the one three-root fixture; the insert-* aliases' cases land on the insert suite, as this row asks. 33 -> 34 is 127/03 adding `work-archive-is-a-move.test.mjs`, THE archive suite — the stream's fourth write act (insert, reindex, promote, and now archive), which until 127/03 had no suite because the verb did not exist. It drives the resolver and its refusals, the rename, the crossing-link rewrite, `--done` behind its gate, the `stream.archived` cascade and the fleet cache over the one three-root fixture extended with the archive fixture; a case on the promote suite would be a case on a different act. 34 -> 35 is 127/05 adding `work-this-tree-holds-what-is-live.test.mjs`, the outsider's check over the REAL stream rather than a fixture — the one suite in this lane that reads `wiki/work` itself (through the CLI as a child process and the real board face) after the one real `aof work archive --done`: the root is live items only, every resolving reader answers for the archived 52, every walker excludes it, the link ratchet pinned before the move holds, and the add → promote round trip is proved on a byte-faithful shape copy of the stream. It is not a case on the archive suite because that suite proves the VERB on a fixture and this one proves the TREE; the next accept that moves a folder is what this suite exists to stay green across. 35 -> 36 is 152 adding `work-promote-shows-candidates.test.mjs`, the suite for promote's two read-first modes (`--show-candidates` and `--next-item`): it drives the candidate order, the waiting list with its offenders and the mutual-exclusion refusals over the one three-root fixture. It is a sibling of the promote suite rather than a case on it because the act it constrains is choosing what to promote, which writes nothing, while that suite proves the mint.",
  }),
]);

// ── THE DECLARED EXEMPTIONS ──────────────────────────────────────────────────────────────
// Each one is a layer at or under FLAT_LAYER_THRESHOLD direct children. The reason is its
// SHAPE, and leg 6 re-checks the size claim on every run, so the list cannot quietly absorb a
// layer that has started growing.
export const SOURCE_DIRECTORY_EXEMPTIONS = Object.freeze([
  Object.freeze({ directory: "packages/execution/test/fixtures", why: "154/02: one public Codex protocol recording owned by the execution adapter suite; data below the flat-layer threshold, no growth allowance." }),
  Object.freeze({ directory: "packages/contracts/test", why: "142/06: contracts owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/work-loop/test/support", why: "142/09: shared story fixtures for @aof/work-loop's own suites (two root guards import it). No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/core/test/support", why: "142/09: assets-services.mjs builds the assets namespace from core's own assemblers for core's suites. No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/execution/test/support", why: "142/09: run-store.mjs builds the run store from @aof/execution's factory for its suites. No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/mesh/test/support", why: "142/09: mesh-services.mjs builds the mesh store, registry, relay and launcher lock from @aof/mesh factories for its suites. No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/work/test/support", why: "142/09: shared fixture for @aof/work's own suites (moved with its only workspace consumer; two root guards import it). No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/effects/test", why: "142/06: effects owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 4 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/foundation/test", why: "142/06: foundation owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/integration-notion/test", why: "142/06: integration-notion owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 6 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/messaging/test", why: "142/06: messaging owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 1 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/server/test", why: "142/06: server owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 2 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/work-graph/test", why: "142/06: work-graph owns its native and domain array suites; independent and aggregate executed counts are checked. No growth allowance. 5 files below the flat-layer threshold." }),
  Object.freeze({ directory: "packages/specification-by-example/test", why: "135/01 (ADR-001): specification by example owns its domain array suites — the map grammar and the seams it plugs into. No growth allowance. 3 files below the flat-layer threshold. 135/04: 3 -> 4, example-trace.suite.mjs (the trace's id readers and lane cases, ADR-004)." }),
  Object.freeze({"directory":"packages/contracts/src","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/effects/src","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/execution/src/terminal","why":"138/ADR-001: owned terminal implementations `screen.mjs`, `session-screen.mjs`, `claude-screens.mjs`; the size claim is checked."}),
  Object.freeze({"directory":"packages/foundation/src","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/knowledge/src","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/knowledge/src/commands","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/knowledge/src/import","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/knowledge/src/memory","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/server/src","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/server/src/commands","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/components","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/components/ui","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/config","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"apps/ui/src/lib","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work-graph/src","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/specification-by-example/src","why":"135/01 (ADR-001): the practice's own package — the map, the answers, the doctor lane, the story probe and the build-door check, each composed into @aof/work's neutral seams by core. 5 files below the flat-layer threshold; a sixth module states which part of the practice it is."}),
  Object.freeze({"directory":"packages/work-graph/src/commands","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work-loop/src/commands","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work-loop/src/trigger","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/acceptor","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/commands/diagram","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/diagrams","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/insertion","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/programs","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/promote","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/testing","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/work/src/tune","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/commands/diagram","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/commands/messaging","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/diagnostics","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/diagrams","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/discord","why":"142/06 retains only the four deliberate 131/10 DI compositions: gateway.mjs, bot.mjs, replies.mjs and commands.mjs. Messaging owns their implementations; this below-threshold assembly directory has no growth allowance."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/import","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/integrations","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/loop","why":"142/06 retains only deliberate loop composition below the flat-layer threshold. The ninth file child-drive.mjs and the loop-* root-leaf move from 129/02 are included; work-loop owns the implementations. No growth allowance."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/memory","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/notify","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/notion","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/spine","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/terminal","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/work-acceptor","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/work-audit","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/work-examples","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/work-trigger","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/application/bindings/work-tune","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/diagrams","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/effects","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/spine","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/src/work-audit","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),
  Object.freeze({"directory":"packages/core/bin","why":"142 Plan 06: this actual workspace source layer replaces compatibility locations. The ceiling equals its delivered file count, with no allowance; growth must state its ownership."}),

  Object.freeze({ directory: "test/fixtures/application", why: "142 Plan 02: one immutable baseline command inventory used by the assembly parity test; data, below the flat-layer threshold." }),
  
  
  
  // milestone 133 — the diagram family, founded by story 01 as FOUR exemptions rather than rows, on
  // 129's `packages/core/src/loop` precedent: a row's ceiling must equal its count, so rows would be edited by
  // stories 01 and 02 in turn. Each names its members through story 02, so 02 edits no budget line.
  
  
  Object.freeze({ directory: "test/diagrams", why: "milestone 133's diagram suites: the index, `diagram-layout`, `diagram-generator` and `diagram-plan-command` (story 01), and story 02's export and rasterizer suites — well under the threshold." }),
  Object.freeze({ directory: "test/arch/diagrams", why: "milestone 133's diagram controls: the index, FF-13301 `acd-diagram-generator-named-once` and FF-13302 `acd-diagram-layout-single-home` (story 01), and story 02's FF-13303 `acd-diagram-export-no-playwright` — four members, under the threshold." }),
  // milestone 134 — the work-examples family (ADR-002), founded by story 02 as THREE exemptions on
  // 133's diagram precedent. Each names every member the milestone plans for it, so stories 03, 04
  // and 05 add files without touching a budget line.
  
  Object.freeze({ directory: "test/examples", why: "milestone 134's example-map suites, seven by the milestone's end: the index, `example-map-parse` and `examples-config-gate` (story 02), `example-answers` (story 03), `doctor-examples-lane` and `continue-door-examples` (story 04), and `refine-discovery-beat` (story 05). Under the threshold of eight; an eighth is a case on one of these or a row." }),
  Object.freeze({ directory: "test/arch/examples", why: "milestone 134's example-map controls: the index, FF-13402 `acd-example-map-single-home` (story 02), FF-13401 `acd-example-answer-one-reader` and FF-13404 `acd-settle-reads-the-transcript-store` (story 03), and FF-13403 `acd-examples-off-is-today` (story 04); 135 adds FF-13501 `acd-sbe-package-one-way` (135/01) and FF-13502 `acd-example-trace-declared` (135/04). Seven members, under the threshold." }),
  // milestone 138 — the terminal family (138/ADR-001 §6), founded by story 00 as FOUR exemptions on
  // 133's precedent. Each names every member the milestone plans for it, story 01's included, so 01
  // adds its files without touching a budget line. A member named here and not yet landed is not a
  // violation; only an absent DIRECTORY is (the stale-exemption rule).
  
  Object.freeze({ directory: "test/terminal", why: "milestone 138's screen suites (138/ADR-001): `index.mjs`, `screen-model`, `session-screen-ready`, `session-screen-verdicts` and `session-screen-evidence` (story 00), and story 01's `claude-screens-registry` — six members, under the threshold." }),
  Object.freeze({ directory: "test/arch/terminal", why: "milestone 138's screen controls (138/ADR-001): `index.mjs`, FF-13801 `acd-screen-has-one-reader` (story 00) and story 01's FF-13802 `acd-screen-registry-is-recorded` — three members, under the threshold." }),
  Object.freeze({ directory: "test/fixtures/claude-screens", why: "the recorded claude screens (138/ADR-001 §6, ADR-003 §7) — data the screen suites replay, not a layer of modules: `ready`, `first-run` and `usage-limit` (story 00), story 01's `trust`, `mcp-approval` and `login`, and `ready.classic` (the classic renderer's box, recorded at 138's verify) — seven `.json` recordings, under the threshold." }),
  // milestone 131 — the notify family (ADR-005 §2), founded by story 02 as TWO exemptions on 133's
  // precedent, each naming its members so no later story edits a budget line to land one.
  
  Object.freeze({ directory: "test/notify", why: "milestone 131's notify suites: the index, `notify-form` (task 01), `notify-channels` (tasks 02, 03, 05 and 06) and `notify-discord` (task 04), and story 08's `notify-messaging` (the `aof messaging` family and its store) — five members, under the threshold." }),
  // milestone 131 / story 10 — the Discord bot's inbound family (ADR-008), founded as TWO exemptions
  // naming story 11's members ahead of time (the `packages/core/src/loop` precedent), so 11 edits no budget line.
  
  Object.freeze({ directory: "test/discord", why: "milestone 131's Discord bot suites (131/10, 131/11): the index, `discord-fixture.mjs` (the fake gateway, the fake clock and the reply background, shared with `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` because `test/support` is at its ceiling), `discord-bot` (task 00), `discord-gateway` (task 01), `discord-replies` (task 03) and story 11's `discord-commands` — six members, under the threshold." }),
  // milestone 131 / story 08 — the `aof messaging` family (ADR-005 §1, as amended at 131/08), founded
  // as an exemption at one member on `packages/core/src/commands/diagram`'s precedent, because the `packages/core/src/commands`
  // row is at its ceiling with an allowance of 0 and a 70th flat sibling is what that row refuses.
  
  
  
  
  
  
  
  
  Object.freeze({ directory: "test/fixtures", why: "a fixture ROOT whose members live in subdirectories; its direct children are not a flat layer of suites." }),
  // The depth-2 layers the recursive walk surfaces that are UNDER the threshold. Each is a leaf
  // of a directory that already carries a row or an exemption, and each is re-checked for size
  // on every run by the same rule as every other exemption.
  Object.freeze({ directory: "test/fixtures/graph", why: "one graph fixture — data a suite reads, not a layer of modules, and the only member of its parent that is a directory at all." }),
  Object.freeze({ directory: "test/fixtures/rubric-reports", why: "eight rubric report fixtures — data the rubric suites read, not a layer of modules." }),
  Object.freeze({ directory: "test/integration/support", why: "seven integration helpers, under the threshold." }),
  Object.freeze({ directory: "test/integration", why: "four integration suites plus their subdirectories — a bounded layer under the threshold." }),
  // 119/03 — the first subject directory under `test/support/`, and the row above asked for it by
  // name: `test/support` was at its ceiling of 68 and its `why` says a 69th belongs in a subject
  // directory rather than beside the other 68. Two helpers answer one question — where a suite
  // lives, and whether it is registered — so they are that directory. Exempt on SIZE, and leg 6
  // re-checks the claim: a third file here is admissible, a ninth is a row.
  Object.freeze({ directory: "test/support/workspace", why: "142 workspace migration: copied-work-runtime.mjs owns isolated source/workspace mutation fixtures; one member below the flat-layer threshold." }),
  Object.freeze({ directory: "test/support/registration", why: "the two suite-location helpers — `registration-surface.mjs` (where a suite may be registered) and `cited-suite-path.mjs` (where a cited suite resolves). One question, two readers, well under the threshold." }),
  // 129/04 — the third subject directory under `test/support/`, born for the same reason the two
  // above were: `test/support` is at its ceiling and its row asks that the next helper land by
  // subject. One member, the wave's real-repo fixture; leg 6 re-checks the size claim on every run.
  Object.freeze({ directory: "test/support/loop", why: "milestone 129 story 04: `lane-fixture.mjs`, the wave tick's fixture — a REAL git repo carrying a milestone whose stories the loop fans into worktree lanes, plus the injected child, registry, timers and signal seams the wave is driven through. One member, well under the threshold; a second helper here is admissible, a ninth is a row." }),
  Object.freeze({ directory: "test/support/workflow", why: "story 125 (at review): the ONE read boundary for a static lint over a checked-in GitHub Actions workflow — `workflow-lint.mjs` (CRLF normalisation, then the per-line comment strip, in that order for a measured reason). Two readers, the Pages lint and the release lint it was copied from. A subject directory rather than a 69th flat sibling because the `test/support` row above asks exactly that of the next helper; one member, well under the threshold." }),
]);

// ── THE LISTING ──────────────────────────────────────────────────────────────────────────
// A flat array of `{ dir, name, kind }` over `src`, `test` and each of their direct
// subdirectories. It is DATA, which is what lets a probe synthesize one and hand it to the
// same detector the real assertion uses.
export async function readTreeListing(roots = [...workspaceSourceRoots(repoRoot).map(entry => entry.directory), "packages/core/assets", "test", ...workspaceTestInventory(repoRoot).filter(owner => owner.native.length || owner.suites.length).map(owner => path.relative(repoRoot, path.join(owner.directory, "test")).replaceAll("\\", "/"))]) {
  // RECURSIVE, and that is a correction rather than a flourish (119/01 review). This descended
  // one level, so a directory at depth 2 was invisible to leg 2 — while the rows below tell the
  // next two stories to put their partitions at exactly that depth. A control that meters flat
  // layers and cannot see one level down is item 78's blind spot rebuilt inside its own remedy.
  const listing = [];
  const walk = async (rel, depth = 1) => {
    for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
      listing.push({ dir: rel, name: entry.name, kind: entry.isDirectory() ? "dir" : "file" });
      // The guard is on the CURRENT directory, not the child: `packages/core/assets/` is itself a row and
      // must be listed, and it is its SUBTREE that is out of scope.
      if (entry.isDirectory() && (depth < LAYER_DEPTH || roots.some(root => root !== "test" && (rel === root || rel.startsWith(root + "/")))) && !SUBTREE_OUT_OF_SCOPE.has(rel)) {
        await walk(`${rel}/${entry.name}`, depth + 1);
      }
    }
  };
  for (const root of roots) await walk(root);
  return listing;
}

function layersIn(listing) {
  const layers = new Map();
  for (const entry of listing) {
    if (!layers.has(entry.dir)) layers.set(entry.dir, []);
    layers.get(entry.dir).push(entry);
  }
  return layers;
}

/**
 * THE SHIPPED DETECTOR. Returns `{ violations, report }` — the violations are the refusals, the
 * report is the non-failing summary a green run leaves behind as evidence rather than silence.
 */
export function sourceDirectoryBudget(listing, table = SOURCE_DIRECTORY_BUDGETS, exemptions = SOURCE_DIRECTORY_EXEMPTIONS) {
  const layers = layersIn(listing);
  const budgets = new Map((table ?? []).map((entry) => [entry.directory, entry]));
  const exempt = new Map((exemptions ?? []).map((entry) => [entry.directory, entry]));
  const violations = [];
  const rows = [];

  const measure = (directory, counts) => {
    const entries = layers.get(directory);
    if (entries == null) return null;
    const predicate = COUNTING_RULES[counts] ?? COUNTING_RULES["direct-children"];
    return entries.filter((entry) => entry.kind === "file" && predicate(entry.name)).length;
  };

  // (1) EVERY ROW, against the tree. A subject that is gone is a failure, never a skip.
  for (const budget of table ?? []) {
    const measured = measure(budget.directory, budget.counts);
    if (measured === null) {
      violations.push({
        directory: budget.directory,
        measured: null,
        ceiling: budget.ceiling,
        message: `${budget.directory}/ is named in this gate's table and is NOT in the tree. A budgeted subject that no longer exists is a FAILURE, not a skip: the table and the tree must agree in both directions, and a row guarding a directory nobody has reads green while guarding nothing (ADR-009 leg 4).`,
      });
      rows.push({ directory: budget.directory, measured: null, ceiling: budget.ceiling, allowance: budget.allowance });
      continue;
    }
    if (measured > budget.ceiling) {
      violations.push({
        directory: budget.directory,
        measured,
        ceiling: budget.ceiling,
        message: `${budget.directory}/ holds ${measured} counted children, over its ceiling of ${budget.ceiling}. ${budget.why} Raising this number is a decision that needs a stated reason in this table — not a diff.`,
      });
    } else if (measured < budget.ceiling) {
      violations.push({
        directory: budget.directory,
        measured,
        ceiling: budget.ceiling,
        message: `${budget.directory}/ holds ${measured} counted children, BELOW its ceiling of ${budget.ceiling}: ${budget.ceiling - measured} freed slot(s). A layer that shrinks must LOWER its row — a freed slot left in the ceiling is a silent permission for the next file, granted by the story that was removing one (ADR-009 leg 1, shrink-only).`,
      });
    }
    rows.push({ directory: budget.directory, measured, ceiling: budget.ceiling, allowance: budget.allowance });
  }

  // (2) BOTH DIRECTIONS. Every flat layer in the tree owes a row or a declared exemption — a
  //     table naming four of twenty-one passes silently on seventeen.
  for (const [directory, entries] of layers) {
    if (budgets.has(directory)) continue;
    const children = entries.filter((entry) => entry.kind === "file").length;
    const exemption = exempt.get(directory);
    if (exemption == null) {
      violations.push({
        directory,
        measured: children,
        ceiling: null,
        message: `${directory}/ is a flat layer under src/ or test/ holding ${children} direct children, and it is in neither this gate's table nor its exemption list. Every flat layer is a row or a declared exemption — a table naming some of them passes silently on the rest, which is the measured blind spot item 78 names (ADR-009 leg 2).`,
      });
      continue;
    }
    if (children > FLAT_LAYER_THRESHOLD) {
      violations.push({
        directory,
        measured: children,
        ceiling: null,
        message: `${directory}/ is EXEMPT on the claim that it is a small layer, and it now holds ${children} direct children — over the threshold of ${FLAT_LAYER_THRESHOLD}. An exemption is a claim about size and this one has stopped being true: it owes a ROW with a ceiling and a reason. An exemption list that grows a member instead of a row whenever a layer becomes inconvenient is the named way to quietly undo this control.`,
      });
    }
  }

  // (3) …and an exemption naming a directory nobody has is the same failure a stale row is.
  for (const exemption of exemptions ?? []) {
    if (layers.has(exemption.directory)) continue;
    violations.push({
      directory: exemption.directory,
      measured: null,
      ceiling: null,
      message: `${exemption.directory}/ is named in this gate's exemption list and is NOT in the tree. A stale exemption is a stale row with less to show for it.`,
    });
  }

  const report = {
    rows,
    layersSeen: layers.size,
    entriesScanned: listing.length,
    filesCounted: rows.reduce((sum, row) => sum + (row.measured ?? 0), 0),
    exemptions: (exemptions ?? []).map((entry) => entry.directory),
  };
  return { violations, report };
}

/** The violations function by the name the register uses. Same detector, no second copy. */
export function sourceDirectoryBudgetViolations(listing, table = SOURCE_DIRECTORY_BUDGETS, exemptions = SOURCE_DIRECTORY_EXEMPTIONS) {
  return sourceDirectoryBudget(listing, table, exemptions).violations;
}

export const archTests = [
  {
    name: "arch/119 FF-11904: the real src/ and test/ trees are inside every declared ceiling, and the table and the tree agree in BOTH directions",
    run: async () => {
      const listing = await readTreeListing();
      const { violations, report } = sourceDirectoryBudget(listing);
      assert.deepEqual(
        violations.map((violation) => violation.message),
        [],
        "a flat layer is over, under, or outside its declared budget (see the message for the directory, the count and the ceiling)",
      );

      // NON-VACUITY (ADR-009 leg 3): the sweep says how much it saw, so a rename REDS a row
      // rather than emptying the loop and leaving a guard that guards nothing.
      assert.ok(report.entriesScanned > 1000, `the tree was actually walked: ${report.entriesScanned} directory entries`);
      assert.ok(report.layersSeen >= 21, `…across ${report.layersSeen} flat layers (the 21 the contract measures, at minimum)`);
      assert.ok(report.filesCounted > 1000, `…and ${report.filesCounted} files were counted into rows`);
      assert.equal(report.rows.length, SOURCE_DIRECTORY_BUDGETS.length, "every row in the table was measured");
      for (const row of report.rows) {
        // ZERO IS A COUNT, and since 119/03 it is a REACHABLE one. `test/` and `test/arch/` were
        // fully partitioned into subject directories, so the layer that used to hold 591 and 439
        // suites now holds none — and a ceiling of 0 is the strongest sentence this table can
        // write: the layer is emptied and may not regrow, because leg 1 fails on the FIRST file
        // to reappear there. What non-vacuity needs is that the layer was SEEN, which is exactly
        // what a non-null `measured` says; requiring it to be POSITIVE would have forced the story
        // that emptied the layer to leave a file behind to satisfy its own guard.
        assert.ok(Number.isInteger(row.measured), `${row.directory}: it was actually counted, not merely named`);
      }
    },
  },

  {
    name: "arch/119 FF-11904: the ceiling EQUALS the delivered count in every row — every allowance is declared, every one is zero, and every row states what the next growth should do instead",
    run: async () => {
      const listing = await readTreeListing();
      const { report } = sourceDirectoryBudget(listing);
      const measured = new Map(report.rows.map((row) => [row.directory, row.measured]));

      assert.ok(SOURCE_DIRECTORY_BUDGETS.length >= 4, "the table is populated and covers at least the four layers ADR-009 names");
      for (const budget of SOURCE_DIRECTORY_BUDGETS) {
        assert.ok(Number.isInteger(budget.ceiling) && budget.ceiling >= 0, `${budget.directory}: the ceiling is a non-negative integer (0 is what a fully partitioned layer measures — see the note on leg 1)`);
        assert.equal(budget.allowance, 0, `${budget.directory}: the entry DECLARES its allowance and it is 0 — a ceiling set above the delivered tree "for headroom" is the ratifying move 49's bad cut 4 names`);
        assert.ok(
          typeof budget.why === "string" && budget.why.length > 120,
          `${budget.directory}: the row carries a reason naming what the NEXT growth should do instead of adding a sibling`,
        );
        assert.ok(Object.hasOwn(COUNTING_RULES, budget.counts), `${budget.directory}: its counting rule is one of the declared ones, so the ceiling and the sweep cannot disagree`);
        assert.equal(budget.ceiling, measured.get(budget.directory), `${budget.directory}: the ceiling IS the delivered count, with no headroom`);
      }

      // The four layers ADR-009 names by name are rows, whatever else the table has grown to.
      for (const required of ["packages/core/src", "packages/core/src/application/bindings/commands", "test", "test/arch"]) {
        assert.ok(SOURCE_DIRECTORY_BUDGETS.some((budget) => budget.directory === required), `${required}/ is one of the four layers ADR-009 names, and it is a row`);
      }
      // …and this story's own two new directories are budgeted in the diff that creates them.
      // …and every directory this MILESTONE's moves create is budgeted in the diff that creates it —
      // 119/01's two, then 119/02's three. A family budgeted only once it has grown is 49's bad cut 4
      // one directory down, and this row is the reason `packages/core/src/commands/` itself was ever unmetered.
      for (const created of ["packages/mesh/src", "packages/work/src", "packages/core/src/application/bindings/commands/mesh", "packages/core/src/application/bindings/commands/assets", "packages/core/src/application/bindings/commands/graph"]) {
        assert.ok(SOURCE_DIRECTORY_BUDGETS.some((budget) => budget.directory === created), `${created}/ is created by this milestone's diff and budgeted in it`);
      }
    },
  },

  {
    name: "arch/119 FF-11904: every flat layer under src/ and test/ is a row or a declared exemption, and an exemption is a checked claim about SIZE rather than a curated list",
    run: async () => {
      const listing = await readTreeListing();
      const layers = layersIn(listing);
      const named = new Set([...SOURCE_DIRECTORY_BUDGETS.map((budget) => budget.directory), ...SOURCE_DIRECTORY_EXEMPTIONS.map((entry) => entry.directory)]);

      const unentered = [...layers.keys()].filter((directory) => !named.has(directory));
      assert.deepEqual(unentered, [], "every flat layer under src/ and test/ owes a row or a declared exemption");
      assert.ok(layers.size >= 21, `non-vacuity: ${layers.size} flat layers were enumerated`);

      for (const exemption of SOURCE_DIRECTORY_EXEMPTIONS) {
        const entries = layers.get(exemption.directory);
        assert.ok(entries != null, `${exemption.directory}/ is exempt and must exist — a stale exemption guards nothing`);
        const children = entries.filter((entry) => entry.kind === "file").length;
        assert.ok(
          children <= FLAT_LAYER_THRESHOLD,
          `${exemption.directory}/ is exempt on a size claim and holds ${children} direct children, over the threshold of ${FLAT_LAYER_THRESHOLD} — it owes a row`,
        );
        assert.ok(typeof exemption.why === "string" && exemption.why.length > 30, `${exemption.directory}: the exemption carries its own reason`);
      }
    },
  },

  {
    name: "arch/119 FF-11904: the detector FIRES on a synthesized sibling in a budgeted layer, and is quiet on the clean listing in the same lane — with nothing written to disk",
    run: async () => {
      const clean = await readTreeListing();
      // DERIVED from the table, not typed: the `packages/core/src/mesh` row moves when 119/04 splits the
      // god-node inside it, and a probe that hard-codes today's count fails then for a reason
      // that has nothing to do with the property it exists to prove.
      const row = SOURCE_DIRECTORY_BUDGETS.find((budget) => budget.directory === "packages/mesh/src");
      const planted = [...clean, { dir: row.directory, name: "a-new-flat-sibling.mjs", kind: "file" }];
      assert.notDeepEqual(planted, clean, "the plant LANDED — the synthesized listing differs from the clean one");

      const violations = sourceDirectoryBudgetViolations(planted);
      assert.ok(violations.length >= 1, "a new sibling in a budgeted layer fires the shipped detector");
      const fired = violations.find((violation) => violation.directory === row.directory);
      assert.ok(fired != null, `the refusal names the directory: ${JSON.stringify(violations)}`);
      assert.equal(fired.measured, row.ceiling + 1, "…and the measured count it saw");
      assert.equal(fired.ceiling, row.ceiling, "…and the ceiling it was over");
      assert.deepEqual(sourceDirectoryBudgetViolations(clean), [], "…and the CLEAN listing, in this same lane, returns none");

      // The plant is a value in this process. Nothing was created, so nothing can be left behind.
      const after = await readTreeListing();
      assert.equal(after.length, clean.length, "no directory or file was created on disk to produce the violation");
    },
  },

  {
    name: "arch/119 FF-11904: a renamed budgeted directory REDS its row rather than emptying it, and a shrunk layer must lower its row",
    run: async () => {
      const clean = await readTreeListing();

      // (a) THE RENAME. `packages/core/src/mesh` becomes `packages/core/src/meshes` in the listing; the row must fail naming
      //     the subject it could not find, never pass on an empty sweep (ADR-009 legs 3 and 4).
      const renamed = clean.map((entry) => {
        if (entry.dir === "packages/mesh/src") return { ...entry, dir: "packages/core/src/meshes" };
        if (entry.dir === "packages/core/src" && entry.name === "mesh") return { ...entry, name: "meshes" };
        return entry;
      });
      assert.notDeepEqual(renamed, clean, "the rename LANDED in the synthesized listing");
      const renameViolations = sourceDirectoryBudgetViolations(renamed);
      assert.ok(
        renameViolations.some((violation) => violation.directory === "packages/mesh/src" && /NOT in the tree/u.test(violation.message)),
        `the sweep fails naming the budgeted subject it could not find: ${JSON.stringify(renameViolations.map((violation) => violation.directory))}`,
      );

      // (b) THE SHRINK. A layer below its ceiling must lower the row — a freed slot left in the
      //     ceiling is a silent permission for the next file.
      // Any member of the layer, chosen from the listing — naming one couples the probe to a file
      // that a later story is free to rename.
      const member = clean.find((entry) => entry.dir === "packages/mesh/src" && entry.kind === "file");
      const shrunk = clean.filter((entry) => !(entry.dir === member.dir && entry.name === member.name));
      assert.equal(shrunk.length, clean.length - 1, "the removal LANDED in the synthesized listing");
      const shrinkViolations = sourceDirectoryBudgetViolations(shrunk);
      const freed = shrinkViolations.find((violation) => violation.directory === "packages/mesh/src");
      assert.ok(freed != null && /freed slot/u.test(freed.message), `a shrunk layer fails until its row is lowered: ${JSON.stringify(shrinkViolations.map((violation) => violation.message))}`);
      const lowered = SOURCE_DIRECTORY_BUDGETS.map((budget) => (budget.directory === "packages/mesh/src" ? { ...budget, ceiling: budget.ceiling - 1 } : budget));
      assert.deepEqual(sourceDirectoryBudgetViolations(shrunk, lowered), [], "…and lowering the row to the new measured count clears it");

      // (c) …and RAISING a row never clears anything: the raise is itself the finding.
      const raised = SOURCE_DIRECTORY_BUDGETS.map((budget) => (budget.directory === "packages/mesh/src" ? { ...budget, ceiling: budget.ceiling + 1 } : budget));
      assert.ok(
        sourceDirectoryBudgetViolations(clean, raised).some((violation) => violation.directory === "packages/mesh/src"),
        "raising a row above its measured count never clears anything — the headroom IS the finding",
      );
    },
  },

  {
    name: "arch/119 FF-11904: an unentered layer and an exemption that has outgrown its claim both fire on the shipped detector",
    run: async () => {
      const clean = await readTreeListing();

      // (a) a flat directory added later with NO entry: the sweep fails naming it and its count.
      const added = [...clean, { dir: "packages/core/src", name: "panels", kind: "dir" }, { dir: "packages/core/src/panels", name: "panels.mjs", kind: "file" }];
      const addedViolations = sourceDirectoryBudgetViolations(added);
      const unentered = addedViolations.find((violation) => violation.directory === "packages/core/src/panels");
      assert.ok(unentered != null, `a new flat layer with no entry fires: ${JSON.stringify(addedViolations.map((violation) => violation.directory))}`);
      assert.equal(unentered.measured, 1, "…naming the directory and its count");

      // (b) an EXEMPT layer that crosses the threshold owes a row, and the list cannot absorb it.
      const grown = [...clean];
      for (let index = 0; index <= FLAT_LAYER_THRESHOLD; index += 1) grown.push({ dir: "packages/core/src/spine", name: `grown-${index}.mjs`, kind: "file" });
      const grownViolations = sourceDirectoryBudgetViolations(grown);
      assert.ok(
        grownViolations.some((violation) => violation.directory === "packages/core/src/spine" && /owes a ROW/u.test(violation.message)),
        `an exemption that has outgrown its size claim fires: ${JSON.stringify(grownViolations.map((violation) => violation.directory))}`,
      );
      assert.deepEqual(sourceDirectoryBudgetViolations(clean), [], "…and the CLEAN listing, in this same lane, returns none");
    },
  },

  // ── milestone 138 / story 00, task 01 — the terminal family is founded and registered ──────────
  {
    name: "138/00 task01 — terminal exemptions remain declared; 154/04 adds one owned Codex settings module without allowance",
    run: async () => {
      const planned = {
        "packages/execution/src/terminal": ["screen.mjs", "session-screen.mjs", "claude-screens.mjs"],
        "test/terminal": ["index.mjs", "screen-model", "session-screen-ready", "session-screen-verdicts", "session-screen-evidence", "claude-screens-registry"],
        "test/arch/terminal": ["index.mjs", "acd-screen-has-one-reader", "acd-screen-registry-is-recorded"],
        "test/fixtures/claude-screens": ["ready", "first-run", "usage-limit", "trust", "mcp-approval", "login", "ready.classic"],
      };
      for (const [directory, members] of Object.entries(planned)) {
        const exemption = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === directory);
        assert.ok(exemption != null, `${directory}/ is a declared exemption`);
        assert.match(exemption.why, /138\/ADR-001/u, `${directory}: the exemption cites 138/ADR-001`);
        for (const member of members) assert.ok(exemption.why.includes(`\`${member}`), `${directory}: the exemption names ${member}`);
        assert.equal(SOURCE_DIRECTORY_BUDGETS.some((budget) => budget.directory === directory), false, `${directory}/ is an exemption, not a row`);
      }
      const srcRow = SOURCE_DIRECTORY_BUDGETS.find((budget) => budget.directory === "packages/core/src");
      assert.deepEqual({ ceiling: srcRow.ceiling, allowance: srcRow.allowance }, { ceiling: 28, allowance: 0 }, "154/04 adds codex-settings beside claude-settings after Plan 06 retired root forwards; no growth allowance");
      assert.deepEqual(sourceDirectoryBudgetViolations(await readTreeListing()), [], "the budget's own run over the live tree is green");
    },
  },
  {
    name: "138/00 task01 outline — the terminal exemptions hold only while the family stays small, and a family that is gone is a stale exemption",
    run: async () => {
      const clean = await readTreeListing();
      // The live listing with `directory` replaced by `count` synthesized files, or removed (null).
      const withLayer = (directory, count) => {
        const cut = directory.lastIndexOf("/");
        const parent = directory.slice(0, cut);
        const name = directory.slice(cut + 1);
        const rest = clean.filter((entry) => entry.dir !== directory && !(entry.dir === parent && entry.name === name));
        if (count == null) return rest;
        const files = Array.from({ length: count }, (_, index) => ({ dir: directory, name: `member-${index}.mjs`, kind: "file" }));
        return [...rest, { dir: parent, name, kind: "dir" }, ...files];
      };
      const rows = [
        { directory: "packages/execution/src/terminal", count: 3, fires: null },
        { directory: "packages/execution/src/terminal", count: 8, fires: null },
        { directory: "packages/execution/src/terminal", count: 9, fires: /owes a ROW/u },
        { directory: "test/terminal", count: 9, fires: /owes a ROW/u },
        { directory: "test/fixtures/claude-screens", count: 6, fires: null },
        { directory: "packages/execution/src/terminal", count: null, fires: /NOT in the tree/u },
      ];
      for (const row of rows) {
        const label = `${row.directory}/ ${row.count == null ? "absent" : `holding ${row.count} direct files`}`;
        const named = sourceDirectoryBudgetViolations(withLayer(row.directory, row.count)).filter((violation) => violation.directory === row.directory);
        if (row.fires == null) {
          assert.deepEqual(named, [], `${label}: no violation`);
        } else {
          assert.equal(named.length, 1, `${label}: exactly one violation, naming the directory`);
          assert.match(named[0].message, row.fires, label);
        }
      }
    },
  },
  {
    name: "138/00 task01 — the terminal suites are registered through two indexes and one registry import each, and each index spreads every suite it imports and reads no directory",
    run: async () => {
      // Line-wise and CRLF-tolerant: a binding is spread when a line is exactly `...<binding>` with or
      // without its trailing comma.
      const lines = (text) => text.split(/\r?\n/u).map((line) => line.trim());
      const spreads = (text, binding) => lines(text).filter((line) => line === `...${binding}` || line === `...${binding},`).length;
      const runner = await readFile(path.join(repoRoot, "scripts", "test.mjs"), "utf8");
      // The specifier is counted, and the binding named, as 131/02 does: FF-11901 keeps the one
      // import extractor in `test/support/module-family.mjs`.
      for (const [index, binding] of [["../test/terminal/index.mjs", "terminalTests"], ["../test/arch/terminal/index.mjs", "archTerminalTests"]]) {
        assert.equal(runner.split(`"${index}"`).length - 1, 1, `scripts/test.mjs imports ${index} exactly once`);
        assert.ok(lines(runner).includes(`import { tests as ${binding} } from "${index}";`), `…as ${binding}`);
        assert.equal(spreads(runner, binding), 1, `…and spreads what it exports (${binding}) once`);
      }
      for (const index of ["test/terminal/index.mjs", "test/arch/terminal/index.mjs"]) {
        const source = await readFile(path.join(repoRoot, index), "utf8");
        assert.doesNotMatch(source, /readdir/u, `${index} decides nothing by readdir`);
        const bindings = lines(source).map((line) => /^import \{ (?:\w+ as )?(\w+) \} from "\.\/[^"]+\.test\.mjs";$/u.exec(line)?.[1]).filter(Boolean);
        assert.ok(bindings.length > 0, `${index} imports its suites`);
        for (const binding of bindings) assert.equal(spreads(source, binding), 1, `${index} spreads ${binding} once`);
      }
    },
  },
];
