// Fitness function: FF-11904 (119/ADR-009; TECH_DEBT items 10, 63, 78) —
//
//   "Every flat layer is a row in ONE table, and the next sibling is a decision."
//
// ── WHY ONE TABLE AND NOT THREE ───────────────────────────────────────────────────────────
// Three ledger entries ask for a count ratchet and each names a different directory. Item 78
// names why three would fail, and it is the whole argument for this file: item 10's
// measurements walk `src/` root and stop, item 63's walk `test/arch/`, and THE FASTEST-GROWING
// FLAT DIRECTORY IN THE TREE IS THE ONE NEITHER ENTRY CAN SEE. `src/commands/` was 18 siblings
// on 2026-07-01 and 99 on 2026-09-06. Three separate ratchets would have rebuilt that blind
// spot three times over; one table with a row per layer cannot, because leg 2 below refuses to
// pass while a layer has neither a row nor a declared exemption.
//
// ── AND WHY IT LANDS NOW, WITH THE FIRST CUT ──────────────────────────────────────────────
// 49/ARCHITECTURE bad cut 4: a ratchet authored AFTER the growth it was meant to question
// RATIFIES that growth. So the table lands in the diff that moves 71 modules and counts the
// files that land with it. Item 78 is equally clear about the other half — a count-only cap
// with NO admitted decomposition is item 61's measured failure — which is why this control was
// not admissible until ADR-002 ruled that a `src/<name>/` family is one module and ADR-005 took
// the partition. The cap and the decomposition arrive together or neither is honest.
//
// ── THE MODEL IS `acd-ui-directory-budget`, ONE TOOLCHAIN OVER ────────────────────────────
// 49/ADR-001 already built exactly this instrument for `ui/src`, and this file is deliberately
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
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// ── THE COUNTING RULE, DECLARED ONCE ─────────────────────────────────────────────────────
// One rule produces BOTH the ceiling and the sweep, which is the only way the two can be
// compared at all. A subdirectory is never a member of its parent's row: `src/mesh/worktree.mjs`
// counts toward `src/mesh/` and never toward `src/`, which is what makes the partition a
// REDUCTION rather than a relabelling.
//
//   root-mjs         — direct children ending `.mjs`      (the `src/` root: item 10's own metric)
//   test-suites      — direct children ending `.test.mjs` (the `test/` root: `test/installer-shell.mjs`
//                      is a HARNESS, not a suite, and is excluded by this rule — the ceiling below
//                      was produced by this same predicate, so the two cannot disagree)
//   direct-children  — every direct child file
export const COUNTING_RULES = Object.freeze({
  "root-mjs": (name) => name.endsWith(".mjs"),
  "test-suites": (name) => name.endsWith(".test.mjs"),
  "direct-children": () => true,
});

// A layer holding more than this many direct children owes a ROW. At or under it, a declared
// exemption is admitted — and re-checked on every run.
//
// WHY 8, since FF-11902 requires an admitted literal to carry its reason: it sits in a real gap
// in this tree rather than at a round number. The largest exempt layer is `src/work-acceptor/`
// at 6 and the smallest row is `src/work-audit/` at 10, so 8 has slack in both directions — a
// layer has to grow by a third before it changes category, and no existing layer sits on the
// boundary where a single file would flip it.
export const FLAT_LAYER_THRESHOLD = 8;

// How deep a layer has to be before it stops being one. Three path segments: depth 1 is the two
// roots, depth 2 is `src/commands/` and `test/arch/` and their siblings, and depth 3 is where
// the next two stories of this milestone put their partitions — `src/commands/mesh/` (119/02)
// and `test/arch/<subject>/` (119/03). Those are the layers that must not be able to appear
// unmetered, and they are the reason this bound is 3 rather than 2: the first cut of this table
// stopped at 2 and would have let every one of them in unbudgeted, which is item 78's blind spot
// rebuilt one level down inside its own remedy. One level deeper is a leaf of a leaf — a single
// skill's own directory — where a row would meter nothing this milestone is about.
export const LAYER_DEPTH = 3;

// A layer whose SUBTREE this table has no mandate over. One member, and it is the milestone's
// own scoping rather than this control's preference: 119's SPEC puts the bundled prompt layer
// (TECH_DEBT item 79) explicitly out of scope — "flat and repetitive for the same reason, but it
// is prose, not modules, and its consumers are agents rather than importers". `src/bundle/` still
// carries its own row for its four direct children; what is declined here is metering the prose
// beneath it, which is a different milestone's subject and a different argument.
const SUBTREE_OUT_OF_SCOPE = new Set(["src/bundle"]);

