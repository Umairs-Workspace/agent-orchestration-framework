---
doc: state
---
# 164 · Every project change reaches the global store — State

## Progress

- [ ] `00_story_a-local-change-is-noticed-and-owed`: refined (3 tasks); critical path
- [ ] `01_story_the-desktop-app-syncs-every-workspace`: refined (2 executable tasks, plus 1 `@manual` live check); after 00
- [ ] `02_story_my-own-items-read-from-my-files`: refined (1 task); after 00
- [ ] `03_story_owed-sync-never-gives-up-and-shows-its-lag`: refined (2 tasks); after 00 and 02

Waves: 00, then 01 ∥ 02, then 03.

## Notes & decisions in flight

Framing findings (2026-10-19, read from the code):
- `aof work find` always reads the local tree, then lays every cached row's `status`/`title` over
  it with no freshness check (packages/work/src/read.mjs:180-236). It never contacts the daemon.
- A publish happens only when a verb raises an event (publish-on-mutate), and a failed one is
  retried by later CLI commands, at most 5 times.
- The daemon tick publishes only its own cwd, and the desktop app gives it none, so no daemon
  pass re-scans projects. Edits that raise no event never reach the store.

Operator rulings:
- 2026-10-19, framing: local files win on reads and on writes for a project's own items, and
  another machine's owned work is answered from the store. Extend the existing journal; no
  sibling ledger.
- 2026-10-19, refine (164/00 Q1): a hand edit to an item a remote lane holds is held, then lands
  once the lane finishes, replacing the lane's report.
- 2026-10-19, refine (164/03 Q1): the sync state is shown in `aof work doctor`.

Refine decisions:
- **Open question from framing, answered (ADR-001).** Nothing in m43 writes a stored doc back to
  disk. Worker content lives in `work_item_docs`, cache-only items' write doors refuse
  (`item-not-local`), and work reaches a disk only by git. m43 made the cache WIN on reads for
  worker-authored items (43/ADR-005). 164/ADR-005 narrows that to rows another node reported for
  records not changed here, and does not edit it.
- **ADR-007 amended in a contract, not re-opened.** Q1 on 03 put the surface in doctor, so 03
  shares `doctor/index.mjs` and `commands/doctor.mjs` with 02 and depends on `[00, 02]`. Recorded
  in 03's contract per the amendment rule.
- **Documented defaults** (technical, in the maps): the fingerprint covers row fields only; marks
  use the journal's collapse key; backoff is base 15s, cap 15 min; the tick covers
  `resolveAggregationWorkspaces`; skips go to the launcher warning sink.
- Graph: built 2026-10-19T09:56:03Z, code-only, egress none, with a 400s timeout. The default
  120s timed out on 2771 files.
- Recalls: PO `126bf22c-c5a3-4f7b-88d8-27f99fd3e36c` (empty). Architect
  `16ade46a-85b5-4d85-b705-3ff406c7009c`: 34/ADR-003 and 05/ADR-001 honoured, the rest
  irrelevant (ARCHITECTURE header).

Build decisions (164/00, 2026-10-19, solo):
- **`localChangeRefs` is computed inside `publishWorkspaceSnapshot`, not `publishItemProjection`**
  (PLAN said the reactor). The snapshot is the one disk-derived publish every path reaches (a
  verb's event, a mark, a daemon tick), and it already holds the rows and the store, so the
  reactor would have read the rows twice. A verb and a mark still land a change identically.
- **The pass reports a change only the lock holds; it does not mark it.** A mark drained under
  the lock would settle `done` with the change still owed, and its `(workspace, digest)` id would
  then swallow the post-release re-mark. A same-state event that settled while its change is still
  owed (the lock taken between mark and drain) is re-marked under a suffixed id.
- **The stat digest is recorded only when nothing is owed**, so a held change keeps the row pass
  running until it lands (E8). A deleted record is a change too: the publish forgets observations
  of refs a complete claim no longer carries.
- `projection-store.mjs` sits under its 1,280-line ratchet (43/ADR-012/B4) by condensing
  history-only header comments, keeping ADR-002's "the store module is the single writer".

## Feedback (for retro)

- 164/00 declared read set was incomplete: the build needed `packages/core/src/application/assemble.mjs`
  (the publisher binding takes the effects services; the face takes the publisher provider) and
  `test/arch/command/acd-effects-ledger.test.mjs` (its append-only-in-transition-seams scan read only
  core and effects, so the mesh/work/execution seams it lists were never checked; widened to every
  package and the sync pass named as the seventh raiser).
- 164/00 risk (for review): a SECOND checkout of a mesh-published repo (a sibling worktree, same
  `workspaceId`) now publishes its own state on every command, not only on verbs, and shares this
  node's baseline, so two checkouts alternate rows. Publish-on-mutate already had this shape;
  the pass makes it frequent. Workspace identity is TECH_DEBT item 4.

Review close, 164/00 (solo, one round, 0 Blockers). Routings:
- **story (operator)** — a second checkout of a mesh-published repo must not publish over the
  primary checkout's rows (shape: the pass runs only where `projectRoot` is the workspace's
  registered root, else reports `mesh-workspace-secondary-checkout`; needs new criteria + an ADR
  note on 164/ADR-004 driver 3).
