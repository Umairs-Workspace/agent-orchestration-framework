---
doc: verification
---
# 167 · The daemon stays within a resource budget — Verification

## Verification evidence

### 167/06 · Local runs reach the store through the ledger — the story's own lanes

Run 2026-10-22 by `aof:verify 167/06` in the main checkout (uncommitted build tree), with an
isolated `AOF_GLOBAL_HOME`: `node scripts/test.mjs --only
test/mesh/presence/mesh-presence-reads-runs-from-the-store.test.mjs
test/arch/mesh/acd-presence-reads-runs-from-the-store.test.mjs`. Result: 14 cases, 0 failures
(exit 0, no `not ok` on either stream). Every `@executable` scenario maps to a named case: `167/06
E1`…`E9`, plus `167/06 · a completed run leaves the presence record on the next tick`. E4 is proven
at the transition seam, not through the verb (F-01).
`verifies → stories/06_story_local-runs-reach-the-store-through-the-ledger/tasks/00_a-run-reaches-the-store-through-the-ledger.feature`,
`verifies → stories/06_story_local-runs-reach-the-store-through-the-ledger/tasks/01_presence-reads-runs-from-the-store.feature`

The story is scoped: no importer sweep and no whole tree was run here, so the whole tree is left to
the milestone's regression gate. The container soak figure in STATE.md (serve idle at 6% of a core)
is the build's measurement and was not re-taken at verify (F-04).

### 167/00, 01, 02, 03, 05 · the stories' own lanes

Run 2026-10-22 by `aof:verify 167` in the main checkout (uncommitted build tree). Each run was in
the foreground with a fresh `AOF_GLOBAL_HOME`, and each was read by exit code and both streams. No
impacted scope and no whole tree was run. Registered files ran through `node scripts/test.mjs
--only`. The native `node:test` package files ran through `node --test`, the way
`scripts/test-workspace.mjs` runs them, and were read by their `# tests/# pass/# fail` counts.

- **00:** `--only` over `test/mesh/identity/mesh-identity-status-commands.test.mjs`,
  `test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs`,
  `test/mesh/ui/mesh-ui-serve.test.mjs` and `test/surfaces/board-api.test.mjs` gave 156 ok and no
  `not ok`. `node --test` over `packages/foundation/test/foundation.test.mjs` and
  `packages/work/test/doctor.test.mjs` gave 30 tests, 30 passing and 0 failing (exit 0). Every 00
  scenario is a passing `167/00` case: E1–E9, the refused cause, the snapshot outline (4 rows), "a
  snapshot carries what the readers need", the text report, "a warn never fails validate", and the
  budget-edge outline (4 rows).
  `verifies → stories/00_story_the-daemon-says-what-it-costs/tasks/00_each-daemon-counts-its-work.feature`,
  `verifies → stories/00_story_the-daemon-says-what-it-costs/tasks/01_status-and-doctor-say-what-it-costs.feature`
- **01:** `--only test/store/cache-read-boundary-holds.test.mjs` gave 13 ok and exit 0. `node --test`
  over `packages/mesh/test/projections.test.mjs` and `packages/work/test/discovery.test.mjs` gave
  27 tests, 27 passing and 0 failing. E1–E6, the bypass outline (2 rows), "two different trees",
  the digest outline (4 rows) and "the sync pass still skips an unchanged workspace" all pass.
  `verifies → stories/01_story_an-unchanged-tree-costs-a-stat-walk/tasks/00_an-unchanged-tree-is-read-once.feature`,
  `verifies → stories/01_story_an-unchanged-tree-costs-a-stat-walk/tasks/01_the-stat-digest-has-one-home.feature`
- **02:** `--only apps/ui/test/poll-cadence.suite.mjs test/arch/ui/acd-ui-polls-through-one-cadence.test.mjs`
  gave 11 ok and exit 0. The route cases (E1, E2, the tag outline, the untagged error) passed in
  00's run of `mesh-ui-serve` and `board-api`. E1–E7, the user-action outline, and the exempt clock
  ticks all pass.
  `verifies → stories/02_story_an-idle-view-costs-almost-nothing/tasks/00_the-polled-routes-answer-304.feature`,
  `verifies → stories/02_story_an-idle-view-costs-almost-nothing/tasks/01_every-poll-pauses-and-backs-off.feature`