// ── THE NAMED TABLE ──────────────────────────────────────────────────────────────────────
// Measured 2026-09-06 in the working tree by the predicates above, in the diff that delivers
// the counts. Every ceiling EQUALS its measured count and every allowance is 0.
export const SOURCE_DIRECTORY_BUDGETS = Object.freeze([
  Object.freeze({
    directory: "src",
    counts: "root-mjs",
    ceiling: 92,
    allowance: 0,
    why: "ITEM 10's own layer, and the one this milestone exists to move: 160 root modules before this story, 89 after (`mesh-*` 31 and `work-*` 40 folded, `cache-read.mjs` a rename rather than a removal, and `cited-path-resolve.mjs` landed by 119/00 after the contract was measured). The next growth here is a FAMILY — a `src/<subject>/` directory named by what its members share — never a 90th root sibling; the whole argument of ADR-005 is that the filenames were already declaring families nobody had made directories of. 89 -> 90 is milestone 126 story 02 adding `loop-argv.mjs`, and this row asked for a FAMILY rather than a 90th root sibling — so the choice is STATED rather than taken quietly. It lands beside `loop-bounds.mjs`, its own named precedent at 30 dependents and 0 imports, because that is the shape it copies exactly: a zero-import leaf that a registered command module and a producer may both reach without closing the registry TDZ ring (TECH_DEBT item 26). What this row is right about is that `loop-argv`, `loop-bounds`, `loop-record` and `loop-progress` are now FOUR filenames declaring a `src/loop/` family nobody has made a directory of. That move is real and is now nameable; it is left to an item of its own rather than smuggled into a story about supervision, because it re-points every dependent of all four and belongs in no other story's blast radius. 90 -> 91 is 126/05 adding `sqlite-runtime.mjs`, and this row asked for a FAMILY rather than another root sibling — so, as with 126/02, the choice is STATED rather than taken quietly. The module is a SUBTRACTION: two copies of one act (`resolveSqlite` in `effects/journal.mjs` and in `global-work-store.mjs`) become one, so the root count rises by one while the number of places that import `node:sqlite` falls from two to one. The family this row is right to want is `src/store/` — `global-work-store.mjs`, `cache-read.mjs` and this leaf share a subject — and it is NOT made here for the same reason 126/02 declined `src/loop/`: `global-work-store.mjs` has 109 dependents, and re-pointing them belongs in an item whose blast radius is that move, not in a story about a warning. The path is also the one `ARCHITECTURE.md` cites by name, so a different one would leave a citation unresolved and hold FF-11903's ceiling higher. 91 -> 92 is `loop-diag.mjs` (2026-09-11), the loop's exit-reason recorder. The row says the next growth is a FAMILY, and this is not one: it is a process-level instrument — it listens to `process` (exit, drained loop, uncaught, signals) and tees the two streams — with no subject directory to join, installed by ONE seam (`commands/loop.mjs`'s launch body) and removable in one line. It exists because two foreground loops died silently in one afternoon after the driver's own kill of a finished session, and nothing was listening; when the death it records is named and fixed, it moves into the family the fix belongs to, or goes.",
  }),
  Object.freeze({
    directory: "src/commands",
    counts: "direct-children",
    ceiling: 69,
    allowance: 0,
    why: "ITEM 78's layer, and the measured blind spot this whole table exists to close: 18 siblings on 2026-07-01, 91 on 2026-08-31, 99 six days later — the fastest-growing flat directory in the tree, and the one no ledger entry could see. Story 119/02 gave it `mesh/` (17), `assets/` (9) and `graph/` (6) and LOWERED this row from 99 to 67, which leg 1 forces rather than merely permits. The next command belongs in the family directory its own name declares — a `work-*` or `loops-*` fold is the next decision this row makes somebody take — never a 68th flat sibling. 67 -> 68 is 127/02 adding `promote.mjs`, the ONE mint (127/ADR-003 §1), and this row asked for a FAMILY rather than a 68th flat sibling — so the choice is STATED rather than taken quietly. The path is contract-bound: FF-12703 leg (b) and FF-12704 both name `src/commands/promote.mjs` by path, and `runInsertTopLevel` moved INTO it from `insert-shared.mjs` (the other import direction is a cycle — `insert-shared` is what `promote.mjs` imports its scaffold from), so the file is a net MOVE of the top-level axis out of `insert-shared.mjs`, not new flat growth. The `src/commands/work/` fold this row wants is story 128's own named item, and its row refuses a second lone member that is not part of it — landing `promote.mjs` there would be exactly that. When the fold happens, this file goes with the rest of the `work:*` family. 68 -> 69 is 127/03 adding `archive.mjs`, the verbatim MOVE (127/ADR-004 §1) — the second lone `work:*` verb this row admits with a STATED why rather than quietly: the path is contract-bound (ADR-004 §1 and FF-12705 both name `src/commands/archive.mjs`), the face is thin (resolve, refuse, select, render — the engine is `src/work/archive.mjs`, reached through the stream seam), and the `src/commands/work/` row refuses a second lone member that is not the fold, so it cannot land there yet. When the fold happens, this file goes with `promote.mjs` and the rest of the family.",
  }),
  Object.freeze({
    directory: "src/commands/mesh",
    counts: "direct-children",
    ceiling: 18,
    allowance: 0,
    why: "created by 119/02's own diff, and budgeted in it — the point of ADR-009 leg 1 is that a family is not a place to grow freely just because it is newly named, and this table's own history is that the fastest-growing layer in the tree was the one nobody had a row for. An eighteenth mesh verb is a real decision: the mesh face is already the largest command family, and the growth worth making somebody name. 17 -> 18 is 126/06's post-hoc review extracting the desktop PREFLIGHT into desktop-preflight.mjs, and this row is right to ask for the reason. It is not an eighteenth mesh verb — listCommands() still holds exactly three mesh:desktop-* ids and this module registers none — so the sentence above about a real product decision is not the one being answered. It is a SUBTRACTION from the file that was absorbing a cross-cutting concern because its directory was capped: desktop.mjs went 587 -> 1,053 (126/04) -> 1,167 (126/06) lines, +99% in one milestone, and 280 of those lines were a set of read-only probes over this node whose only relationship to install and run is that both print them. The split is what makes the control's writes-nothing sweep a statement about a WHOLE FILE: it used to be a hand-kept list of five function headers cut out of the command module, 126/06 added four more functions and did not add them to the list, and a quarter of the preflight sat outside the sweep with nothing to say so. A list maintained alongside the code it describes falls behind the code; a file does not. The row's own logic is what makes this the right call rather than a convenient one -- the alternative was a fourth, fifth and sixth check continuing to land in a command module because the directory was full, which is the growth this table exists to make somebody name. The wider move this row is right to want is a src/commands/mesh/desktop/ family: install, run, stop and the preflight share a subject, and desktop.mjs is still 845 lines. It is NOT made here for the reason 126/02 and 126/05 both declined a family: re-pointing the suites, the fixture and the arch control belongs in an item whose blast radius is that move, not in the repair of a story that was accepted before its gates ran.",
  }),
  Object.freeze({
    directory: "src/commands/assets",
    counts: "direct-children",
    ceiling: 9,
    allowance: 0,
    why: "created by 119/02's own diff, and budgeted in it. The assets family is a CLOSED verb set over one subject — list/show/add/remove/refs/clean/validate/apply/ui — so a tenth member is far more likely to be a verb that belongs on an existing command as a flag than a new sibling here. Over the threshold, so it owes a row rather than an exemption.",
  }),
  Object.freeze({
    directory: "src/commands/graph",
    counts: "direct-children",
    ceiling: 6,
    allowance: 0,
    why: "created by 119/02's own diff, and budgeted in it. At six members it is UNDER FLAT_LAYER_THRESHOLD and could have been an exemption; it is a row instead because it was born in the same diff as its two larger siblings and a family that is metered only once it becomes inconvenient is the exemption list growing a member instead of a row. A seventh graph verb is a decision about the graph surface, which has one driver and one normalizer behind it.",
  }),
  Object.freeze({
    directory: "src/commands/work",
    counts: "direct-children",
    ceiling: 1,
    allowance: 0,
    why: "founded by story 128's own diff, and budgeted in it. `src/commands/` stands at its ceiling with allowance 0 and its own row REFUSED a 68th flat sibling — so when `aof work memory` joined the route table, the module that registers it (`work:memory`) could not land beside `find.mjs`, and this directory is where it went: the family its own id declares, founded with one member, stated rather than smuggled (119/02's rows are the precedent). The row asked for exactly this — 'the next command belongs in the family directory its own name declares — a `work-*` or `loops-*` fold is the next decision this row makes somebody take'. The FOLD is a separate item, named here and not taken: moving the other `work:*` commands into this directory re-points every dependent of some forty modules and belongs in an item whose blast radius is that move, not in a story about one door. Until that item, the next file here is the fold or nothing — a second lone member that is not part of it is the flat row's growth wearing a subdirectory.",
  }),
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
    directory: "src/mesh",
    counts: "direct-children",
    ceiling: 34,
    allowance: 0,
    why: "created by 119/01's diff, and budgeted in it — the point of ADR-009 leg 1 is that a family is not a place to grow freely just because it is newly named. 31 -> 33 is 119/04 taking the raise this row was written expecting: item 83's seams 2 and 1 became `worker-launch.mjs` and `worker-repo-admission.mjs`, and the file they came out of fell 2,482 -> 1,957 lines, which is the trade this row exists to make somebody state. Two siblings for 525 lines out of the tree's largest module is the shape a subtraction takes here; two siblings for a new concern is not, and would arrive as a different sentence. 33 -> 34 is milestone 126 story 02 adding `declarations.mjs`: which loops should be running on this node now, composed into rows a supervisor can act on. It is a sibling for a NEW CONCERN rather than a subtraction — which this row correctly says is a different sentence, and it is stated here as one. Two delivered controls put it in this directory rather than in the command that carries its answer: `72/FF-7205` forbids a registry import, static or dynamic, in the session module or anything its static closure reaches, and `src/commands/mesh/identity.mjs` is in that closure; reached only through a dynamic import inside the `--declarations` branch, this module is in no static closure and its registry read is paid for only when an operator asks for it. That it also reads better here — which loops should run is not a fact about node identity — is a consequence, not the reason.",
  }),
  Object.freeze({
    directory: "src/work",
    counts: "direct-children",
    ceiling: 45,
    allowance: 0,
    why: "created by this story's own diff, and budgeted in it. The next work-family SUB-family is born `src/work-<subject>/` (ADR-005 §3, chore 106's rule 1) — the five that already exist are not nested — so growth here is a new module of the family itself, which is a decision this row makes somebody take. 40 -> 41 is milestone 124 story 00 taking the raise this row was written expecting: `doctor-depends.mjs`, the fourth advisory lane of the doctor family. It is growth of the family ITSELF rather than a new concern — a lane module beside the seven it joins, reporting findings over the work stream exactly as they do — so it is the decision this row makes somebody take, and the answer is that it belongs here rather than in a `src/work-<subject>/` of its own. 41 -> 42 is 127/03 adding `archive.mjs`, the archive ENGINE beside `reindex.mjs` (127/ADR-004; story 03 task 03): the stream's other write act, placed here because the stream seam imports its fact-writers and a command cannot be one without a cycle. Pure filesystem — the rename pass and the crossing-link rewrite — importing `work.mjs`'s readers only, exactly as `reindex.mjs` does. 42 -> 43 is 127/04 adding `item-row.mjs`, the cache ROW's shape at the store boundary (127/ADR-006 §1): the `work_items` screen, the archived flag's bind mapping and the two-shape widening every hop applies. It exists because `src/global-work-store.mjs` sits at its own 1,280-line ratchet (43/ADR-012/B4), whose stated escape hatch is exactly this — put the next block in its own module and call it from here — and the block that had to move is the screen plus the two location shapes it now screens. A pure leaf with no imports, re-exported from the store as `artifacts.mjs` already is (the WORK_ITEM_DOC_FILES precedent), so it belongs to the work family the row shape describes rather than at the `src/` root the store's own row wants a `src/store/` family for and declines to make. 43 -> 44 is milestone 133 story 03 adding `doctor-diagrams.mjs` (133/ADR-006), the ninth doctor lane. A lane is a new module of this family by the doctor registry's own rule — `CHECK_GROUPS` is appended to and FF-5905 names each `./doctor-*.mjs` — so it cannot be a fold into an existing lane without making one lane answer two subjects. It is pure over the snapshot, reads its diagram vocabulary through `src/diagrams/layout.mjs`, and the family it would otherwise wait for (`src/work-doctor/`) is TECH_DEBT item 10's move, not this story's. 44 -> 45 is story 137 adding `digest-template.mjs`, the one reader of the shipped `AOF.md` template that both the import's renderer and validate's digest check call — a module of the work family itself (it answers what a work record doc must hold), landed without this row and raised at milestone 130's gate.",
  }),
  Object.freeze({
    directory: "src/bundle",
    counts: "direct-children",
    ceiling: 4,
    allowance: 0,
    why: "THE ENTRY THAT STATES WHICH CHILDREN IT COUNTS, because this is the one budgeted layer with subdirectories: it counts its four DIRECT children and none of the six subdirectories' members, which are prose assets rather than modules (TECH_DEBT item 79's subject, and explicitly not this milestone's). A fifth direct child here is a new bundle-layer module and a decision.",
  }),
  Object.freeze({
    directory: "src/effects",
    counts: "direct-children",
    ceiling: 12,
    allowance: 0,
    why: "the reactor table and its transition modules — a layer that grows one file per new durable consequence, which is exactly the growth worth making somebody name. The next reactor usually belongs in an EXISTING transitions module beside its siblings, not in a thirteenth file.",
  }),
  Object.freeze({
    directory: "src/work-audit",
    counts: "direct-children",
    ceiling: 10,
    allowance: 0,
    why: "the largest of the five established `src/work-<subject>/` sub-families, and over the threshold, so it owes a row rather than an exemption. Its growth should be a lane inside an existing module; an eleventh file here is the same flat-sibling habit one directory in.",
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
    ceiling: 68,
    allowance: 0,
    why: "THE LARGEST UNENTERED LAYER the contract names — 66 files when it was measured, 68 after 119/00 added `census-carrier-plants.mjs` and `module-family.mjs`. A shared helper is exactly the file everybody adds and nobody groups, and it is inside the tree item 63 governs; a 69th belongs in a subject directory under `test/support/` rather than beside the other 68.",
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
    why: "created by 119/03's own diff and budgeted in it: the 22 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the command's own family; a new file here should mean a new command LAYER, not a new command — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 23 -> 24 is story 128 adding `acd-work-memory-routed.test.mjs`, and it is what this row says a new file here should mean: a new command LAYER. `src/commands/work/` is founded by that story (its own row above), and this control is the structural half of the founding — the ladder door closed behind the migrated verb, the help tail, the four frozen lists that moved, the printer ratchet that fell, and 125's README control gone green — none of which is a case on any one command's existing suite. 24 -> 25 is story 125 adding `acd-readme-names-what-ships.test.mjs`, first placed under `test/arch/bundle/` and moved here before it landed: the README may not name a command that does not resolve, and the resolver is `deriveRouteTable` — a control on the route table is a control of this subject. Under `bundle`, 124/02's FF-12405 leg 10 holds the parity controls at 23 with a ceiling that may only fall; that freeze was never about a README control, and the answer to it is the right directory rather than a raised ceiling.",
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
    ceiling: 65,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 49 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the loop registry, the record or the ladder suite; this is the largest subject in the tree and a new file here needs to name which of those it is not — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 50 -> 51 is milestone 124 story 01 adding `acd-cap-exhaustion-returns-to-the-plan.test.mjs` (FF-12404), and it names which of the three this row asks for: the LADDER suite — the cycle-cap decision that ends a range, moved out of the shell into the engine the ladder already consults. A control on an existing subject of this directory rather than a new one. 51 -> 53 is milestone 126 story 00 adding `acd-clock-counts-attempts.test.mjs` (FF-12601) and `acd-loop-narrates-in-flight.test.mjs` (FF-12602), and both name which of the three this row asks for: the LADDER suite, twice. FF-12601 is the bound that ENDS a range — `scheduleToClose` measured over the attempt series the ladder already retries, rather than over a wall clock that keeps running while nothing does. FF-12602 is that same ladder REPORTING itself while it is still running, through the one printer it already owns. Neither touches the loop registry or the record, so neither is a new subject. They arrive together because the story is one story: the clock and the narration land in the same two files, and the second could never wave before the first. 53 -> 54 is milestone 126 story 02 adding `acd-declaration-predicate-is-composed.test.mjs` (FF-12604), and it names which of the three this row asks for: the LADDER suite — one pure decider says which declarations should be running on this node now, composing verdicts the run store owns and naming none of them. A control on an existing subject of this directory, not a new one. 54 -> 55 is story 125 adding `acd-site-is-projected-not-copied.test.mjs`, first placed under `test/arch/bundle/` and moved here before it landed, and it names which of the three: the RECORD — the loop document is the registry's committed projection, and this is the placement control on its readership (the site builder reaches `loopDocumentPath` from outside the `src/` walk `acd-loop-document-current` asserts over, spells no basename, and nothing under `docs/` is a copy of the document). It shares its predicate with the reader-set control it now sits beside; `bundle` was the wrong home, and 124/02's FF-12405 leg 10 (a ceiling that may only fall) is what said so. 55 -> 59 is milestone 129 story 05 adding the four files its register declares — `acd-loop-concurrency-single-home.test.mjs` (FF-12901), `acd-loop-family-boundary.test.mjs` (FF-12902, FF-12906), `acd-lane-records-and-the-declaration.test.mjs` (FF-12903, FF-12907) and `acd-lane-grade-is-lane-scoped.test.mjs` (FF-12905) — and every one names which of the three this row asks for: the LADDER, four times. The wave tick is the ladder run in worktree lanes (129/ADR-008), and these are the controls on where its grade is taken, whose record a lane writes, what declaration it rides and what the family may reach; the seventh control, FF-12904, is an extension of `test/arch/grade/acd-gate-propagation-never-discards` and moves no row. Exactly the four, by the story's own count, so the delta is asserted and never the literal. 59 -> 62 is milestone 130 story 05 adding the three files its register declares — `acd-loop-stop-request-single-home.test.mjs` (FF-13001, FF-13003), `acd-loop-stop-settles-the-run.test.mjs` (FF-13002, FF-13004) and `acd-loop-stop-reaches-every-face.test.mjs` (FF-13005, FF-13006, FF-13007's node leg) — and every one names which of the three this row asks for. The RECORD, twice: the stop request is one file under the aof home keyed by the loop's id (130/ADR-001), the verb that writes it is a probe-shaped write through one core (ADR-002), and the loop's presence entry is the record every face reads — carried additively by the same pass as `activeRuns`, rendered as a local-only button that reaches one route, spawned by the desktop from an argv formed in core (ADR-004 §3, ADR-005). The LADDER, once: what the shell does after a drive returns under an interrupt — settle first, always, so a cancelled session settles `cancelled` and no `running` row is leaked (ADR-003) — and what the declarations engine answers for a loop the operator stopped (ADR-004 §4). Exactly the three, by the story's own count: the register wrote `55 -> 58` on 2026-09-13, before 129/05's four landed, and the DELTA is the invariant it states, never the literal. 62 -> 65 is milestone 131 story 06 adding the three files its register declares — `acd-loop-ask-single-home.test.mjs` (FF-13101, FF-13102, FF-13103), `acd-loop-ask-waits-in-place.test.mjs` (FF-13104, FF-13105) and `acd-loop-ask-reaches-every-face.test.mjs` (FF-13106 to FF-13109) — and every one names which of the three this row asks for. The RECORD, twice: the ask a waiting session leaves is one file under the aof home keyed by its run, read off the transcript by one reader, and carried on the run record as `asks` without making the run reclaimable or charging the wait (131/ADR-001 §4, ADR-002, ADR-003); and the notifier, the one zero-import form and the guarded answer route are how every face reads and writes that record (ADR-005, ADR-006). The LADDER, once: what the loop does with a drive that stopped to ask — the answer resumes the same session as a command, and a waiting lane holds its slot and parks at the bound while the wave builds on (ADR-001, ADR-004). Exactly the three, by the story's own count, measured as the delta over the 62 this row read when the story was built.",
  }),
  Object.freeze({
    directory: "test/arch/memory",
    counts: "direct-children",
    ceiling: 20,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 18 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the recall, the digest or the index suite — the memory backend is one seam behind three faces and the faces already have files — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 19 -> 20 is milestone 124 story 02 adding `acd-learning-edge-reaches-every-cut.test.mjs` (FF-12405), and it is a control on this subject rather than a new one: the learning edge — which commands recall accumulated lessons, and whether the form they spell exists in the memory module's own parse surface. This directory already holds the controls over the memory index and its recall; this is the one that asks the same question of the CUT-MAKING commands, which is a case on an existing subject rather than a new subject needing its own row.",
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
    ceiling: 32,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 31 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the identity, the attribution or the transcript suite; a session control that fits none of those is usually a mesh or a run control wearing a session name — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/arch/store",
    counts: "direct-children",
    ceiling: 17,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 15 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the global-store, the cache or the lock suite — the durable stores are three and a fourth file here should mean a fourth store — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 16 -> 17 is 126/05 adding `acd-sqlite-runtime-has-one-home.test.mjs` (FF-12608). The row said a fourth file here should mean a fourth STORE, and this is not one — it is a control over the RUNTIME the existing stores are built on, which is the subject this directory already guards from the other side (`acd-publish-on-mutate-ledgered`, `acd-shared-store-concurrency`). It is one file rather than two because its three claims are one rule read at three depths: the runtime has one import home, that home's filter is targeted and restored, and no blanket flag exists to make the home pointless.",
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
    why: "created by 119/03's own diff and budgeted in it: the 32 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the surface it concerns — the board, the fleet, the home shell and the terminals each already carry one, and design conformance is its own — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 33 -> 34 is 126/03 adding `acd-desktop-supervises-a-supplied-set.test.mjs` (FF-12606): ONE control, on the surface it concerns — the desktop supervisor, which already carries four here — asserting the absences `cargo test` cannot see, because `app/desktop/Cargo.toml`'s workspace EXCLUDES `crates/app` and a Rust test written beside the spawning code would never run. It is one file rather than two because ADR-006 §8's spawn-roster half is NOT a new control: it is an EXTENSION of `acd-desktop-read-only-fleet.test.mjs`, in that control's own file, as a second exported binding the index spreads — the sibling-control species this tree keeps refusing, refused again here rather than budgeted for. 34 -> 35 is milestone 133 story 04 adding `acd-diagram-rendered-as-image.test.mjs` (FF-13304): a control on this directory's existing subject — what the board may render and how — for the one GENERATED body the board now shows. Refine read this row as having a free slot; it had none, so the rise is stated here.",
  }),
  Object.freeze({
    directory: "test/arch/work",
    counts: "direct-children",
    ceiling: 49,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 40 arch controls of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the work-stream act it constrains; this subject has a second level under test/ for the same reason, and an arch control should name record, stream, gate or lifecycle — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 41 -> 43 is 124/00 adding `acd-census-reports-its-denominator.test.mjs` (FF-12401) and `acd-advisory-lane-never-gates.test.mjs` (FF-12402). Two controls, and each names the work-stream act it constrains: the depends census stating its own denominator, and the gate an advisory lane may not reach. Two rather than one because they constrain different acts — a report and a gate — and folding them into one file would be one control asserting two unrelated things. 43 -> 46 is 127/01 landing FF-12701 (`acd-work-root-one-enumerator.test.mjs`), FF-12702 (`acd-number-null-safe.test.mjs`) and FF-12706 (`acd-next-walkers-exclude-archived.test.mjs`) — three controls, each named by the milestone register and each constraining a different work-stream act: the ONE enumerator (no second `readdir` + item-name pairing outside `src/work.mjs`), the null-safety of every `.number` consumer once a row may carry none, and which walkers filter through the live-row predicate. Three rather than one because their red probes are different edits to different files, and a stream act is what this row asks a control to name. 46 -> 48 is 127/02 landing FF-12703 (`acd-one-mint.test.mjs`) and FF-12704 (`acd-intake-write-side-only.test.mjs`) — two controls named by the milestone register, each constraining a different work-stream act: the ONE mint (`appendPosition` exported from one home and called from exactly the promote family; no `insert-*` computes a number of its own) and the intake read on the WRITE side only (`work.intake` seen by the scaffold path, `init` and `promote`, and by no reader). Two rather than one because their red probes are different edits to different files — `max + 1` inside `insert-milestone.mjs` against `listItems` skipping `backlog/` under a stream intake. 48 -> 49 is 127/03 landing FF-12705 (`acd-archive-never-renumbers.test.mjs`) — one control named by the milestone register, constraining the work-stream act it names: the archive touches no number (closed import sets for the face and the engine, the transitive path to the reindex engine crossing the seam and nothing else, no `number:` write, a rewriter that matches link syntax only, and the command calling the seam rather than the engine).",
  }),
  Object.freeze({
    directory: "test/assignment",
    counts: "direct-children",
    ceiling: 5,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 4 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on an existing assignment suite — the lifecycle is one subject and its edges (admission, reclaim, withdrawal, worktree) already have homes here — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
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
    ceiling: 33,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 29 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite that owns the artefact it concerns — the manifest, the installer, the adapters and the hooks each already have one — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 30 -> 31 is story 125 adding `site-build.test.mjs`: the static lint over the Pages workflow (`.github/workflows/pages.yml`, in `release-workflow-lint`'s idiom) and the rows that drive the staging step (`scripts/site/build-site.mjs`), including the gate run the way the workflow runs it. One file rather than two because the workflow and the builder are the two halves of one publishing path, and a row about the gate has to read both. 31 -> 32 is milestone 133 story 05 adding `bundle-architect-draws.test.mjs`: the bundle PROSE suite for the architect rule and refine Decide's one diagram step (ADR-008) — its subject is what the bundle tells an agent, which is this directory's, and it reads the six rendered copies beside the sources. Every ceiling here equals its count, so the rise is stated rather than assumed. 32 -> 33 is story 137 adding `digest-template-ships.test.mjs`: the shipped `AOF.md` template is a bundle artefact with no suite of its own to take a case, so its ship-and-render check is this directory's subject; landed without this row and raised at milestone 130's gate.",
  }),
  Object.freeze({
    directory: "test/command",
    counts: "direct-children",
    ceiling: 12,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 10 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the command's own family; a new file here should mean a new command LAYER, not a new command — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 11 -> 12 is story 128 adding `work-memory-command.test.mjs`, the behavioural half of founding `src/commands/work/` (the new command LAYER this row asks a new file to mean): the door's route resolution, the byte-identity of every verb's render against the ladder it replaced, the `--json` shapes, the zero-byte empty block, the adapter's parsing rules and the coded refusals — driven through the real CLI and the seam, not a case on any existing command's suite.",
  }),
  Object.freeze({
    directory: "test/grade",
    counts: "direct-children",
    ceiling: 28,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 27 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the grade record, the rubric or the acceptance-horizon suite; the evidence rules are one subject and adding a file splits an argument across two — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/graph",
    counts: "direct-children",
    ceiling: 14,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 13 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the driver, the normalizer or the impact suite — the graph surface is three seams and its controls belong on them — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/loop",
    counts: "direct-children",
    ceiling: 74,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 68 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the loop registry, the record or the ladder suite; this is the largest subject in the tree and a new file here needs to name which of those it is not — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 69 -> 70 is milestone 126 story 00 adding `loop-command-narration.test.mjs`, the DRIVEN half of FF-12602, and it names which of the three this row asks for: the LADDER suite — what reaches the operator while a drive or a gate is still pending, and what `--quiet` does and does not silence. It is split from its structural half because a walk's behaviour is measured by walking and a claim about the tree by reading it, not because it is a new subject. 70 -> 71 is milestone 126 story 02 adding `work-loop-declarations.test.mjs`, the DRIVEN half of FF-12604: the predicate walked over literal run records, with the store's own `isRunning`, `isStale` and `retryReadiness` handed in rather than substituted. The LADDER suite again, and split from its structural half for the reason every such pair is split here. 71 -> 72 is `loop-diag.test.mjs` (2026-09-11), the exit-reason recorder's suite: the loop command is what installs it, so its cases sit beside the command's, driven against an injected process double so no real listener outlives the runner. 72 -> 74 is milestone 129 story 04 adding `loop-command-wave.test.mjs` and `loop-command-reconcile.test.mjs` — the LADDER suite again, twice: the wave tick (the ladder extracted to `src/loop/cycle.mjs`, the lanes, the per-base baseline, the wave run, dispatch's admission) and what surrounds it (the three phases, the fresh gate, the signals, the deadline, the resume reconciliation), split by subject because one file over ~100 scenarios of a real git repo is a file nobody reads.",
  }),
  Object.freeze({
    directory: "test/memory",
    counts: "direct-children",
    ceiling: 12,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 10 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the recall, the digest or the index suite — the memory backend is one seam behind three faces and the faces already have files — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 11 -> 12 is story 137 adding `import-digest-template.test.mjs`, the import's render through the shipped template — landed without this row and raised at milestone 130's gate; by this row's own rule it is a case the digest suite could absorb, which is the fold the next change here should make.",
  }),
  Object.freeze({
    directory: "test/mesh",
    counts: "direct-children",
    ceiling: 24,
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
    ceiling: 17,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 16 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the credential or the checkout suite; the clone path is one flow and splitting it further hides the order its steps run in — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
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
    ceiling: 5,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 4 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the invite, join or revoke suite; enrollment is a three-step protocol and a fourth file should mean a fourth step — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/fleet",
    counts: "direct-children",
    ceiling: 9,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 8 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the projection or the render suite — the fleet view is a read model and its tests belong with the read they exercise — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/identity",
    counts: "direct-children",
    ceiling: 9,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 7 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the node-identity or the staleness suite; identity derivation has one home in src/ and its tests should mirror that — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 8 -> 9 is milestone 126 story 02 adding `mesh-status-declarations.test.mjs`, the DRIVEN half of FF-12605: the flagless document proved byte-identical, and exactly one additive key when the flag is asked for. A case on this directory's existing subject — what `mesh:status` answers — not a new one.",
  }),
  Object.freeze({
    directory: "test/mesh/launcher",
    counts: "direct-children",
    ceiling: 6,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 5 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the launcher or the coordination suite — the launcher is one seam with two callers — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/presence",
    counts: "direct-children",
    ceiling: 7,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 6 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the record or the degradation suite; presence is one published shape and a new file here usually means a new FIELD, which belongs on the existing suite — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/registry",
    counts: "direct-children",
    ceiling: 8,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 7 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the store-seam or the lifecycle suite — the registry is one atomic writer and its tests should stay next to it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/relay",
    counts: "direct-children",
    ceiling: 7,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 6 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the auth-gate, the fanout or the envelope suite; the relay is a transport and its three concerns already have files — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/session",
    counts: "direct-children",
    ceiling: 10,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 9 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the per-session record, the ladder or the reaper suite — session lifetime is one story told in three parts — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/mesh/terminal",
    counts: "direct-children",
    ceiling: 6,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 5 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the mirror, the relay-bridge or the input suite; the terminal path is a pipe and a new file should be a new STAGE of it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
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
    ceiling: 20,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 19 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the sync, the descriptor or the mapping suite — the vendor surface is deliberately narrow and its controls should stay on it — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/planning",
    counts: "direct-children",
    ceiling: 17,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 16 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the tune, proposal or headroom suite; the planning family is a pipeline and a new file should be a new STAGE, which is an ADR-level act — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/run",
    counts: "direct-children",
    ceiling: 30,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 27 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the run-store, the lifecycle or the outcome suite — the run record is one shape and its controls belong beside the leg they constrain — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 28 -> 30 is milestone 126 story 01 adding `run-status-render.test.mjs` and `run-status-document-frozen.test.mjs`, and both name which of the three this row asks for: the RUN RECORD's own shape, from the two sides that story has to keep apart. The first drives what the human render prints for a record — the sixteen keys it used to throw away, and the two time figures derived from the injected instant. The second drives the `--json` document through every one of its six answering paths, asserting it did NOT move. They are two files because they are two claims about one shape and a single suite would let a change to either read as a change to both; neither is a new subject.",
  }),
  Object.freeze({
    directory: "test/session",
    counts: "direct-children",
    ceiling: 37,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 36 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the identity, the attribution or the transcript suite; a session control that fits none of those is usually a mesh or a run control wearing a session name — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/store",
    counts: "direct-children",
    ceiling: 22,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 20 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the global-store, the cache or the lock suite — the durable stores are three and a fourth file here should mean a fourth store — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 21 -> 22 is 126/05 adding `sqlite-runtime.test.mjs`. The row said a fourth file here should mean a fourth STORE, and this is not one — it is the suite for the RUNTIME all three durable stores are built on, which is why it sits with them rather than beside either caller: its rows drive the projection store and the effects journal side by side, asserting that the two callers refuse DIFFERENTLY through one shared import home, and a suite that lived in either callers directory could only ever see half of that.",
  }),
  Object.freeze({
    directory: "test/testing",
    counts: "direct-children",
    ceiling: 8,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 7 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the registration, the selection or the budget suite; a control about the test tree that fits none of those is the rarest file in this repository and deserves the pause — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/ui",
    counts: "direct-children",
    ceiling: 58,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 55 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the surface it concerns — the board, the fleet, the home shell and the terminals each already carry one, and design conformance is its own — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 56 -> 57 is 127/04 adding `board-backlog-and-archive.test.mjs`: a case on the BOARD surface (the backlog region, the archive toggle and its mark) that also carries the fleet's one partition lane, over the REAL <Board/> and <Fleet/> mounted against their real faces — the surface this row says the next file here should be a case on, stated as this story's own suite in its STORY.md. 57 -> 58 is milestone 133 story 04 adding `board-diagrams.test.mjs`, the headless suite over `ui/src/board/diagrams.mjs` (the ARCHITECTURE tab's figure states, markup and renderer), beside the board's other ramp suites (`board-freshness`, `board-action`) because it is one more of them. Refine read this row as having a free slot; every ceiling here equals its count, so the rise is stated rather than assumed.",
  }),
  Object.freeze({
    directory: "test/work",
    counts: "direct-children",
    ceiling: 59,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 55 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the suite for the work-stream act it constrains; this subject has a second level under test/ for the same reason, and an arch control should name record, stream, gate or lifecycle — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 56 -> 57 is 124/00 adding `doctor-depends-lane.test.mjs`, the behavioural suite for the depends lane — a suite for the work-stream act it constrains, which is exactly the shape this row asks the next file to take. 57 -> 58 is 127/02 adding `work-intake-write-side.test.mjs`: the phase door's `phase-backlog-ref` refusal (`work:continue|refine|verify` over a backlog ref, 127/ADR-003 §7) and the mode-less READ side under all three intake settings (127/ADR-005) — a suite for the work-stream act it constrains, driven over 127/01's three-root fixture, and not a case on the promote suite because the act is the door and the readers, which promote does not own. 58 -> 59 is milestone 133 story 03 adding `doctor-diagrams-lane.test.mjs`, the ninth doctor lane's suite, beside its sibling lane suites (`doctor-depends-lane.test.mjs` and the rest) because a lane's behaviour is judged where the other lanes' is. Refine read this row as having a free slot; it had none, because every ceiling here equals its count, so the rise is stated here rather than assumed.",
  }),
  Object.freeze({
    directory: "test/work/gate",
    counts: "direct-children",
    ceiling: 11,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 9 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the validate, doctor or grade suite — the gate ladder has a fixed number of rungs and a new file should mean a new rung — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 10 -> 11 is story 137 adding `work-validate-digest-template.test.mjs`, validate's closed key and section sets for a digest record doc — landed without this row and raised at milestone 130's gate; by this row's own rule it is a case the validate suite could absorb, which is the fold the next change here should make.",
  }),
  Object.freeze({
    directory: "test/work/lifecycle",
    counts: "direct-children",
    ceiling: 16,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 15 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the run, status or dispatch suite; the item lifecycle is a state machine and its edges already have homes — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/work/record",
    counts: "direct-children",
    ceiling: 5,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 4 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the record suite for the document it concerns; STORY, SPEC, STATE and VERIFICATION each have one and a fifth document is a refine act — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into.",
  }),
  Object.freeze({
    directory: "test/work/stream",
    counts: "direct-children",
    ceiling: 35,
    allowance: 0,
    why: "created by 119/03's own diff and budgeted in it: the 30 suites of this subject plus the index that names them. ITEM 63's layer had 591 and 439 flat siblings because no row existed to make anybody choose; a subject directory born unmetered would rebuild that one level down, which is the blind spot ADR-009 leg 2 exists to close. The next file here should be a case on the insert, reindex or promote suite — the stream's write acts are enumerable and a new one is an ADR — and if it is genuinely a new subject, that is a new row and a new directory, stated rather than drifted into. 31 -> 32 is 127/01 adding `work-backlog-archive-enumerate.test.mjs`: the stream gained two ROOTS (`backlog/**`, `archive/`), and the suite drives the one three-root fixture through every executable scenario of the story's five task features — the enumerator, the live-row predicate on next/list, validate and doctor over the three roots, the mint and the shift set. It is one file rather than five because the fixture is one, and it is not a case on the insert, reindex or promote suite because the act it constrains is enumeration, which those suites consume rather than own. 32 -> 33 is 127/02 adding `work-promote-mints-the-number.test.mjs`, THE promote suite — the third of the three write acts this row itself names (insert, reindex, promote), which until 127/02 had no suite of its own because the verb did not exist. It drives the resolver, the mint, the stamp, the `--at` slot-open through the existing reindex engine and the depends check over the one three-root fixture; the insert-* aliases' cases land on the insert suite, as this row asks. 33 -> 34 is 127/03 adding `work-archive-is-a-move.test.mjs`, THE archive suite — the stream's fourth write act (insert, reindex, promote, and now archive), which until 127/03 had no suite because the verb did not exist. It drives the resolver and its refusals, the rename, the crossing-link rewrite, `--done` behind its gate, the `stream.archived` cascade and the fleet cache over the one three-root fixture extended with the archive fixture; a case on the promote suite would be a case on a different act. 34 -> 35 is 127/05 adding `work-this-tree-holds-what-is-live.test.mjs`, the outsider's check over the REAL stream rather than a fixture — the one suite in this lane that reads `wiki/work` itself (through the CLI as a child process and the real board face) after the one real `aof work archive --done`: the root is live items only, every resolving reader answers for the archived 52, every walker excludes it, the link ratchet pinned before the move holds, and the add → promote round trip is proved on a byte-faithful shape copy of the stream. It is not a case on the archive suite because that suite proves the VERB on a fixture and this one proves the TREE; the next accept that moves a folder is what this suite exists to stay green across.",
  }),
]);

// ── THE DECLARED EXEMPTIONS ──────────────────────────────────────────────────────────────
// Each one is a layer at or under FLAT_LAYER_THRESHOLD direct children. The reason is its
// SHAPE, and leg 6 re-checks the size claim on every run, so the list cannot quietly absorb a
// layer that has started growing.
export const SOURCE_DIRECTORY_EXEMPTIONS = Object.freeze([
  Object.freeze({ directory: "src/import", why: "the import engine's four modules — a bounded feature surface, well under the threshold." }),
  Object.freeze({ directory: "src/loop", why: "the loop family (129/ADR-008 §1-§2), born by 129/02 with `child-drive.mjs` — the child-process drive, ADR-005 §1 — and three members by the milestone's end (`wave.mjs`, `cycle.mjs`), under FLAT_LAYER_THRESHOLD; milestone 130 adds two more — `stop-request.mjs` (the stop request's ONE home: its path, its ten-key record, 129/04's ladder, the lifecycle and the interrupt source the shell reads, 130/ADR-001) and `stop.mjs` (`stopLoop`, the verb core below the command layer that the CLI face and the fleet route both reach, 130/ADR-002) — five members; milestone 131 adds a sixth — `ask-request.mjs` (the ask's ONE home: its path, its fifteen-key record, the three state words and the answer's sanitation, 131/ADR-003 §1-§2), and story 03 a seventh, `ask.mjs` (the owner's wait, ADR-004) — still under the threshold. Born as an EXEMPTION rather than a row, knowingly and against 119/ADR-009 leg 1's preference, for a measured reason: a row's ceiling must equal its count, so a row would be edited by 02, 03 and 04 in turn while this milestone's thesis is that its stories run concurrently. The row it owes arrives with the ninth file or with the `loop-*` root-leaf move (`src/loop-bounds.mjs`, `src/loop-diag.mjs`, … into this family), whichever is first; leg 6 re-checks the size claim on every run until then." }),
  // milestone 133 — the diagram family, founded by story 01 as FOUR exemptions rather than rows, on
  // 129's `src/loop` precedent: a row's ceiling must equal its count, so rows would be edited by
  // stories 01 and 02 in turn. Each names its members through story 02, so 02 edits no budget line.
  Object.freeze({ directory: "src/diagrams", why: "the diagram engine (133/ADR-002, ADR-003, ADR-005): `layout.mjs` (the one home of the folder, stem, brief, block and link parser, FF-13302), `generators.mjs` (the registry), `generator-diagram-design.mjs` (the one adapter, FF-13301), and story 02's `rasterize.mjs` — four members, under the threshold. A second generator is a fifth file here; a ninth is a row." }),
  Object.freeze({ directory: "src/commands/diagram", why: "the `aof diagram` verb family (133/ADR-004): `plan.mjs` (story 01) and `export.mjs` (story 02), and `file.mjs` — the third verb, decided at `aof:verify 133` (VERIFICATION F-133-02, story 04 task 03): the board's `Source · PNG` links need a committed diagram file served by bytes, and a verb of this family is where a diagram path is read. Three members; the ninth is a row." }),
  Object.freeze({ directory: "test/diagrams", why: "milestone 133's diagram suites: the index, `diagram-layout`, `diagram-generator` and `diagram-plan-command` (story 01), and story 02's export and rasterizer suites — well under the threshold." }),
  Object.freeze({ directory: "test/arch/diagrams", why: "milestone 133's diagram controls: the index, FF-13301 `acd-diagram-generator-named-once` and FF-13302 `acd-diagram-layout-single-home` (story 01), and story 02's FF-13303 `acd-diagram-export-no-playwright` — four members, under the threshold." }),
  // milestone 134 — the work-examples family (ADR-002), founded by story 02 as THREE exemptions on
  // 133's diagram precedent. Each names every member the milestone plans for it, so stories 03, 04
  // and 05 add files without touching a budget line.
  Object.freeze({ directory: "src/work-examples", why: "the work-examples sub-family (134/ADR-002), born `src/work-<subject>/` as chore 106's rule 1 and the `src` row require: `map.mjs` (story 02 — the example map's closed grammar, its pure queries and its token pair, FF-13402) and story 03's `answers.mjs` (the one reader of a person's answer from the harness record, FF-13401). Two members, well under the threshold. The doctor lane over the map is NOT a member: it is `src/work/doctor-examples.mjs`, a module of the doctor family by FF-5905's rule." }),
  Object.freeze({ directory: "test/examples", why: "milestone 134's example-map suites, seven by the milestone's end: the index, `example-map-parse` and `examples-config-gate` (story 02), `example-answers` (story 03), `doctor-examples-lane` and `continue-door-examples` (story 04), and `refine-discovery-beat` (story 05). Under the threshold of eight; an eighth is a case on one of these or a row." }),
  Object.freeze({ directory: "test/arch/examples", why: "milestone 134's example-map controls: the index, FF-13402 `acd-example-map-single-home` (story 02), FF-13401 `acd-example-answer-one-reader` and FF-13404 `acd-settle-reads-the-transcript-store` (story 03), and FF-13403 `acd-examples-off-is-today` (story 04). Five members, under the threshold." }),
  // milestone 131 — the notify family (ADR-005 §2), founded by story 02 as TWO exemptions on 133's
  // precedent, each naming its members so no later story edits a budget line to land one.
  Object.freeze({ directory: "src/notify", why: "the notifier (131/ADR-005 §2, ADR-006 §1): `form.mjs` and `form.d.mts` (the one zero-import formatter every face reads), `notify.mjs` (the config reader, the envelope builder, the channel registry and the delivery), `discord.mjs` (the first channel's renderer, sender and URL shape) and story 08's `secret.mjs` (the machine-wide webhook store's ONE home, ADR-005 §1 as amended at 131/08) — five members, under the threshold. A second channel type is a sixth file here; a ninth is a row." }),
  Object.freeze({ directory: "test/notify", why: "milestone 131's notify suites: the index, `notify-form` (task 01), `notify-channels` (tasks 02, 03, 05 and 06) and `notify-discord` (task 04), and story 08's `notify-messaging` (the `aof messaging` family and its store) — five members, under the threshold." }),
  // milestone 131 / story 08 — the `aof messaging` family (ADR-005 §1, as amended at 131/08), founded
  // as an exemption at one member on `src/commands/diagram`'s precedent, because the `src/commands`
  // row is at its ceiling with an allowance of 0 and a 70th flat sibling is what that row refuses.
  Object.freeze({ directory: "src/commands/messaging", why: "the `aof messaging` verb family (131/ADR-005 §1, as amended at 131/08, story 08): `messaging.mjs` registers `messaging:init`, `messaging:enable`, `messaging:disable` and `messaging:status` from one module, the channel type a positional. One member; a second channel type adds no file here, and the ninth member is a row." }),
  Object.freeze({ directory: "src/integrations", why: "one module. A second integration is a decision this exemption's own threshold check will force into a row." }),
  Object.freeze({ directory: "src/memory", why: "the memory backend's five modules — a bounded surface behind one seam." }),
  Object.freeze({ directory: "src/notion", why: "the notion sync's five modules — a bounded vendor surface behind one seam." }),
  Object.freeze({ directory: "src/spine", why: "the face and its one helper. The spine is deliberately two files; a third is a decision the threshold check will force into a row." }),
  Object.freeze({ directory: "src/work-acceptor", why: "an established `src/work-<subject>/` sub-family (ADR-005 §3), six modules, under the threshold." }),
  Object.freeze({ directory: "src/work-promote", why: "an established `src/work-<subject>/` sub-family, two modules." }),
  Object.freeze({ directory: "src/work-trigger", why: "an established `src/work-<subject>/` sub-family, three modules." }),
  Object.freeze({ directory: "src/work-tune", why: "an established `src/work-<subject>/` sub-family, five modules." }),
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
export async function readTreeListing(roots = ["src", "test"]) {
  // RECURSIVE, and that is a correction rather than a flourish (119/01 review). This descended
  // one level, so a directory at depth 2 was invisible to leg 2 — while the rows below tell the
  // next two stories to put their partitions at exactly that depth. A control that meters flat
  // layers and cannot see one level down is item 78's blind spot rebuilt inside its own remedy.
  const listing = [];
  const walk = async (rel) => {
    for (const entry of await readdir(path.join(repoRoot, rel), { withFileTypes: true })) {
      listing.push({ dir: rel, name: entry.name, kind: entry.isDirectory() ? "dir" : "file" });
      // The guard is on the CURRENT directory, not the child: `src/bundle/` is itself a row and
      // must be listed, and it is its SUBTREE that is out of scope.
      if (entry.isDirectory() && rel.split("/").length < LAYER_DEPTH && !SUBTREE_OUT_OF_SCOPE.has(rel)) {
        await walk(`${rel}/${entry.name}`);
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
      for (const required of ["src", "src/commands", "test", "test/arch"]) {
        assert.ok(SOURCE_DIRECTORY_BUDGETS.some((budget) => budget.directory === required), `${required}/ is one of the four layers ADR-009 names, and it is a row`);
      }
      // …and this story's own two new directories are budgeted in the diff that creates them.
      // …and every directory this MILESTONE's moves create is budgeted in the diff that creates it —
      // 119/01's two, then 119/02's three. A family budgeted only once it has grown is 49's bad cut 4
      // one directory down, and this row is the reason `src/commands/` itself was ever unmetered.
      for (const created of ["src/mesh", "src/work", "src/commands/mesh", "src/commands/assets", "src/commands/graph"]) {
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
      // DERIVED from the table, not typed: the `src/mesh` row moves when 119/04 splits the
      // god-node inside it, and a probe that hard-codes today's count fails then for a reason
      // that has nothing to do with the property it exists to prove.
      const row = SOURCE_DIRECTORY_BUDGETS.find((budget) => budget.directory === "src/mesh");
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

      // (a) THE RENAME. `src/mesh` becomes `src/meshes` in the listing; the row must fail naming
      //     the subject it could not find, never pass on an empty sweep (ADR-009 legs 3 and 4).
      const renamed = clean.map((entry) => {
        if (entry.dir === "src/mesh") return { ...entry, dir: "src/meshes" };
        if (entry.dir === "src" && entry.name === "mesh") return { ...entry, name: "meshes" };
        return entry;
      });
      assert.notDeepEqual(renamed, clean, "the rename LANDED in the synthesized listing");
      const renameViolations = sourceDirectoryBudgetViolations(renamed);
      assert.ok(
        renameViolations.some((violation) => violation.directory === "src/mesh" && /NOT in the tree/u.test(violation.message)),
        `the sweep fails naming the budgeted subject it could not find: ${JSON.stringify(renameViolations.map((violation) => violation.directory))}`,
      );

      // (b) THE SHRINK. A layer below its ceiling must lower the row — a freed slot left in the
      //     ceiling is a silent permission for the next file.
      // Any member of the layer, chosen from the listing — naming one couples the probe to a file
      // that a later story is free to rename.
      const member = clean.find((entry) => entry.dir === "src/mesh" && entry.kind === "file");
      const shrunk = clean.filter((entry) => !(entry.dir === member.dir && entry.name === member.name));
      assert.equal(shrunk.length, clean.length - 1, "the removal LANDED in the synthesized listing");
      const shrinkViolations = sourceDirectoryBudgetViolations(shrunk);
      const freed = shrinkViolations.find((violation) => violation.directory === "src/mesh");
      assert.ok(freed != null && /freed slot/u.test(freed.message), `a shrunk layer fails until its row is lowered: ${JSON.stringify(shrinkViolations.map((violation) => violation.message))}`);
      const lowered = SOURCE_DIRECTORY_BUDGETS.map((budget) => (budget.directory === "src/mesh" ? { ...budget, ceiling: budget.ceiling - 1 } : budget));
      assert.deepEqual(sourceDirectoryBudgetViolations(shrunk, lowered), [], "…and lowering the row to the new measured count clears it");

      // (c) …and RAISING a row never clears anything: the raise is itself the finding.
      const raised = SOURCE_DIRECTORY_BUDGETS.map((budget) => (budget.directory === "src/mesh" ? { ...budget, ceiling: budget.ceiling + 1 } : budget));
      assert.ok(
        sourceDirectoryBudgetViolations(clean, raised).some((violation) => violation.directory === "src/mesh"),
        "raising a row above its measured count never clears anything — the headroom IS the finding",
      );
    },
  },

  {
    name: "arch/119 FF-11904: an unentered layer and an exemption that has outgrown its claim both fire on the shipped detector",
    run: async () => {
      const clean = await readTreeListing();

      // (a) a flat directory added later with NO entry: the sweep fails naming it and its count.
      const added = [...clean, { dir: "src", name: "panels", kind: "dir" }, { dir: "src/panels", name: "panels.mjs", kind: "file" }];
      const addedViolations = sourceDirectoryBudgetViolations(added);
      const unentered = addedViolations.find((violation) => violation.directory === "src/panels");
      assert.ok(unentered != null, `a new flat layer with no entry fires: ${JSON.stringify(addedViolations.map((violation) => violation.directory))}`);
      assert.equal(unentered.measured, 1, "…naming the directory and its count");

      // (b) an EXEMPT layer that crosses the threshold owes a row, and the list cannot absorb it.
      const grown = [...clean];
      for (let index = 0; index <= FLAT_LAYER_THRESHOLD; index += 1) grown.push({ dir: "src/spine", name: `grown-${index}.mjs`, kind: "file" });
      const grownViolations = sourceDirectoryBudgetViolations(grown);
      assert.ok(
        grownViolations.some((violation) => violation.directory === "src/spine" && /owes a ROW/u.test(violation.message)),
        `an exemption that has outgrown its size claim fires: ${JSON.stringify(grownViolations.map((violation) => violation.directory))}`,
      );
      assert.deepEqual(sourceDirectoryBudgetViolations(clean), [], "…and the CLEAN listing, in this same lane, returns none");
    },
  },
];
