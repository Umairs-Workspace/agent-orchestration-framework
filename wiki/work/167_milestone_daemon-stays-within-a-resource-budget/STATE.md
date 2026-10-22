---
doc: state
---
# 167 · The daemon stays within a resource budget — State

## Progress

- [x] Captured 2026-10-20 in the backlog; promoted to 167 the same day.
- [x] Refined 2026-10-20 (`--autonomous`, solo): ARCHITECTURE (ADR-001…007, FF-16701…16704,
  one diagram), six stories, an example map and a build plan for each.
- [ ] Contracts for 00, 02, 03 and 05 wait on their business questions (asked at the refine's
  end review).

## Notes & decisions

- The motivating evidence lives in `~/.aof/mesh/logs/degrade.log` and `mesh-serve.log` on the
  control node (2026-10-19/20), measured from logs, not a profiler. Refine turned its three faults
  into the soak test's planted faults (04).
- **Re-measured at refine (2026-10-20 ~18:16 UTC, read-only):** `mesh serve` at 128% of one core
  over 20 s (30,932 CPU-s since start), and `mesh ui` at 0%. `work-read-cache-unavailable` was
  still firing at the sink's 5 s throttle. 66 registrations for this node, 58 of them with a work
  dir gone (57 dispatch-worktree roots). The journal had no failing `publish-projection` step
  (16,196 `done`), yet the cache still answered "no rows" for an unnamed workspace. Story 00's
  workspace label on every degrade line is what will name it.
- **After the restart onto `74a3a714+dirty` (2026-10-20 09:09 UTC), with F-06's fix:** the
  `event-id-conflict` stopped, but `mesh serve` still measured 62% of one core over a 30 s sample.
  It logged 348 `workdir-missing` and 406 `workspace-workdir-unresolvable` lines in its first 6
  minutes, and `work-read-cache-unavailable` kept firing (9 times). So F-06 was one amplifier, not
  the cause.