- **03:** `--only test/mesh/mesh-workspace-workdir-absolute.test.mjs` gave 10 ok and exit 0. The
  scenario cases passed in 00's run of `mesh-launcher-syncs-every-workspace`: E1–E8, the E3 outline
  (5 rows), the cleared backoff, the unreadable registry, the comeback, and the gone-folder outline
  (3 rows).
  `verifies → stories/03_story_a-permanent-fault-is-said-once-and-backed-off/tasks/00_a-permanent-failure-is-said-once.feature`,
  `verifies → stories/03_story_a-permanent-fault-is-said-once-and-backed-off/tasks/01_a-gone-registration-stops-costing.feature`
- **05:** `cargo test -p mesh-desktop-core --offline` gave 132 passing and 0 failing. Every guard
  scenario is a `guard::tests` case: task 00's E1–E5, `the_sustained_durations_edges` and
  `a_daemon_the_os_cannot_sample_is_never_judged`, and task 01's E1, E3, E5, E6 and E7.
  `cargo check --offline` on `crates/app` was clean. `node scripts/supply-chain-audit.mjs` passed
  with 0 warnings. The live sampler on a busy child was not observed (F-08).
  `verifies → stories/05_story_the-desktop-shows-a-sustained-overrun/tasks/00_the-guard-judges-a-sustained-overrun.feature`,
  `verifies → stories/05_story_the-desktop-shows-a-sustained-overrun/tasks/01_an-overrun-is-shown-and-logged.feature`

