---
type: story
number: 73
slug: item-status-lifecycle
title: "The item status lifecycle — status is written by machinery, not by prose"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-20
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A standalone story (no parent) is self-contained.
-->
# 73 · The item status lifecycle — status is written by machinery, not by prose

## User story

As an operator watching work across the board, the fleet and `aof work next`,
I want an item's status to be moved by the doors that actually start, review and accept it,
so that what the stream says about an item is what is happening to it — and the failure rollback
that exists to keep the stream honest has something to roll back.

## Tasks

- [x] `tasks/00_the-lifecycle-and-its-one-writer.feature` — the lifecycle is a declared table with
      one home, and one surgical write serves both guarded faces: legal edges land, everything else
      is refused coded and writes nothing
- [x] `tasks/01_a-minted-run-starts-its-item.feature` — a minted run moves its own item to
      `in-progress` through the ledger, with no caller cooperation and no prose
- [x] `tasks/02_the-status-door.feature` — `aof work status` reads the status and its legal moves, or
      moves one edge; the local phase door starts its item; the command bundles call the verb

## Findings

Architect verdict **SOUND-WITH-FINDINGS**; QA coverage verdict **SUFFICIENT at scenario granularity**
(16/16 `@executable` scenarios green, the one `@manual` scenario passes) with clause-level gaps. No
blocking finding. Reviewers reported unnumbered; ids allocated here at landing.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-73-A | The `run.started` cascade ORDER is declared load-bearing in three places and asserted nowhere: inserting a reactor above `advance-status` would silently republish `not-started` for a started run. `src/effects/table.mjs:420-426` | test-gap | medium | non-blocker → follow-on: one `keys.indexOf("advance-status") < keys.indexOf("publish-projection")` in `acd-effects-ledger`, the idiom `acd-notion-sync-ledgered:169-172` already uses for `run.completed`, plus the `item-status.changed` mirror | architect / story 73 follow-on | open |
| F-73-B | The deliberate non-advance on `run.completed --outcome done` (a run carries no phase) is stated as a decision at `src/effects/table.mjs:62-66` and nothing fails if a future edit adds it | test-gap | low | non-blocker → follow-on: assert `advance-status` is absent from `EFFECTS["run.completed"]` | architect / story 73 follow-on | open |
| F-73-C | `setItemStatus` has no caller allow-list, so a future writer can land the fact and skip the event. The ledger keeps exactly this discipline for `completeRun`/`startRun`/`reclaimRun` (`acd-effects-ledger:74-92`). Sanctioned callers today are only `effects/item-transitions.mjs:42` and `effects/table.mjs:73` | design-gap | medium | non-blocker → follow-on: add `SET_ITEM_STATUS_ALLOWED` to that file's existing sweep — green today | architect / story 73 follow-on | open |
| F-73-D | The two new modules on the frontmatter path sit outside `acd-status-rollback-bounded`'s module family (`src/work.mjs` + `src/commands/run-*.mjs` only, `:36-40`): neither `effects/item-transitions.mjs` nor `commands/item-status.mjs` is asserted fs-write-free (both are today), and nothing asserts `writeItemStatusLine` stays unexported | test-gap | low | non-blocker → follow-on: extend the family list; assert the export absence | architect / story 73 follow-on | open |
| F-73-E | `statusFrom` on the phase-door result is a SECOND meaning for an established key in the same domain: `work-doctor.mjs:223,261,373`, `work-doctor-coherence.mjs:92-115` and `work-read.mjs:282` use `statusFrom` for the SOURCE of the status fact (`"cache"｜"disk"`). The same fact is already spelled `from` on the `work:status` result and in the event payload. `src/commands/continue.mjs:173` | defect | medium | non-blocker → follow-on: rename the phase-door key to `from` (or `statusMovedFrom`) and add the four additive keys to `ui/src/board/api.ts:120-131` so the declared envelope stops being narrower than the wire | architect / story 73 follow-on | open |
| F-73-F | Two code comments still state the wrong mechanism for the remote path — that a worker's status write rides its worktree. It rides the worker's PRIMARY checkout by design (`mesh-worker-execution.mjs:1551-1559`), so the remote path fixes the published projection, not a committed line. `src/commands/continue.mjs:154-157`, `src/commands/item-status.mjs:30` | defect | low | non-blocker → follow-on: correct both comments. The STORY/`.feature` prose was corrected at assimilation | architect / story 73 follow-on | open |
| F-73-G | Three doc-shape faults share the lifecycle refusal's code — `writeItemStatusLine` (`src/work.mjs:619-634`) throws the caller's `code` for "no record doc" / "unreadable" / "no frontmatter", which on the forward face is `status-edge-not-applicable`, and the run-mint reactor treats that code as the sanctioned no-op (`effects/table.mjs:76`). So a malformed record doc — including the known leading-`<!-- aof-generated -->` frontmatter trap — is swallowed as ordinary idempotence. Inherited from the rollback face, but doubled | defect | medium | non-blocker → follow-on: a distinct `record-doc-unusable` code so the reactor's skip stays narrow and a real fault reaches `reportDegrade` | architect / story 73 follow-on | closed → 74/01 (`record-doc-unusable`) |
| F-73-H | `advance-status` stamps `updated:` from the wall clock even when its transition was given an injected `now`: `effects/table.mjs:73` passes none, and `run-transitions.mjs:188-191` puts no `now` in the reactor ctx — unlike `recordItemBranch`/`settleAssignment`, which read `ctx.now`. One doc-writing reactor is therefore non-deterministic | defect | low | non-blocker → follow-on: thread `ctx.now` | architect / story 73 follow-on | open |
| F-73-I | The local phase door now builds the cache-first stream view TWICE per act — `resolveItem` inside `resolveDirectivePhase` (`continue.mjs:130`) and `resolveItemExact` inside `startedHere` (`:165`) — on top of `readExecutionOverlay`, on the hottest door in the system (board button, fleet and CLI all route through it) | enhancement | low | non-blocker → follow-on: resolve exact once before the branch, hand the item to both | architect / story 73 follow-on | open |
| F-73-J | Task 00's clause "an item with no status line is refused rather than silently rewritten" has no asserting test — every fixture writes a status line; only the table query `itemStatusEdges(undefined)` is covered. QA probed the writer directly: it throws `status-edge-not-applicable` and leaves the doc byte-unchanged, so the behaviour is right and only the assertion is missing | test-gap | low | non-blocker → follow-on: one case in the writer group | QA / story 73 follow-on | open |
| F-73-K | Task 02's clause "the refusal names the item's actual status and its legal moves" is unasserted — the lane's helper checks only `.code`. QA probed the message and it is correct | test-gap | low | non-blocker → follow-on: assert the message in the door group | QA / story 73 follow-on | open |
| F-73-L | Task 00's 11-row Examples table is exercised by ITERATING `ITEM_STATUS_EDGES` — the implementation's own table — so a future edge deletion would silently un-cover a delivered row while staying green. (The refusal lane lists its 8 pairs literally; the arch guard pins only `done`-reachability and self-edge absence, not the 11-edge set) | test-gap | medium | non-blocker → follow-on: pin the 11 pairs literally, or assert the table's full shape in the arch guard | QA / story 73 follow-on | open |
| F-73-M | m20/`03_resilience-acceptance.feature`'s clause "item 20 frontmatter status is not-started" after the reclaim scan no longer has CLI-LEVEL proof: that lane's only evidence was `next --json`'s offered status, which is now honestly `in-progress` (the same command re-mints). The clause survives as an in-process seam call in `run-status-rollback.test.mjs`, which was STRENGTHENED (it now drives the scenario's own `When` and asserts both states). No CLI verb runs the scan in isolation — `run-start` and `resume` both mint immediately after | design-gap | low | accept-and-record: the intermediate is unobservable through the CLI by construction. Expose a scan-only path only if that clause must stay outsider-verifiable | m20 traceability / backlog | open |
| F-73-N | Prose residue at `src/bundle/commands/verify.md:137` (rendered identically into both runtimes): "before you set `status: done` — the marker changes what doctor prints…". A temporal reference to the acceptance act rather than an instruction to edit a file, and the block below mandates the verb — so the `@manual` clause passes — but it is the one remaining phrasing an agent could read as the hand edit this story removes | enhancement | low | non-blocker → reword in the next bundle touch | PO / story 73 follow-on | open |
| F-73-O | The surgical frontmatter block-in/block-out idiom now has THREE implementations sharing a byte-identical capture regex and reassembly expression — `work.mjs:631,640-642` (`writeItemStatusLine`), `work.mjs:686,695` (`applyItemFrontmatter`, ADR-004-locked) and `work-reindex.mjs:84-90` (`replaceFrontmatterBlock`) — and appears in no TECH_DEBT entry. This diff added no copy but is the item that touched one. Worth the same entry: the record docs' date stamp now has five derivations (`import-milestone.mjs:137`, `insert-shared.mjs:284,611`, `migrate-folder.mjs:122`, and the new `work.mjs today()` — the first with an injected clock, so the natural one home) | design-gap | medium | non-blocker → LEDGER: a new `wiki/work/TECH_DEBT.md` entry (the fix touches an ADR-004-locked writer and the reindex engine, so it does not fit this item) | architect / TECH_DEBT | open |
| F-73-P | **Not this story — the CO-RESIDENT change.** `src/mesh-worker-execution.mjs:2019` consumes `driveInteractiveClaudeSession` as a value, but `:851-865` is an `export { … } from "./agent-session-driver.mjs"` — a re-export binds no local name — and no `import` provides one. So `createMeshWorkerTerminalResumeHandler` without an injected `spawnRuntime` dies with `ReferenceError`, reproduced directly. GREEN at HEAD, red in the working tree; it takes down `item-lock-holder-identity`'s m42 resume lane. The file's own comment at `:848-850` records this exact trap for `defaultSpawnRuntime`/`defaultPtySpawn` (both re-imported at `:146`) and missed this third consumer | defect | high | fix now — the worker terminal-resume path is broken | milestone 53 / story 00 (session-driver extraction) | open |
| F-73-Q | **Not this story — pre-existing at HEAD.** `work:init-config`, `work:loops-graph`, `work:loops-show`, `work:loops-validate` and `work:resume` are registered in `command-core` but absent from `command-core-contract`'s `WORK_IDS` and (for the `loops-*` trio) from `acd-work-command-route-coverage`'s `BOARD_DEFERRED` — four red lanes, verified against HEAD on both the modules and both lists. `work:status` is in NEITHER mismatch set, so this story's registry/route bookkeeping is complete | defect | medium | non-blocker → one chore widening the two lists | chore behind `9e0f910` | open |
| F-73-R | **Not this story — five further pre-existing reds** QA verified red at HEAD with the relevant sources untouched here: `run-commands/00 … empty history` (`answeredFrom: "disk"` added to `work:run-status` without moving the m19 expectation); `bundle/loader` ×3 (descriptor member `artifact-sync-enqueue`, `kind: "asset"`, falls in none of the loader's buckets → 49 loaded vs 50 declared, from `eacbd57`); `bundle-asset-manifest-complete/00` (a `61` tripwire vs 62 files — a template landed in `9e0f910` without moving the literal, and the tripwire throws BEFORE the load-bearing set-equality runs); `acd-memory-backend-selection` + `acd-graphify-backend-selection`; `acd-no-new-silent-catch` | defect | low | non-blocker → sweep in one housekeeping chore | backlog | open |

## Accept decision

**ACCEPTED 2026-08-16** at `aof:assimilate-code` — the reverse path: the work was already delivered,
so there was no research or build stage, and the code was left EXACTLY as gathered (nothing staged,
nothing committed, no implementation or test file edited by this pass).

What the decision rests on:
- **Architect (structural): SOUND-WITH-FINDINGS**, no blocker. The load-bearing calls were each
  verified mechanically rather than argued: the lifecycle table's home is enforced by
  `acd-acceptance-horizon-single-predicate` (homing it in `work.mjs` would have turned that gate red);
  the vocabulary leaf still has **0 outbound edges**, so 66/02's FF-6605 holds; there is **exactly one**
  `status:`-line rewrite in `src/`, and the count did not rise (the diff folded the rollback's private
  copy into the shared writer); the failure face's target check precedes the shared writer, so no table
  permission can make it write forward; and `acd-status-rollback-bounded` came out **strictly stronger**
  than the invariant it replaced.
- **QA (coverage): SUFFICIENT at scenario granularity** — all **16 `@executable` scenarios** (21
  Example rows) have a covering, green test, and the `@manual` bundle-surface scenario passes
  (`work update --dry-run` → 0 updated / 0 drift-warning; **87/87** install-lock hashes and **87/87**
  bundle-manifest hashes agree with the bytes on disk). Clause-level gaps only, all three probed
  against the implementation and found correct (F-73-J/K/L).
- **Measured: 1323 tests, 1310 passed, 13 failed — none of them this change.** 12 verified red at HEAD
  (re-run against a pristine `git archive HEAD` checkout, not taken on trust), and 1 broken by the
  co-resident milestone-53 change sharing this working tree (F-73-P). The full `test/arch/` directory —
  296 files, 1072 tests — is **1066 green**. `aof work validate 73`: **PASS**.
- **No blocking finding is open on this story.** The one HIGH-severity finding, F-73-P, is a
  `ReferenceError` in the co-resident session-driver extraction and is routed to milestone 53 / story
  00; it is not this story's to fix and does not gate it.

Carried forward: fifteen open findings (F-73-A…O), none blocking — five test-gaps that would pin
decisions this diff only states in comments (cascade order, the `run.completed` non-advance, the
caller allow-list, the module family, the 11-edge table), two `defect`-typed follow-ons worth doing
first (**F-73-E** the `statusFrom` key collision, **F-73-G** the doc-shape faults sharing the
idempotence code), one TECH_DEBT entry to raise (**F-73-O**), and **F-73-M** accepted-and-recorded as
a deliberate reduction in CLI-level depth for a milestone-20 clause.

Lessons: [RETROSPECTIVE.md](RETROSPECTIVE.md) — seven, ingested to memory (756 records reindexed).

## Notes

**The defect this captures, in the operator's words (2026-08-16):** *"when it starts a story it
doesn't mark it as in-progress straight away. Why not?"*

**Why not.** Nothing in the codebase could write a status FORWARD. The only programmatic
item-frontmatter writer was `rollbackItemStatus` (20/ADR-005), bounded to
`in-progress → not-started|blocked`; `aof migrate` inferred a status at import; and the board is
pinned by `acd-board-write-isolation` to never write status at all. Every other transition was PROSE
in the command bundles — `src/bundle/commands/continue.md`'s `<progress_tracking>` block said "set
`STORY.md` frontmatter `status`: `in-progress` when build starts", filed AFTER the `<process>` steps
and phrased declaratively. An agent executed the process, then reconciled the record on the way out,
or not at all.

**Two consequences, both measured at HEAD.**
1. An item read `not-started` for the whole time it was being built. The board, the fleet and
   `aof work next` all consume that field. Under mesh the board *overlaid* `in-progress` for display
   while a worker ran (`src/board-mesh-execution.mjs:41`), which masked the missing on-disk write in
   the surface where it was most likely to be noticed.
2. The failure rollback was a permanent no-op. `rollbackStatusIfFailed` (`src/effects/table.mjs`)
   treats `rollback-not-applicable` — *item not in-progress* — as the sanctioned no-op, and nothing
   ever put an item in-progress. So `work:run-complete --outcome failed` "kept the stream honest" by
   finding `not-started`, skipping, and reporting success. `aof work run-start` had a
   write-BACK-on-failure with no write-FORWARD-on-start to pair with.

**Where the fix had to go.** At the seam, not in the prompt — prompt wording had already drifted once
and would drift again. Three doors now write it, and no caller has to remember:
- **A minted run** (`run.started`'s `advance-status` reactor) covers every machine-driven start:
  `work:run-start`, `work:resume`, `work:run-retry` and both worker mints, because none can mint
  without the transition seam. The d5 reconciler already re-derives `run.started` for a `running`
  record whose event a crash ate, so status drift self-heals through machinery that already existed.
- **The local phase door** (`work:continue` / `work:refine`) — the one-door-per-act command every
  face routes through (board button, fleet, CLI). LOCAL only, deliberately: a control-side write on
  a remote act would mint a second authority for an item another node owns (ADR-010/R6.4), and the
  worker's own mint already moves it.

  **What the remote path actually fixes is the PROJECTION, not a committed line** — corrected here
  after the architect measured it, because the first telling of this was wrong. The worker mints
  against the item resolved in its **PRIMARY** checkout, deliberately
  (`src/mesh-worker-execution.mjs:1551-1559`: the run record is keyed by `item.dir` and "must survive
  the worktree's own cleanup"), NOT against the worktree the assignment's commits travel in. So
  `advance-status` writes an uncommitted `status:` line in the worker's primary tree, and what reaches
  the operator is the launcher's `publishGlobalWorkSnapshot` tick
  (`src/mesh-launcher.mjs:823`) into the mesh projection. That is the same projection whose blanket
  `in-progress` overlay (`src/board-mesh-execution.mjs:41`) masked the original defect — the
  difference now being that the projection is derived from a record doc that genuinely says
  `in-progress`, rather than from an overlay papering over one that said `not-started`.
- **`aof work status <ref> [<status>]`** — the explicit door for the judgement moves (built,
  accepted, blocked), which a run cannot infer.

**Why a run completing `done` does NOT advance the item.** A run carries no phase — the same run
vocabulary serves refine, build and verify — so advancing to `in-review` on a completed run would
mark a refined-but-unbuilt story accept-ready. Everything past `in-progress` is a judgement.

**Why `in-progress → done` is legal.** The first cut of the table required `in-review` before `done`,
which reads well for a story and refuses acceptance for every other driver type: a milestone is
accepted when all its stories are, a `uat` session on its sign-off, a `spike` on its recorded
finding, a `chore` on its ticked checklist — none is ever authored `in-review`. A lifecycle that
describes one type is a lifecycle that gets worked around. What the table still refuses is the guard
worth having: `done` is unreachable from `not-started` and from `blocked`.

**Why a fifth transition seam.** `item-status.changed` is raised by
`src/effects/item-transitions.mjs`, NOT by `doc-transitions.mjs`. That module owns the record doc's
BODY (the STATE.md feedback bullet) and `acd-board-write-isolation` pins it to writing no
SPEC/STORY/SESSION and carrying no literal status value — because the board may append feedback and
may never write status. That line is worth keeping, so the frontmatter store got its own door rather
than blunting the guard on the body's.

**Where the table lives, and why not beside its writer.** `ITEM_STATUS_EDGES` is in
`src/acceptance-horizon.mjs`, not `src/work.mjs`: the table's keys ARE the frozen five status words,
so declaring it anywhere else is a second spelling of the vocabulary — exactly what ADR-009/F closed
when `src/import/recovery.mjs` spelled the five words as literals, and what
`acd-acceptance-horizon-single-predicate` enforces. `work.mjs` stays the item-frontmatter authority
and imports its permission.

**Deliberately NOT wired: `aof work dispatch <ref>`.** Cutting a lane is a real "work starts now"
fact, but the lane's own worktree is where that story's commits live. A status write in the main
checkout at dispatch time would put one frontmatter line in two trees and hand the lane's branch a
conflict over it. The dispatched agent runs `aof work status` inside its worktree instead (bundle
step 2), which is the tree that carries the change.

**Out of scope, recorded as a deferral.** A `work doctor` drift check ("a `running` run whose item is
not `in-progress`") was considered and dropped: the doctor's check groups are pure over a snapshot
that carries no run records, and the reconciler's `run.started` re-derivation already repairs the
drift this would only report.

**Pre-existing red, not this change's** (verified against HEAD): `work:loops-show`, `work:loops-graph`,
`work:loops-validate`, `work:init-config` and `work:resume` are registered in `command-core` but
missing from `test/command-core-contract.test.mjs`'s known-id list and from
`acd-work-command-route-coverage`'s `BOARD_DEFERRED` carve-out — four lanes red at `9e0f910` / chore
51 / the 348 auto-resume work. Left alone rather than widening another item's guard list, and carried
as a stream finding.