- **Default decisions taken at refine** (technical, each recorded in its story's map):
  the client header `X-AOF-Client` (00 Q2); a snapshot is stale after 45 s (00 Q3); the read memo
  holds one entry per work dir (01 Q1) and is bypassed when no digest can be taken (01 Q2); the
  `ETag` is a body hash (02 Q2); the clock ticks and the launcher's outcome wait are exempt from
  the cadence helper (02 Q3); the permanent-code set and the 1 h backoff cap (03 Q2, Q3); the soak
  phases (04 Q1) and its CPU-seconds measure (04 Q2); an unknown daemon state judges against the
  viewer-open budget (05 Q3); an exit notice outranks an overrun (05 Q4).
- **Open, not in scope:** the desktop supervisor itself spawns `aof mesh status --json` every 3 s
  (`apps/desktop/crates/core/src/poll.rs`). Each spawn is a fresh Node start, outside both
  daemons, so neither the meter nor the guard sees it. It is unmeasured here. If it is material,
  it is a follow-up item, not a story in this milestone.
- Story-boundary grounding: `aof graph build .` at 2026-10-20T18:20:21Z (19,727 nodes, egress
  none), with `aof graph impact` over each story's subject files. The launcher's collaborators
  arrive through `packages/core/src/application/bindings/mesh/launcher.mjs`, and `degrade.mjs` is a
  zero-import leaf with 76 importers. That is why the meter sits beside it in `@aof/foundation`.
- **167/06 build (2026-10-21, solo, run `20261021T200825695Z-0001`).** `publish-run` rides
  `run.started` and `run.completed` beside `publish-projection`; the tick reads this node's running
  rows through the presence seam's `readStoreActivity` in one query over its shared handle. The
  store module sat exactly at its 1,280-line ratchet (43/ADR-012 B4), so the board-face content
  reads moved to `packages/mesh/src/content-reads.mjs`, called from the store; the writers stayed.
  **Soak after the change (container, 2026-10-21):** `serve` idle at 6% of a core (1.78 CPU-s over
  30 s), down from the 12–14% that motivated this story, top cause by count `cache-hit` for the soak
  workspace; `ui` under budget; E2, E4–E7 green. E1 still fails the 2% idle budget. The runs walk is
  gone by construction (FF-16705), and the measured halving is consistent with that; the former
  walk was never a counted cause, so the cause label cannot say what the remaining 6% is. The
  candidates are the tick's own per-doc work over 1,800 items — the cache-first item enumeration
  and the sync pass's stat digest, which 06's PLAN named out of scope ("re-measure once this
  lands"). A profile has not been taken.
- **F-04 profiled (2026-10-22, container, `scripts/test-docker.mjs`, idle-only soak, 1,800 docs).**
  A `--cpu-prof` of serve has the main thread idle 103.7 s of 109.8 s sampled. The non-idle frames
  are `readdir`/`stat`/`readdirRecursive` under `statWorkTree` (`discovery.mjs`), so the burn is
  the stat walk's libuv threadpool work. A preload counter over a 60 s idle phase (serve at
  4.38 CPU-s, 7% of a core) counted **16 recursive walks in 77 s, ≈3 per 15 s tick**. Each was
  ≈1,800 stats, from three sites: the backoff check (`workTreeMovedSince`), the publisher's stat
  gate, and the presence read's memo digest. **One walk of aof's own `wiki/work` (3,338 files) costs
  ≈0.4–0.5 CPU-s in the container**, against ≈1.1 CPU-s on the Windows host. The idle budget is
  0.3 CPU-s per tick, so even ONE walk per tick of an aof-sized tree spends it: collapsing three
  walks to one cannot pass E1. An idle tick has to walk nothing.

## Feedback (for retro)

- **167/00 build (2026-10-20, solo, run `20261020T195734982Z-0000`).** Built to green; review
  closed with no Blocker. What the close routed (every finding is `recorded`; none created an item):
  - *E1's "serve counters" is the `ui` process in production.* `mesh ui` hosts the board server,
    so a board's `/api/work/list` poll is counted in the `ui` snapshot, not `serve`'s. `serve`
    counts its own `full-disk-read` from the tick's presence reads. 04's red probe ("names `serve`
    and `full-disk-read`") and 05's guard should expect a board-poll storm under `ui`.
  - *E1 runs over a one-milestone tree, not 1,800 docs.* The count is per read, not per doc, so
    the smaller tree proves the same rule in a fraction of the time.
  - *An unknown cause in production is dropped and listed on the snapshot's `refused`, without a
    degrade line.* PLAN.md said "one degrade", but the meter cannot import the reporter that
    imports it. A strict meter (the default for `createCostMeter`) still throws.
  - *The declared write set was incomplete.* The build also had to touch these files:
    `packages/foundation/{package.json,README.md}`, `packages/mesh/src/commands/serve.mjs` (it
    now awaits the last snapshot), core's `assemble.mjs` and `bindings/{work/read,board-ui}.mjs`,
    and `scripts/workspace-runtime-audit.json` (doctor.mjs's sourceDigest re-stamped, as 161
    F-05 did). It also touched the controls the meter trips: the module ceilings
    (`--version` 16→17, `work find` 715→717), FF-5301's reach ceilings, FF-5307's two re-pins,
    FF-5905's lane roster, the silent-catch ratchet (no new site), yarn-installation's port
    lists and the two exact-key `mesh status` tests (`cost` is appended after
    `isControlNode`). Two tests that pinned a later item's count now read it off its one home:
    134-04 reads the doctor row's ceiling, and FF-16008 reads FF-16004's row.
  - *167/04's PLAN.md restated its own test path* (FF-9603 red across the stream). Fixed at
    this close by naming "the story's declared test file".
  - The near-miss recall's m165/R4 was honoured: the daemons were sampled during the whole-tree
    run (`mesh serve` at ~65% of a core). Its 14 red units were all controls this diff trips,
    and each passed when re-run on its own after the fix.
- **167/01 build (2026-10-20, solo, run `20261020T211415528Z-0000`).** Built to green; review
  closed with no Blocker. Routed at the close (all `recorded`, nothing created):
  - *The memo keys on the tree's directory shape as well as the stat digest.* The digest sees only
    `.md`/`.feature` files, so a folder made or renamed with no record doc in it would have been
    served stale items. The stat gate's digest itself is byte-identical (164/ADR-002). There is
    an extra case for it beside E3.
  - *`readItemMeta` gained a `view.frontmatter` hook* (`packages/work/src/records.mjs`, outside
    `files:`). Without it no view could stop a reader re-opening every doc.
  - *The projection store's `listItems`/`parseFrontmatter` ports became one `readStreamSnapshot`
    port.* `readWorkspaceProjectionItems` was their only user. The core binding, the mesh test
    services and 43/06's worker-side boundary pin follow it (the pin now names the snapshot,
    which is still this node's own disk).
  - *00's E1 polls now each follow an edit.* With the memo, 40 polls of an unchanged tree are
    one disk read and 39 memo answers. E1's point, counting through the throttle, is proven
    over 40 real reads.
  - *A cost writer stopped before its first tick writes nothing* (00's "once more at a clean
    stop"). A stop write that raced a removed test home broke three presence suites.
- **167/02 build (2026-10-20, solo, run `20261020T212904239Z-0000`).** Built to green; review
  closed with no Blocker. Routed at the close (all `recorded`, nothing created):
  - *R2/R3 (pause, show, back-off, snap-back, assign pin) are proven on the scheduler, driven by
    an injected clock and visibility at the surfaces' own base cadences, not on mounted
    surfaces.* FF-16703 holds the wiring by source: every poll is built from the cadence, and
    each surface's user action (the detail panel, the Runs tab, scope and assign, the home
    page's actions) is wired. A mounted case needs a visibility seam in the UI harness. That is
    worth a story if the wiring ever regresses unseen.
  - *Home pokes its poll from capture-phase click/change handlers on its root*, not from a prop
    into `SessionGrid` (outside `files:`). It is real in a browser and checked by source; no
    mounted case exists.
  - *The fleet's tag ignores `diagnostics.generatedAt`*, which no view renders and which moves on
    every read, so it would have defeated every `304`. *The tag is two FNV-1a lanes plus the
    length, not a cryptographic hash.* It lives in `static-serve.mjs`, the leaf both faces
    import, because the board's transport may import only presentation helpers.
  - *While a Resync watches, every board poll pins at the base* (m21/R2, recalled late, this
    session): the probe slowing beside a pinned watch poll gave the board two cadences.
  - *Past items' exact pins that moved, each with its reason:* FF-5307's ui hash and board-ui
    digest, FF-12603's re-pin windows, 131/04's static-serve export list, 38's F22 detector,
    DetailPanel's line count (904 → 913), the `apps/ui/src/lib` budget (1 → 3), and the
    cadence measurers in board-resync, board-freshness-ramp, fleet-assign DG-14 and home-states.
    `Fleet.tsx` holds its 1,560-line cap by compressing 02's own lines; it is AT the cap with
    zero headroom.
  - *The near-miss recall for 02 was run after the build, not before*, and is recorded as taken.
- **Gate (span 00–02):** the whole tree via `yarn test:sharded` (13,249 cases, 0 red units, 0
  load flakes, 12.9 min) after three rounds. Round 1 had 14 reds and round 2 had 5, every one a
  control this milestone's diffs trip.

- **167/03 build + review (2026-10-21, solo, attempt 1):** built, gate clean, reviewed inline;
  no Blockers.
  - *Declared sets were incomplete.* Outside `files:`: the launcher and registry core bindings
    and `assemble.mjs` (wiring `forgetNodeWorkspace`), FF-16405's arch test (claims 2 and 3
    described the two-resolve tick; now they pin one resolve in `capturePropagation`), and the
    kernels allowlist in `test/bundle/yarn-installation.test.mjs` (the launcher's
    `@aof/work/discovery` import, the publisher's precedent). m35/R2 was recalled and still bit.
  - *Two defects outside the story, fixed at the close.* 167/00's snapshot writer sampled before
    snapshotting, so the first window's base was "now" whenever the clock moved a millisecond
    between them: an empty `topCauses`, red one run in two on 00's own launcher case. The writer
    now snapshots first (`cost-meter.mjs`). And a launcher clock injected as a function was bound
    into the publisher's SQL as `published_at`; the launcher now hands the publisher a string.
  - *The story-scoped impacted run is not taken on this machine.* It widened to all 1,210 suites
    (`launcher.mjs`: no registered dependent) and, with an importer sweep after it beside a
    daemon already burning a core, made the operator's machine unusable. Evidence is the story's
    own suites plus the three reds that run raised, re-run alone: one real (the kernels
    allowlist), two contention flakes (FF-16001, cli/rewire validate). The whole tree is the
    milestone gate's.
  - *Recorded findings (Nits):* the unresolvable-skip line claims "said once" for a code outside
    the permanent set (unreachable: every registry skip carries a permanent reason); and a held
    workspace that moved and fails again stat-walks its tree twice on that tick.
- **167/05 build + review (2026-10-21, solo, attempt 1):** built, gate clean, reviewed inline;
  no Blockers. Evidence: `cargo test` over the core crate (132 green, every guard scenario a
  test there, task 01's over an injected sampler and clock), `cargo check --offline` on the app
  crate (clean, no warnings), the supply-chain audit (0 warnings), and the desktop and budget
  arch controls (32 green, FF-16704 new).
  - *The share is judged over the budget's own window, and a regime starts at that window's
    base.* That one rule answers all three edges without a second clock: 60% from t0 enters at
    exactly 5:00 and not at 4:57, a 40 s spike at 90% never accrues 5 minutes, and a minute at
    1% leaves overrun exactly when the window has slid past the load.
  - *Declared sets were incomplete.* `files:` named `apps/desktop/Cargo.lock`, but the app crate
    is outside the workspace and keeps its own `crates/app/Cargo.lock` (one dependency-list line,
    no new package). `main.rs` (the tray input and the module line) is outside `files:`.
    `icon_state` gained its overrun input as a fourth argument, so every caller and test moved
    with it (m20/R1, recalled).
  - *Fixed at the close:* the footer shows any notice even in the error state, so an overrun
    would have stood over the error footer that DESIGN says it never does. `notice()` now drops
    the overrun while the render state is `error`; an exit notice is unchanged.
  - *Design conformance:* INCONCLUSIVE. DESIGN's surface declares no `Route` (the desktop window
    is rendered from an IPC fixture), so no render was attempted and no designer was asked. The
    binding checklist's text, states and precedence are pinned by the core tests instead.
  - *The live check is the operator's:* PLAN's verification step (a debug build's sampler on a
    busy child for over 5 minutes) needs the desktop app rebuilt (`install-local --desktop`) and
    restarted. Not done here.
- **167/04 build (2026-10-21, solo, attempt 1): STOPPED — the soak is right and the daemon is
  over budget.** The harness, the suite and its registration are built; 6 of 8 cases are green
  (E3–E7 and the plan case). E1 and E2 are red on `mesh serve`: **12–14% of one core while idle,
  against the 2% idle budget**, over the 1,800-doc tree, three runs alike.
  - *The cause, measured rather than estimated (m160/12 R2):* ONE `workTreeStatDigest` over aof's
    own `wiki/work` (3,338 files) costs **≈1.1 CPU-seconds** on this Windows machine (≈0.3 s user,
    ≈0.8 s kernel; every file is a `stat`). ADR-003 assumed ≈240 ms — that was WALL time with the
    stats concurrent, not CPU. At the 15 s propagation tick, one walk of aof's tree is already ≈7%
    of a core, and serve walks twice a tick (the presence read's memo digest, then the sync gate
    or the backoff check). The V8 profile showed the main thread mostly idle: the cost is libuv's
    threadpool doing `stat`, which the main-thread profiler does not sample.
  - *CORRECTED the same day — the stat walk is not the main burner.* The soak run in a Linux
    container (`scripts/test-docker.mjs`, where a stat walk is cheap) measured serve at the same
    12% idle, and a `--cpu-prof` there named the cause: the presence tick's `readActiveRuns` AND
    `readActiveLoops` (`packages/mesh/src/presence.mjs`) each call `readRuns` for EVERY item of
    every workspace, archived ones included — two `readdir`s of a `runs/` folder that almost never
    exists, ≈3,600 `ENOENT`s (and their error objects) per 15 s tick over 1,800 docs. On Windows
    the stat walk's ≈1.1 CPU-s per aof-sized walk is real too and adds to it, so both are owed:
    read each item's runs once per tick, and only for items that can hold a running run; then
    re-measure the walk on the host.
  - *Fixed on the way (launcher, 03's file):* the presence tick's cache read was handed a bare
    `{ workDir, workspaceId }` with no config, so it looked rows up — and counted its cost — under
    a PATH-DERIVED id, never the registered one. A workspace with a pinned id (aof's own) never got
    a cache answer in the presence tick. It is now handed the registry's root and id (E4 green).
  - *Added on the way (00's meter):* the snapshot and the status `cost` block carry a bounded
    `faults` list (every `sync-failure` and `degrade` counter since start, top 20). Without it E4
    could not hold: a fault said once counts 1 and never reaches the top-3 causes.
  - *Contract findings on 04's features:* E2's "both daemons' snapshots state viewer-open" — by
    ADR-002 only `mesh ui` serves fleet and board routes, so `mesh serve` stays `idle` (held to the
    stricter budget); the suite asserts `ui` only. E2's board poll — the fleet's drill-in refuses a
    workspace the projection does not hold (`workspace-not-found`), and the planted empty cache is
    exactly that; the suite accepts that refusal by name. E5's "degrade log" — the launcher's lines
    land in `mesh/logs/mesh-serve.log`, which is what the suite reads.
  - *Declared sets:* registration went through `scripts/test.mjs` (the registry names
    directories) rather than `test/mesh/index.mjs`; the `test/mesh/budget` budget row is new.
- **167/06 build (2026-10-21, solo, run `20261021T200825695Z-0001`).** Built to green (E1–E9 and
  the completed-run tick); review closed with no Blocker. What the close routed:
  - *Contract finding on E4 (amendment candidate, PO at verify).* The scenario pairs "the store
    cannot be opened" with the `run-start` VERB. m43/ADR-003 R1.4 makes the item-lock guard fail
    CLOSED when the store cannot be opened in a mesh-enabled workspace, so that verb refuses the
    mint rather than minting past a lock it cannot evaluate. The suite proves the property the
    scenario names (the run starts, the publish step is owed, the row lands on `doctor --converge`)
    at the transition seam the verb wraps, with the drain withheld as a crash would leave it. The
    delivered `.feature` is untouched; the rule belongs in the accepting item's contract.
  - *Recorded: a failed `publish-run` step threads no verb warning.* `threadPropagationWarnings`
    threads `publish-projection` outcomes only. On the one realistic failure (the store will not
    open) the sibling `publish-projection` step fails the same way and IS warned, and the owed step
    is visible through `doctor`'s unsettled steps (164/ADR-006). Not fixed here: it would widen the
    publisher's warning surface and its suites for a case already said twice.
  - *Recorded: `aof mesh heartbeat` still reads activeRuns and loops off the run files* (the PLAN's
    "only the tick stops calling them"). The verb and the tick can therefore disagree for a
    workspace that does not propagate: the verb lists its runs, the tick does not.
  - *Recorded (behaviour change, by ADR-008): a tick whose store cannot be opened knows of no own
    runs.* Two aggregate-suite cases asserted the launch cwd's disk run still surfaced; they now
    assert the tick completes and publishes with `activeRuns: []`.
  - *Story (operator): the idle budget after the walk is gone.* The soak still fails E1 at 6%
    against 2% (Notes above). The remaining cost is the tick's per-doc work over 1,800 items — the
    cache-first enumeration and the stat digest — and needs its own criteria and a profile; it is
    not this story's runs walk.
  - *The declared `files:` set was incomplete.* The build also had to touch
    `packages/execution/src/runs.mjs` (export `readRun`, the one-record read a loop's last
    activity comes off), `packages/core/src/application/bindings/run-store.mjs`, the new
    `packages/mesh/src/content-reads.mjs` (the store's size ratchet), and four suites that seed
    run files on disk and read presence through the launcher: `test/arch/run/
    acd-active-runs-frozen-string-array.test.mjs`, `test/arch/loop/
    acd-loop-stop-reaches-every-face.test.mjs` (its sweep now counts `readStoreActivity(` as both
    reads), `test/arch/grade/acd-harness-ruling-ledgered.test.mjs` (the census learns
    `publish-run`) and `test/arch/session/acd-session-run-reconciliation.test.mjs`.
    `packages/mesh/test/mesh-presence-session-wire.suite.mjs` was declared and needed no change.
  - *FF-16705's table row named `publish-projection` as the writer; ADR-008's decision names
    `publish-run`.* The row now reads `publish-run` and drops "(pending)".
- **167/07 build + review (2026-10-22, solo, run `20261022T155344891Z-0001`).** Built to green;
  reviewed inline; no Blocker. The gate sits inside `statWorkTree`, so the three tick sites changed
  nothing. Evidence: the story's two suites (9 launcher cases and 10 discovery cases, all green),
  with a red probe on the gate itself (with its early return disabled, E1, E2, E3, E5, the log event
  and the 4:59 safety edge all go red). FF-16706 is green, with its red probe (a recursive `readdir`
  planted in `launcher.mjs`). In the container: the importer sweep (35 suites, 486 ok), the work,
  mesh and foundation package suites, and **167/04's soak, 8 of 8 green, E1 included for the first
  time**. A build measurement with the profiling script (not a suite claim): serve idle at 0.51
  CPU-s over 62 s (0.8% of a core), down from 4.38 CPU-s (7%), with 5 walks in 84 s, all of them
  warm-up.
  - *Declared set:* `test/bundle/yarn-installation.test.mjs` (the work kernel allowlist admits
    `node:fs` for `discovery.mjs`) was outside `files:`. 03/R1 again, for a pin on imports rather
    than on wiring.
  - *Not this story's, and red at the milestone gate:* the other session's 168 prototype work
    (untracked in this checkout) moves FF-5301's reach ceiling 165 → 166 and adds four
    `commands/prototype.mjs` violations to the yarn-installation kernel check. Measured: with
    07's one new import pointed at a module already in the graph, FF-5301 still reads 166.
  - *Fixed at the close:* ADR-009's assumptions now say that on Linux each watched folder costs an
    inotify watch, and that a tree past `fs.inotify.max_user_watches` falls back to the walk (R3).
  - *Recorded (Nits):* the launcher-level E1–E3 run over the suite's two-story fixture, not the
    Background's 1,800 docs. The rule counts walks, not docs, and the 1,800-doc tree is exercised by
    the discovery cases and 04's soak. E10 is proven at the seam (a process with no watch set),
    not through `aof work list`. The watch set's handle exposes `entries`/`now`/`safetyMs` for
    the gate's own use. `mesh ui`'s board polls still walk per poll, by ADR-009's decision.
- **167/04 build resumed + review (2026-10-22, solo, run `20261022T161547134Z-0001`).** The harness,
  suite and registration from the first attempt are unchanged. With 07 in, the soak is 8 of 8 green
  in the container (E1 and E2 were red). Gate ladder clean; reviewed inline; no Blocker.
  - *Recorded (Nit):* E7's case reads "the global home it was handed", where the feature says "the
    real global home". Under the runner's isolation the handed home is the only one the process can
    reach, so the property is the same: the soak's daemons write only to their own temp home.
  - *Recorded:* the soak has run green only in the Linux container this session. Its Windows host
    run is the milestone regression gate's, which runs the whole tree on this machine.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-16701…16704, with red probes)
- [ ] Soak test under budget on the control node