**Design conformance (05; DESIGN.md's one surface): INCONCLUSIVE.** The surface declares `Route:
none` (the desktop window is rendered from an IPC fixture), and `.aof/aof.config.json` sets no
`work.ui.baseUrl`. No render was attempted at any breakpoint, and no designer or QA session was
spawned. The binding checklist's text, states and precedence are pinned by the core crate's tests.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16701 | `test/arch/mesh/acd-one-cost-meter.test.mjs` (3 cases) | GREEN (3/3, 2026-10-22, at 06's verify, and again at the 00–05 verify). | Appended `process.cpuUsage();` to `packages/mesh/src/presence.mjs`. Observed red: `no other package source reads process.cpuUsage or eventLoopUtilization — count through the meter`, 1 of 3 failing. Restored byte-identical. |
| FF-16702 | `test/arch/mesh/acd-daemon-budget-one-home.test.mjs` (2 cases) | GREEN (2/2, 2026-10-22). | Appended `const idlePercent = 2;` to `packages/mesh/src/presence.mjs`. Observed red: `import DAEMON_BUDGET, or read cost.budget off \`aof mesh status --json\` — never re-declare a budget number`, 1 of 2 failing. Restored byte-identical. |
| FF-16703 | `test/arch/ui/acd-ui-polls-through-one-cadence.test.mjs` (4 cases) | GREEN (4/4, 2026-10-22, and again at the 00–05 verify). The file has landed, and the 00–05 verify dropped `(pending)` from ARCHITECTURE's row. | Appended `setInterval(() => {}, 1000);` to `apps/ui/src/home/Home.tsx`. Observed red: `schedule the poll through createPoll (apps/ui/src/lib/poll-cadence.mjs)`, 1 of 4 failing. Restored byte-identical. |
| FF-16704 | `test/arch/ui/acd-desktop-guard-never-kills.test.mjs` (3 cases) | GREEN (3/3, 2026-10-22). | Appended `fn probe_kill(child: &mut std::process::Child) { let _ = child.start_kill(); }` to `apps/desktop/crates/core/src/guard.rs`. Observed red: `guard.rs has no path to stop, restart or kill a daemon`, 1 of 3 failing. Restored byte-identical. |
| FF-16705 | `test/arch/mesh/acd-presence-reads-runs-from-the-store.test.mjs` (4 cases) | GREEN: the tick's path (`assembleActiveRunsAndSubsumedWorkspaces`, `assemblePresenceForTick`, `readStoreActivity`, `loopEntriesFor`) has no runs walk, reads through `readStoreActivity`, and `run.started`/`run.completed` each declare `publish-run`. | Planted `void readRuns; readRuns(".");` as the first line of `readStoreActivity` (`packages/mesh/src/presence.mjs`). Observed red: `the tick walks no runs/ folder (violations: readStoreActivity matches /\breadRuns\s*\(/)`, 1 of 4 failing. Restored byte-identical (`cmp`). |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | 06/00 E4 pairs "the global store cannot be opened" with `aof work run-start`. In a mesh-enabled workspace that verb refuses the mint (`ITEM_LOCK_UNDETERMINABLE`, `packages/mesh/src/item-lock.mjs:185`, m43/ADR-003 R1.4: the item lock fails closed on an unreadable store), so the step "the run is started" cannot hold through the verb. The suite proves the property at the transition seam the verb wraps (`transitionRunStart` with the drain withheld, then the store made unopenable: the step stays owed, and `doctor --converge` lands the row). | contract | medium | Non-blocker. The delivered property holds: a run transition whose publish finds the store unopenable is never refused and leaves `publish-run` owed. The verb's fail-closed is an earlier locked contract this story does not reopen. The `.feature` is left as delivered, and the rule is recorded in this item's OUTCOME as an assumption. Recall: no prior finding with this cause. | product-owner (167/06) | closed |
| F-02 | A failed `publish-run` step raises no warning on the verb: `threadPropagationWarnings` threads `publish-projection` outcomes only. | gap | low | Non-blocker. On the realistic failure (the store will not open), the sibling `publish-projection` step fails the same way and is warned, and the owed step shows in doctor's unsettled steps (164/ADR-006). Recorded as an OUTCOME gap. Recall: m164/F-02 is a degraded-input-reported-as-something-else case, which this is not, so this is a distinct incident. | product-owner (backlog) | open |
| F-03 | `aof mesh heartbeat` still builds `activeRuns` and loops from the run files (PLAN: "only the tick stops calling them"). For a workspace that does not propagate, the verb lists its runs and the tick does not. | gap | low | Non-blocker. ADR-008 says a non-propagating workspace is not on the mesh, so no face shows it. Only the verb disagrees. Recorded as an OUTCOME gap. Recall: m130/F-07 and m164/F-03 are faces disagreeing about other state, with different causes, so this is a distinct incident. | product-owner (backlog) | open |
| F-04 | After 06, the container soak still fails 167/04 E1: `serve` is idle at 6% of a core (1.78 CPU-s over 30 s) against the 2% idle budget, down from 12–14% (the build's measurement, STATE.md 2026-10-21). The runs walk is gone by construction (FF-16705). The remaining cost is unattributed: the candidates are the tick's per-doc work over 1,800 items (the cache-first enumeration and the stat digest), and no profile has been taken. | gap | high | Non-blocker for 06: its rules R1 and R2 hold, and PLAN put the remaining tick cost out of scope. It blocks 167/04 and the milestone's accept, because the budget is not yet met. Recall: this is the same symptom family as m165/F-03 (the 17-hour burn that motivated 167), but with a different cause after 06, so it is a distinct incident. | operator (167 / 04) | open |
| F-05 | 167/03's unresolvable-skip line claims "said once" for a code outside the permanent set. The path is unreachable today, because every registry skip carries a permanent reason. | gap | low | Non-blocker: no reachable path prints it. Recorded as an OUTCOME gap. Recall: m164/F-04 (per-tick warns for gone folders) is the fault 03 discharges, not this wording, so this is a distinct incident. | product-owner (backlog) | open |
| F-06 | In 167/03, a held workspace that moved and then fails again stat-walks its tree twice on that tick. | gap | low | Non-blocker: it is one tick, for one workspace in a rare state. It adds to F-04's per-tick walk cost and is cited there, not filed separately. Recall: m167/F-04 is the open budget overrun this feeds, and m165/F-03 is the original burn. Neither shares this cause, so this is a distinct incident. | operator (167 / 04) | open |
| F-07 | 167/02's pause, show, back-off and snap-back rules are proven on the scheduler with an injected clock and visibility, not on mounted surfaces. Each surface's wiring, including Home's capture-phase pokes, is checked by source (FF-16703) and has no mounted case. | gap | low | Non-blocker: FF-16703 holds every poll to the cadence by source. A mounted case needs a visibility seam in the UI harness. Recorded as an OUTCOME gap. Recall: no prior finding with this cause. | product-owner (backlog) | open |
| F-08 | 167/05's guard has run only inside `cargo test`, over an injected sampler and clock. PLAN's live check (a debug build's sampler on a busy child for more than 5 minutes) needs the desktop app rebuilt (`install-local --desktop`) and restarted, which only the operator does. | gap | medium | Non-blocker: every scenario is `@executable` and green, and FF-16704 holds the never-kill rule. Recorded as an OUTCOME assumption and gap. Recall: m130/F-12 is a prior occurrence of the same cause, a desktop rung that is cargo-tested and has no live observation. It is cited here, and this finding stays open for its owner. | operator (desktop rebuild + restart) | open |