- **recorded** — `projection-store.mjs` is at 1,278 of its 1,280-line ratchet after this story
  (made room by condensing history comments); stories 02/03 must put new blocks in their own module.
- **recorded** — the CLI pass costs one stat walk per command: measured ~240 ms over this repo's
  ~3,200 record files (concurrent stats; ~540 ms serial), plus one row pass when the digest moved.
- **recorded** — a ref an assignment holds that this node has never observed is reported `held`
  on every pass until the lock releases (it is owed a first observation, not a change). Harmless,
  but noisy in the pass's result.
- **fixed** — the effects-ledger control's append scan read only core and effects; widened to
  every package (the mesh/work/execution seams it lists are now actually checked).
- 43/02 tasks 04 and 07 tests re-ordered, not their `.feature`s: a control record changed after
  it was observed is now a local change (164/ADR-001, E2), so each test's stale control scaffold is
  written before the control's first observation — the case 43 protects (an UNCHANGED scaffold).

Build + review close, 164/01 (solo, one round, 0 Blockers):
- Build: `capturePropagation` runs `syncTickWorkspaces` (the one pass, through the publisher
  seam) over `resolveTickWorkspaces`, now the ONE set presence and sync both read. The launch cwd
  is skipped quietly only when it is not a workspace at all (`mesh-workspace-unconfigured`); every
  other skip warns per tick, and a failed registry read warns `global-work-propagation-failed`.
  The pass takes the tick's shared opener as `ctx.openStore` (the launcher may not spell the
  store opener, acd-global-publisher-single-seam).
