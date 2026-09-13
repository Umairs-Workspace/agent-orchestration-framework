---
doc: verification
updated: 2026-09-13
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 128 truly done, and what is the evidence?
  Only sections with content appear (absence is information).
  Parentless story (parent: null) → this is the story's own verification record; there is no
  milestone SPEC box to tick and no milestone regression gate at this door.
  NO @uat and NO @manual scenarios (both tasks are `@executable @cli @work @memory` alone) → no
  ## User sign-off section.
  NO UI surface and no DESIGN.md → no design-conformance section; the renderability precondition is
  never reached, because there is no DESIGN surface to reach it for.
  NO sibling ARCHITECTURE.md → this story declares no FF-NN of its own → no ## Fitness functions
  register. It FLIPS one leg of a control declared elsewhere (124/02's FF-12405 leg 4) and moves
  four frozen lists in four standing controls; those are recorded as evidence rows below.
-->
# 128 · work memory joins the route table — Verification

## Method

Lanes in scope: **`@executable` only**. Both task features carry `@cli @work @memory` and every
scenario is `@executable` — no `@manual`, no `@uat`, no UI, no `DESIGN.md`.

Run **inline** by the product owner who authors this record — also the single writer that allocates
the finding ids below, which is why no id was checked against a register before being allocated.

Every suite run was made under a fresh isolated `AOF_GLOBAL_HOME`, through `node scripts/test.mjs
--only <files>` rather than `node --test` (which passes these files silently, with zero assertions),
and never as the whole repo lane — `global-work-propagation.test.mjs` binds `:4182`, which the live
control daemon holds. The `test/arch/**` lane was run ALONE, nothing else spawning beside it. Every
exit code quoted below was read from `node` or `aof` itself and never through a pipe. `aof work
validate`, `aof work loops validate` and `aof work doctor` were run **from the repository root**,
where an empty-stream false green is not possible. The live probes ran the working tree's `aof`
(the PATH `aof` is an npm link into this checkout) against THIS workspace's real memory store, and
were confined to read-only verbs plus the `-h` guard — `reindex`/`ingest` were exercised only inside
the suites' temp fixtures.

**Four lanes, widening outward from the story's own contract.** Its two own suites and its
integration feature; the twenty suites that import the module it changed (`src/work/memory.mjs`)
plus the command-core contract; the eleven controls it names (the four whose frozen lists moved, the
one it flips, the one it exists to make green, and the memory/manifest controls); then the entire
`test/arch/**` lane — 460 suite files. The full repo lane is not run at this door: 128 is a
parentless story, so there is no milestone regression gate here, and the honest trade is stated in
`aof:verify` itself.

**THE CHECKOUT IS SHARED WITH THREE CONCURRENT LANES, AND THE BOUNDARY IS DRAWN BY REF.** At this
gate the working tree carries 215 changed paths. Besides 128's twenty declared files, it holds
**125** (`in-review`, `site-build` + the Pages workflow lint), **127/02** (`in-progress`,
`work:promote` + the insert-* rework — `src/commands/promote.mjs`, four new suites, `promote.md`
and a `refine.md` edit, the lock and manifest re-stamped), **127/04**'s `ui/src` edits, and
**129/03** (`in-progress`, `work-dispatch-lanes`). Every red below is attributed to its own cause
rather than inherited silently or blamed on this diff, and the attribution is made by asking whether
the failing control's INPUTS are inside 128's envelope, never by whether the failure is convenient.

Three of 128's files are co-touched by other lanes in the same diff: `src/cli.mjs` (127/02 added a
`promote` example line), `src/command-core.mjs` (127/02 registered `promoteCommand`),
`src/spine/face.mjs` (129's `withLauncherOrigin`). 128's hunks in each were read in isolation —
the deleted branch and shim and the `Also:` tail; the `memoryCommand` import and registration; the
`null`-render rule — and are the only hunks this record vouches for.

## Verification evidence

Run 2026-09-13 at the accept gate. Each row names the procedure and the observation; the outcome is
never restated.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | an isolated `AOF_GLOBAL_HOME` and a focused runner over the story's own two suites — `test/command/work-memory-command.test.mjs` (task 00, ten cases, three outlines folded and every row asserted by name) and `test/arch/command/acd-work-memory-routed.test.mjs` (task 01, six cases) | **16 cases, 15 green, 1 red, exit 1.** The one red is task 01's *the command module founds the work family, budgeted*: `src/commands/` holds **68** direct children against a ceiling of 67. The 68th is `src/commands/promote.mjs` — untracked, declared under 127/02's `files:`, written by that lane. 128's own module is at `src/commands/work/memory.mjs` and the `src/commands/work` row exists at ceiling 1; the same case's other two legs pass (F-128-B) | task 00, all nine scenarios; task 01, five of six |
| `@executable` (story), the integration ritual | `node test/integration/cli.mjs work-memory` — `test/integration/features/work-memory.feature` through the REAL CLI over a bare fixture, steps resolved by convention from the shared grammar | **3 scenarios, 3 green, exit 0** — `status` renders `memory: backend=none records=0`; `status --json` answers `backend: "none"`, `recordCount: 0`; `bogus` fails with stderr naming the verb and the usage | task 00 sc. *the migrated verb lands with its integration scenario* |
| `@executable` (consumers of the changed module) | the twenty suites that import `src/work/memory.mjs` — all ten of `test/memory/`, the four `test/graph/graphify-*`, `test/mesh/mesh-memory-syncback-control-reingest`, `test/work/gap-carries-discharge`, `test/work/lifecycle/work-memory-seam`, `test/work/scope-flags-fields-agree`, `test/command/declared-id` — plus `test/command/command-core-contract` | **311 cases, 310 green, 1 red, exit 1.** Every seam consumer is green unedited, which is what proves `runMemory`'s `{ ok, exitCode, result }` contract, the stderr bytes of a refused verb and the `NO_PRINT` default survived the split into `runMemoryVerb`. The one red is `command-core-contract`'s `WORK_IDS` census seeing `work:promote` — 127/02's; `work:memory` is in the census (F-128-B) | task 01 sc. *the seam's existing callers are untouched*; task 01 sc. *the four frozen lists have moved* (`WORK_IDS`) |
| `@executable` (the controls the story names) | `acd-console-log-confined`, `acd-work-command-route-coverage`, `acd-work-command-cli-bijection`, `acd-command-route-derived`, `acd-readme-names-what-ships`, `acd-learning-edge-reaches-every-cut`, `acd-memory-backend-interface`, `acd-memory-recall-contract`, `acd-graphify-backend-selection`, `acd-graphify-binary-absent-degrades`, `bundle-asset-manifest-complete` | console-log-confined **3/3** — the ratchet reads `PRINTER_CEILING = 11` with no `work/memory.mjs` row; route-derived **4/4** — *no group ladder re-implements a routed verb* passes unedited over the closed door; readme-names-what-ships **7/7** — *every command the README spells resolves* green unedited; learning-edge leg 4 **green as flipped** (`work memory` asserted routed, the flag surface still read from the seam); the four memory/graphify arch controls **17/17**; route-coverage 2/5, bijection 3/4, learning-edge legs 3 and 7, manifest-complete/00 — **every one of those reds names `promote`** (F-128-B) | task 01 sc. *story 125's README control goes green*; task 01 sc. *the four frozen lists have moved*; task 01 sc. *the ladder holds no memory branch*; task 00 sc. *the bijection probe answers one document* |
| `@executable` (the budget control) | `test/arch/testing/acd-source-directory-budget.test.mjs` alone | **6 cases, 1 green, 5 red, exit 1.** Four rows are over: `src/commands` 68 > 67 (127/02's `promote.mjs`), `test/arch/work` 48 > 46, `test/work` 58 > 57, `test/work/stream` 33 > 32 (127/02's four new suites). **128's five directories sit exactly at their ceilings** — `src/commands/work` 1/1 (new row, `why` names the fold as a separate item), `test/command` 12/12, `test/arch/command` 25/25, `test/integration/features` 9/9 (the exemption 128 turned into a row), `test/integration/steps` 10/10 | task 01 sc. *the command module founds the work family, budgeted* |
| `@executable` (fitness) | the ENTIRE `test/arch/**` lane — all 460 suite files, imported by path under an isolated global home, run alone | **1956 cases, 1935 green, 21 red, exit 1**, no file unusable. Twenty of the twenty-one are attributed to other lanes or the committed corpus (F-128-B, F-128-C, F-128-D, F-128-E). **One is 128's:** `m58/FF-5810` — *`retrospective-memory-ingest.md`: `runMemory` cited at `src/work/memory.mjs:492`, export is at `:496`* (F-128-A, fixed below) | the standing fitness lane |
| `@executable` (fitness), over the FINAL tree | the same 460-file lane run AGAIN after F-128-A's fix, after this record, `OUTCOME.md` and `RETROSPECTIVE.md` were written, and after `aof work memory ingest` — several controls read the `wiki/work` corpus and the bundle, so a lane run that predates the record documents has not seen the tree being accepted | **1956 cases, 1949 green, 7 red, exit 1.** `FF-5810` is **green** and stays green with the three records on disk. **No control went red from the record documents or the ingested store.** Fourteen controls went green between the two runs: FF-5810 from this story's fix, and thirteen from the concurrent 127/02 lane advancing during this gate — it raised the `src/commands` budget row to 68 with a stated reason, mapped `promote` in the bijection and route-coverage lists, added `work:promote` to `WORK_IDS`, classified `promote.md` on FF-12405's roster and re-pointed the `preflightTopLevelScaffold` pin. The seven that remain are F-128-C's five (125), F-128-D's `FF-5307` (127/04's `ui/`), F-128-E's ceiling, and F-128-B's `refine.md` edit (FF-12405 leg 3). 128's own leg-4 flip and its loop-record hash survived that lane's additive writes to the same two files, checked by re-reading both | the accept decision below |
| the door, at the source | the working tree's `aof` against this workspace (backend `graphify`, 2369 records) | `aof work memory status` → `memory: backend=graphify records=2369`, exit 0; `status --json` → the `{ backend, recordCount, … }` object, exit 0; `recall "pin line endings" --kind near-miss --block --limit 2` → the two-line injection block; `recall … --limit 1 --json` → **an array**, length 1 | task 00 sc. *every verb's human render*, *every verb's --json document* |
| the verb gate, at the source | `aof work memory bogus`, `aof work memory` (no verb), `aof work memory bogus --json`, `aof work memory help` | `bogus` → exit **1**, stderr `Unknown memory verb "bogus".` + blank + the usage; no verb → `Missing memory verb.`; `--json` → exactly one document `{ ok: false, error: …, code: "unknown-verb" }`; `help` typed as a verb → `Unknown memory verb "help".` | task 00 sc. *an unknown or missing verb is a coded refusal* |
| the spine's policy, at the source | `aof work memory status --bogus`, `aof work memory status --help` | `Unknown flag "--bogus" for work:memory.` exit 1; `Unknown flag "--help" for work:memory.` — the refusal the feature preamble declares for `--help` | task 00 sc. *an undeclared flag is refused* |
| the help guard, at the source, against the LIVE index | `status --json` record count and the index file's mtime read before; then `reindex -h`, `ingest -h`, `recall -h`; then both read again | each `-h` printed `Usage: aof work memory <verb> …` on stdout at exit **0** with zero bytes on stderr; the record count read **2369 before and 2369 after**, and `.aof/aof.memory.graphify.index.json`'s mtime was **unchanged** (`04:19:21.628` both reads) — the guard reached no backend write through the routed door | task 00 sc. *a help-seeking positional reaches no backend* |
| the empty block, at the source | `recall "zzz-no-such-thing-qq" --block` on the live graphify backend | **1023 bytes** at exit 0 — a real five-record block, because graphify RANKS records for any query (`--json` on the same string answers 5). Zero bytes is a property of a backend that answers no record, which is what the suite's `local`-backend fixture pins (green above); the live store cannot exhibit a miss and this row records why the suite is the evidence | task 00 sc. *an empty block prints nothing* (the suite row) |
| the closed door, at the source | `grep` over `src/cli.mjs` and `src/` | no `subcommand === "memory"` branch; `workMemoryCommandCli` survives only as a one-line RETIRED comment; `workMemoryCommand` is imported by **nothing** under `src/` (the two remaining mentions are the headers of `commands/work/memory.mjs` and `work/memory.mjs`, prose); `src/work/memory.mjs` carries `console.log` only in two comments — and `acd-console-log-confined` reads through the comment stripper | task 01 sc. *the ladder holds no memory branch and no memory shim*; sc. *the four frozen lists* (`console.log` nowhere) |
| the help text, at the source | `aof --help` | line 70, under `Work (ACD work stream):`, is `aof work memory <verb> [args] [--area --stage --kind --owner --item NN --status] [--limit N] [--all] [--block] [--json]` — the seam's ONE usage line; the `Also:` tail at line 128 carries `aof session start|ping|end` alone | task 01 sc. *the help text lists the verb where the registry puts it* |
| the two review-added files | `git diff` over `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` and `src/bundle/loops/retrospective-memory-ingest.md`; `cmp` against `.aof/loops/` | leg 4's assertion is flipped to `registered.includes("work memory") === true` with its header rewritten to say WAS; the loop record states the surface IS a registered command id and that `module:src/work/memory.mjs#runMemory` stays the narrowest export for the ingest act; the installed copy is byte-identical; the manifest hash equals the file's sha256 | STORY `files:` (the review additions) |
| **F-128-A, fixed at the close** | the three drifted citations re-pinned (`:492→:496`, `:478→:482`, `:467→:470`; `:58` was true), the installed copy re-synced, `node scripts/generate-bundle-manifest.mjs` run, `aof work update` run | the manifest regen moved **exactly one hash** (`f39ee651…` → `00201de9…`, diffed against a pre-regen copy); `aof work update` reported *150 up-to-date, 0 drift-warning* and re-stamped the lock with the same one hash; then `FF-5810` **green**, `FF-12405` legs 8/9/10 **green** (leg 9 had gone red between the regen and the update — the manifest and the lock disagreeing on one path — which is the ritual's own check working), `ADR-002` manifest hashes **3/3 green** | F-128-A |
| gate | `aof work validate 128`, from the repository root, unpiped | `PASS — 128 is well-formed.` **exit 0** | step 4 |
| gate | `aof work validate` (whole stream), from the repository root, unpiped | **exit 1, 4 issues** — all four `story reads path … does not exist`, raised by 119/00, 119/03, 119/04 and 79 against suites 119/03 moved under `test/bundle/` and `test/arch/<subject>/`. All four paths are absent at HEAD, all four record docs are clean against HEAD, and squash `b088825c` recorded each move as `D` + `A` — `git log --diff-filter=R -M` carries no rename for them, so the resolver's rename map cannot reach them. Red on the committed tree since PR #29; none is in 128's envelope (F-128-F) | step 4 |
| gate | `aof work loops validate`, from the repository root | **exit 0, 0 error, 33 warn** — every warn is a standing registry-shape finding (`loop-anchor-absent`, `loop-graph-grounded-exogenous-only`, `loop-field-prose-only`) that predates this story; the `retrospective-memory-ingest` declaration's actuator raises nothing | step 4 (the loop lane) |
| gate | `aof work doctor 128`, from the repository root, unpiped | **exit 0**, and **no `control-unresolved` at either severity**. Warns only: `numbering-gap` (stream-wide: 42 and 122 missing between 00 and 129), `rubric-join-unchecked`, `depends-edges-unchecked` (stream-wide census). `Loop-Ready: 80% (8/10) — clears L1; blocking: grounding, anchor-grounding` — the score 123 recorded, unchanged | step 4 |

**No `## Fitness functions` register is written, and that is a decision.** This is a parentless
story with no sibling `ARCHITECTURE.md`, so it declares no `FF-NN` of its own, and the red-probe
obligation reaches declared `FF-NN` ids alone. What the story does is flip one leg of
`m124/FF-12405` (leg 4, from *asserted unrouted* to *asserted routed*) and move four frozen lists
inside four standing controls; each is recorded as an evidence row above with what it now asserts.
`aof work doctor 128` confirms the position: zero `control-unresolved` findings at either severity.

**Traceability, read by hand.** Task 00's nine scenarios (three of them outlines — 6, 4 and 9 rows)
map to the ten named cases of `work-memory-command.test.mjs` plus the three integration scenarios;
task 01's six map to the six named cases of `acd-work-memory-routed.test.mjs`. No `@manual`, no
`@uat`, no `@finding-<id>` and no `verifies →` pointer exists in either feature. The litmus is
noted rather than flagged: several `Then` steps name code (`PRINTER_CEILING is 11`, `asserted over
src/spine/face.mjs`), and that is the story's subject — a door migration whose contract IS the
registry's shape — not a behavioural scenario leaking implementation.

## Findings

Ids are allocated here by the single writer of this record, at the moment of landing them.
**No blocker finding is open.** One was fixed at this close; six are recorded, and none of the
six is a story 128 defect.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-128-A | **The loop record 128 rewrote cited three seam lines that drifted before the story closed.** `src/bundle/loops/retrospective-memory-ingest.md:25-28` cited `runMemory` at `:492`, `runMemoryVerb` at `:478` and the reindex alias at `:467`; the shipped seam has them at **496 / 482 / 470** (`MEMORY_VERBS:58` was true). The record was re-pinned at review, and the same review round then added the help-guard comments to the seam above those lines. `m58/FF-5810` reported the defining-export one and was red in the arch lane; the two non-defining citations are below any control's reach and were found by reading the four lines. The story's build lane did not include FF-5810, whose subject a loop record is | declaration inaccuracy | Important | **question 2 answers: cheaper than the driver that would carry it.** Three numbers, the installed copy, one manifest regen and one `aof work update` — against a story driver. Fixed at the close, and the ritual's own check (FF-12405 leg 9, manifest ↔ lock) went red for the one step between regen and update, then green. The record's `file:line` convention is kept: it cites `retrospective.md:28-37` the same way, and changing that convention is a loop-record decision, not this story's | the loop, at this close | **fixed** |
| F-128-B | **Sixteen reds across eleven controls are 127/02's (`work:promote`), not this lane's.** `src/commands/promote.mjs` is the 68th flat sibling — it reds 128's own *founds the work family, budgeted* scenario and `FF-11904`'s `src/commands` row, with three more `FF-11904` rows from that lane's four new suites (`test/arch/work` 48 > 46, `test/work` 58 > 57, `test/work/stream` 33 > 32) — and the same registration reds `command-core-contract`'s `WORK_IDS` census, three `acd-work-command-route-coverage` rows (no `/api/work/promote`), the bijection probe (*unmapped subcommand promote*), `FF-12702`'s `.number` census, `FF-12405` leg 3 (`refine.md` edited — the new Step 0) and leg 7 (`promote.md` unclassified), `bundle-asset-manifest-complete/00` (`commands/promote.md` untracked), `acd-cache-read-surface-boundary` (`insert-shared.mjs` no longer declares `preflightTopLevelScaffold()`), and `FF-11902`'s tree-walk leg (`acd-one-mint.test.mjs:245`). 127/02 is `status: in-progress` and declares every one of those paths. **Thirteen of the sixteen went green during this gate** as that lane advanced (the final-tree row above); the `refine.md` edit (FF-12405 leg 3) is the one still red | concurrent-lane collateral, correctly attributed | Important | do NOT fix at this close. Every remedy is inside 127/02's envelope and its own gate is where the budget rows, the census and the board route are answered; repairing them from here would make that lane's gate read green on work 128 did. Recorded with its owner named; `aof work validate 128` is `PASS` throughout, and 128's own placement claim holds by arithmetic — 68 − 1 = 67 with that lane's one file absent | 127/02, at its own gate | open |
| F-128-C | **Five reds in the 119 controls are 125's.** `FF-11902` reports `test/bundle/site-build.test.mjs` four times (two `readdir`-then-`filter` walks with no non-vacuity leg at `:668` and `:732`; two literal member censuses at `:401` and `:483`), and `FF-11901` reports `test/arch/loop/acd-site-is-projected-not-copied.test.mjs:91` spelling its own import-specifier extractor rather than importing `test/support/module-family.mjs`'s. Both files are 125's (`in-review`); neither is in 128's envelope | concurrent-lane collateral, correctly attributed | Important | not 128's to fix — 125 is in review and these are exactly the shape its review should return. Recorded with its owner named | 125, at its own gate | open |
| F-128-D | **Two reds are 129/03's and 127/04's.** `FF-11902`'s census leg reports `test/work/lifecycle/work-dispatch-lanes.test.mjs:1096` asserting a derived set equal to a literal (129/03, `in-progress`); `m53/FF-5307` reports `ui/` changed against its zero-board-change digest — eight modified and one new file under `ui/src/`, all declared by 127/04's `files:` | concurrent-lane collateral, correctly attributed | Important | not 128's; 128 touches nothing under `ui/` and nothing in `test/work/lifecycle/` | 129/03 and 127/04, at their own gates | open |
| F-128-E | **`m119/FF-11903`'s citation ceiling is red at 57 > 47.** Fifty-seven distinct `src/` citations under `wiki/work/**` resolve neither at HEAD nor through a recorded rename. The list is the standing corpus (one-letter and `commands-old` illustrative module names spelled as paths inside shipped features and ADRs) plus in-flight records citing modules not yet landed (127's `ARCHITECTURE.md` naming the `archive` command module six times before 127/03 has built it; 129's `VERIFICATION.md` naming `added` and `c` fixture modules). **128 contributes zero rows**: every `src/` path its `STORY.md` cites exists, and this record and the two beside it spell no path that does not exist — the offending names are quoted here as names for that reason | pre-existing red control + in-flight records | Important | not a 128 defect and not fixable inside its contract. The in-flight half discharges as 127/03 and 129 land what their records name; the corpus half is a decision about illustrative citations in delivered features, which needs a story to state it. Handed back as a story shape, with the observation that the ceiling has been red at three consecutive gates in three different readings (86/65 at 123, now 57/47) | the operator, as a story shape; 127 and 129 for their own rows | open |
| F-128-F | **The stream-wide `aof work validate` is red on the committed tree, from PR #29's squash.** Four `story reads path … does not exist` findings — 119/00, 119/03, 119/04 and 79 each reading a suite at its PRE-119/03 flat location (`bundle-asset-manifest-complete` at the test root; `acd-suite-registration-single-decider`, `acd-assignment-repo-availability-loud` and `acd-loop-module-import-boundary` directly under the arch root) that 119/03 moved into `test/bundle/` and the `test/arch/<subject>/` directories. All four old paths are absent at HEAD; all four record docs are clean against HEAD; the resolver, `validate.mjs` and `doctor.mjs` are clean against HEAD; and `git show --name-status -M b088825c` records the moves as `D` + `A`, so the rename map the resolver builds from `git log --diff-filter=R -M` cannot reach them. The 126 gate ran validate item-scoped only, so this is the first record of the stream-wide red | pre-existing red gate, inherited | Important | not 128's. The resolver's own comment says a delivered story's `reads:` is never edited to say otherwise — the remedy is a decision about how a rename that git's `-M` did not see gets recorded (a lower threshold, or a recorded-rename side file), which needs a story to state it. `aof work validate 128` is `PASS` | the operator, as a story shape | open |
| F-128-G | **A story's `RETROSPECTIVE.md` is never indexed, so step 5's promise is not kept for a story.** After `aof work memory ingest` (2369 → 2385 records) the sixteen new records for item 128 are all `OUTCOME.md` capabilities and the one gap; none of R1–R3 is in the store. `buildRecords` (`src/memory/local-indexing.mjs`) reads `RETROSPECTIVE.md` and `ARCHITECTURE.md` only where `isMilestoneSource` holds — `type === "milestone" && parent == null` — and its own comment says so: *milestone-scoped — RETROSPECTIVE / ARCHITECTURE / AOF: unchanged, still top-level milestones only*. Story 80 widened `OUTCOME.md` to any item and left this predicate as it was. Measured over the live store: **452** RETROSPECTIVE-sourced records, **zero** from any `*_story_*` folder — 123's three lessons included. Every story retrospective written since story 85 made them mandatory is on disk and unreachable through recall | process gap, pre-existing | Important | not 128's, and not cheaper than the driver: `local-indexing.mjs` is outside this story's envelope, and the widening is the shape story 80 needed for outcomes — a cited `item` that is the REF (`m39/02`, never `m02`), the scoped-rebuild semantics, the derived-index fitness function — which needs acceptance criteria a `.feature` must state. The verify prompt's step 5 should say what is true until then: a story's lessons are folded in when its parent milestone's are, and a parentless story's not at all. Handed back as a story shape | the operator, as a story shape | open |

**What is green.** The story's own task 00: **ten cases and three integration scenarios, all
green** — the route resolves, six human renders and four `--json` documents byte-identical to
literal goldens captured from the ladder, the empty block zero bytes with the face's `null` rule
asserted over `face.mjs`, nine adapter rows, the coded `unknown-verb` refusal in both projections,
the inherited unknown-flag refusal, the bijection probe, and the review-round `-h` guard with the
index count unchanged. Task 01: **five of six green**, the sixth red on another lane's file with
128's own two legs of that case passing. The twenty seam consumers green unedited; the four moved
lists and the flipped leg green; 125's README control green unedited. Every one of the eleven live
probes answered at the source what the suite answered in its fixture, including the `-h` guard
against the real 2369-record index. `aof work validate 128` `PASS`, `aof work loops validate`
zero errors, `aof work doctor 128` no `control-unresolved` at either severity, exit 0.

**And the standing fitness lane is green but for the twenty-one controls above**: 1956 cases,
twenty reds from three concurrent lanes and the committed corpus, one from this story — fixed at
the close and re-run green.

## Accept decision

**ACCEPTED, 2026-09-13, on the first gate.** `aof work status 128 done` was run and stamped the
acceptance.

**What the accept rests on.** Both tasks' scenarios are green in the story's own lane — every
scenario of task 00 and five of six of task 01, the sixth red on a file this story never wrote —
and the claim the story exists to make was confirmed at the source: the door resolves, the ladder
holds no branch, the help text lists the verb under Work, and every verb answered the live
workspace what it answered the fixture. The one behaviour the review round added — a help request
reaches no backend through either door — was probed against the real index and left it untouched.
The one 128 defect the gate found (F-128-A) was fixed in the beat that found it, by the ritual the
bundle owns, and the control that reported it is green.

**No delivered contract was edited.** 124/02's leg-4 scenario is superseded in 128's own task 00
preamble and its `.feature` is untouched; 42's `WAVE-D-MIGRATION.md` is history and is untouched;
`git status` over 124 and 42 is empty.

**Six findings remain open, all Important, none a story 128 defect.** F-128-B, F-128-C and
F-128-D are collateral from three concurrent lanes, each named with its owner and answered at that
lane's gate; F-128-E is the corpus citation ceiling, now in its third consecutive recording; F-128-F
is the stream-wide validate red on the committed tree from PR #29's squash, recorded here for the
first time because the previous gate ran validate item-scoped; F-128-G is the memory indexer never
reading a story's `RETROSPECTIVE.md`, which means this story's own R1–R4 are on disk and not in
recall — the same is true of every story retrospective written since story 85.

**The close created nothing.** One finding was cheaper than any driver and was fixed; six were
not this story's and were recorded or handed back as story shapes. No chore was minted, no folder
was deposited in the stream.