- Declared files were incomplete: also touched `test/arch/store/acd-global-publisher-single-seam`
  and `acd-global-propagation-single-predicate` (both pinned the launcher to receive
  `publishGlobalWorkSnapshot`), `test/arch/testing/acd-source-directory-budget` (two rows), and
  `test/mesh/assignment/mesh-assignment-record` (164/00's schema 11, caught by the wider mesh run).
- **recorded** — each tick now pays one stat walk per registered workspace (~240 ms for this
  repository's ~3,200 record files); the tick cost grows with the registered set.
- **recorded** — a registered workspace that does not propagate warns on every tick, as R2
  specifies; on the live daemon that is one stderr line per tick per such workspace.
- Task 02 (`@manual`, the live restart) is `aof:verify`'s, not this build's.

Build + review close, 164/02 (solo, one round, 0 Blockers):
- Build: `cacheAnswers` and `reportedElsewhere` live in `local-change.mjs`, beside ONE
  `projectedRow` builder that the store's own-disk read now calls too (so the read side
  fingerprints exactly the row the publisher observed — no second spelling of the row shape).
  `readCachedItemRows`/`readCachedWorkFacts` return `selfNodeId` + `observations` from the same
  open (the store's `readWorkspaceObservations`). The local record is read only for a ref another
  node reported AND this node has a baseline for.
- **Self id is the publisher's, not `meshNodeIdOf`** (PLAN said the latter): rows are stamped
  with `deriveNodeId` (the pin, else the opaque `node-<hash>`), and `meshNodeIdOf` is the pin only,
  so an unpinned node would have read its own rows as "elsewhere". Doctor's `selfNode` now takes
  the cache's resolved id first, so its coherence group and the overlay judge one identity.
- **`cache-status-divergence` is retired for own rows** — with the overlay narrowed, a row this
  node reported never reaches the coherence group as cache-sourced (E6). The lag it used to
  report is 164/03's `sync-behind` to surface. **fixed at 164/03's close**: the now-unreachable
  own-row branch was removed from `doctor/coherence.mjs`, with a comment naming its successor.
- 43 tests re-pointed (never their `.feature`s): cache-read-seam ×3 (a both-sides row is now
  another node's; this node's own `01`/`12` answer from disk) and cache-read-doctor-overlay ×2 (the
  own-row divergence case renamed to the narrowed rule; the echo-chamber case's control-side
  non-vacuity now observes a worker row's overlay via `cache-incomplete`).
- Declared files were incomplete: also touched `packages/mesh/src/projection-store.mjs` (the
  shared builder and `readWorkspaceObservations`), the core store binding,
  `test/arch/session/acd-session-driver-mesh-blind` (closure census 163 -> 164 for the leaf) and
  the directory-budget rows.

Build + review close, 164/03 (solo, one round, 0 Blockers):
- Retry: `retry: "until-done"` is validated by the registry (anything else refused at assembly)
  and declared on every `publish-projection`. The dispatcher adds the journal's new
  `failedStepsPastCeiling` read for those reactors only, and a failed until-done step waits
  `min(15s * 2^attempts, 15 min)` from its last attempt; every other reactor keeps the ceiling.
- **The backoff changed two delivered timings**, in their tests only: 164/00 E5 and 34's
  `global-work-propagation/03` retried a failed publish on the very next pass/tick; both now age
  the failed step first (their contracts state no interval). Launcher E6 is unaffected — it fails
  before marking.
- Surface: doctor's command edge reads the unsettled `publish-projection` steps and the cache
  read's `syncState` (the store's new `readSyncState`, newest `observed_at` per workspace), only
  where this workspace propagates (the shared predicate, now injected into doctor). The pure lane
  `doctor/sync.mjs` raises `sync-failing`/`sync-behind` (warn) and renders one `sync:` line per
  workspace; `--json` gains a `sync` array only where it applies, so a non-mesh envelope is
  byte-identical.
- Declared files were incomplete: also touched `packages/core/src/application/bindings/effects/journal.mjs`
  and `effects/dispatch.mjs` (the new read's wiring), `assemble.mjs` (doctor receives the
  publisher services), the core store binding, and `test/store/global-work-propagation`.
- **Explicit retries skip the backoff** (found by `acd-publish-on-mutate-ledgered`): the lane
  cleanup's `settleLaneProjectionEffects` and `doctor --converge`'s first pass are the operator
  retrying now, so `drainEffects({ backoff: false })` pays a recovered store immediately; only
  automatic passes wait. Touched `packages/work-loop/src/commands/dispatch.mjs` (undeclared).
- Gate fixes from the wider run: the lane reads no clock (FF-1503), no silent catch at doctor's
  edge, line-first comment strippers in the five new controls (item 24), the lane roster names
  `./sync.mjs` (FF-5905), the doctor-dir pins 12 -> 13, and `work find`'s module ceiling 709 -> 710.
- **Found live on the control node, fixed**: doctor counted two archived imported milestones (42,
  142) as changed-since-synced forever — the store projects an imported milestone's `AOF.md`
  (`records.mjs` recordDoc) and doctor's snapshot picks `SPEC.md` by type, so the two fingerprinted
  different rows. Doctor now judges the row over the store's record doc; pinned by a regression case.

Live-system impact (2026-10-19, for the operator and for verify):
- The bare `aof` on PATH is npm-linked to this working tree, so the build's own commands ran 164's
  code against the REAL `~/.aof`: the projection store is now schema 11 and the journal schema 2
  (forward-only). The installed payload `458a319d` refuses both ("Effects journal schema 2 is newer
  than this AOF build supports (1)"; the work cache reads degrade to disk), which includes the
  desktop app's daemons. Remedy: install this build's payload and restart the desktop app — the
  operator's call, not taken by the build.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-16401…16405 land with their stories)
- [ ] `@manual` signed off: 164/01 task 02, live desktop restart (operator)
