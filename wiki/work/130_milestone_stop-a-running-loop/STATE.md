---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 130 · Stop a running loop — one durable request, one verb, and the fleet and the desktop reach it — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

- [ ] 01 · the-stop-request-has-one-home — in-review (built + reviewed 2026-09-21, solo lane)
- [ ] 02 · the-verb-and-the-shell-honour-it — not-started (depends on 01)
- [ ] 03 · the-fleet-sees-and-stops-it — not-started (depends on 02)
- [ ] 04 · the-desktop-stops-what-it-supervises — not-started (depends on 01, 02)
- [ ] 05 · the-register — in-review (built + reviewed 2026-09-21, solo lane)
- [ ] 06 · the-live-stop — not-started (depends on 05)

## Notes & decisions in flight

<!-- Surprises, corrections, mid-build discoveries. Decisions that prove durable graduate to ADRs at
     Accept — don't leave them only here. Strike-through corrected assumptions to keep history honest. -->

- **Framed 2026-09-13** from the 129 loop's live run, not a PRD. The measurement is the loop-diag
  log `loop-diag.129.2026-09-13T08-26-34-907Z.log`: eleven `signal SIGINT` lines at 11:41Z, the
  session ended by the driver's own `timeout` at 11:45:24Z, and the halt returned without settling
  129/04's run (still `running`). The signal-listener half is repaired outside this milestone
  (`9f6be4be`); the rest is this milestone.
- **Default decision taken (framing):** the board gets no affordance. 53/ADR-004 froze the board
  against a loop face and FF-5307 pins `src/board-ui.mjs` and the `ui/` tree to that contract; the
  fleet node card is the row that already shows the node's running work, and it is the one UI
  door. Recorded here so the refine does not re-open it.
- **Default decision taken (framing):** the stop request is a FILE in the aof home keyed by
  `loopRunId`, beside `loop-fixes/` and `logs/` — not a row the control daemon holds — because a
  foreground loop (129 ran `supervised: false`) has no daemon relationship at all and must still be
  stoppable, and Windows cannot signal it. The desktop's Job-Object/tree kill is the fallback,
  never the first rung.
- **Refined 2026-09-13 (autonomous cascade, one run `20260913T122623182Z-0000`).** Decide: `aof-architect`
  → ARCHITECTURE.md (six ADRs, FF-13001–FF-13007), `aof-designer` → DESIGN.md (two surfaces, binding
  checklists); no RESEARCH.md — every unknown was measured at framing or by the architect at the
  source. Memory recall (`--area architecture`) surfaced 19/ADR-001, 20/ADR-006 (a leaked `running`
  row walls the next mint — the dropped-settle hazard) and 53/ADR-015; each honoured in ADR-003. The
  item-scoped recall was empty. Graph: `aof graph build .` 12:28:11Z, 16752 nodes; boundaries drawn
  on `graph impact` coupling (`commands/loop.mjs` one src dependent; `mesh/declarations.mjs` none;
  `mesh/presence.mjs` 14 — the additive-key discipline). Break-down: SIX write-disjoint stories, the
  register its own story so ONE writer owns the budget table and both `index.mjs` files (every
  test directory in scope is at ceiling: `test/loop` 72/72, `test/arch/loop` 55/55,
  `test/mesh/presence` 7/7, `test/mesh/ui` 11/11, `test/ui` 56/56 — every other story EXTENDS an
  existing suite). `reads:`/`files:` derived through `story-contract-derive` and subtracted by hand.
- **Default decision taken (refine):** no mock was elicited (no human present in the autonomous run);
  DESIGN.md's binding checklists are the conformance source of truth per 07/ADR-003.
- **Default decision taken (refine):** where DESIGN.md and ADR-005 disagree on the presence key —
  DESIGN wrote `loops` always-present (`[]` when none), ADR-005 §1 rules it OMITTED when empty (the
  `buildId` discipline; eleven suites pin the record's key list) — the ADR governs and every reader
  treats absence as `[]`. Recorded in story 03's notes; no contract re-opened.
- **Default decision taken (refine):** VERIFICATION.md is scaffolded with the seven register rows
  reading `pending (130/05)` and an em-dash probe — 129's convention, which `aof work doctor` accepts
  (0 errors) while the item is open; story 05 replaces each dash with the observed probe.
- **Default decision taken (architect, ADR-001 §6):** 129/04 lands `src/commands/loop.mjs` first and
  130/02 rebases on it; if 129/04 is still unbuilt when 130/02 is ready, 130/02 lands first and
  129/04's task 06 consumes `ctx.stopSource`. The seam's shape is fixed either way.
- **Departures the architect recorded from the framing brief:** six stories not five; `loops`
  omitted-when-empty; the loop line a sibling projection (`fleetCurrentWorkLines` is byte-pinned to
  the Rust `current_work()`); the verb core in `src/loop/stop.mjs` (the fleet face may import no
  `commands/*`); no clock in the stale-request rule (only `--resume` can find a request keyed by its
  own id); the desktop's grace counted from the CANCEL press; TECH_DEBT items 44 and 18 (b) paid in 03.
- **Open (design, not blocking — raised by 130/04's QA):** DESIGN §Surface 2 gives the desktop's loop
  bar no wrap/overflow rule; at 760px roughly four rows overflow the frame. Most machines carry 0–2
  supervised loops (one declaration per scope), so nothing was codified; a later item names the
  rule if a machine ever carries more.
- **Ratified in contract, graduates to the ADR at Accept (130/02 QA, 2026-09-13):** ADR-003 §8 and
  ADR-006 §4 say `LOOP_STOPS` is "twelve"; measured at HEAD it is FIFTEEN (129/01 added three). The
  invariant the contracts assert is "unchanged by this milestone, `operator-interrupt` a member"; the
  ADR text is not re-opened (the ratification rule) and the count is corrected when the ADRs graduate.
- **Ratified in contract, graduates to ADR-005 §5 at Accept (PO ruling on 130/03 QA's design-gap finding,
  2026-09-13):** the fleet's rung memory is keyed to the DRIVE — `rememberStopRung(memory, loopRunId, rung, runId)`
  stores `{ rung, runId }` and `loopStopAffordance` reads it only while the entry's `runId` is the same drive.
  The propagation gap keeps the same `runId` (the guard holds); a `--resume` mints a new drive, so the
  button returns without a reload or a timer. Without this, a cancelled-then-resumed loop read
  `cancelling` with no button for the page's life. The QA's second note — the fleet face has no
  request-body cap on any write route — is face-wide and stays a note, not this milestone's.
- **Refine closed 2026-09-13.** Twenty task contracts across six stories; PO headline scenarios, QA case
  matrices (five agent passes) and the developer feasibility pass (inline — every double, harness
  capability, error code and temp-file shape the contracts name was checked at the source). Every
  story and the milestone validate PASS; doctor 0 errors, Loop-Ready 80% (parity with 129). The
  operator halted the agent fan-out over cost mid-way; the feasibility pass was finished inline.
- **Open (sequencing, for the operator):** 129/04 (`in-progress`, its run `running` and awaiting
  reclaim) owns `src/commands/loop.mjs` and defines the injected signal seam this milestone
  produces for. The shell story and 129/04 must not be driven in this checkout at the same time.

## Feedback (for retro)

<!-- Raw, attributed entries captured as noticed; distilled into RETROSPECTIVE.md at aof:verify. -->

- **130/01 review close (QA lens, 2026-09-21) — contract gap, fixed at the close, no item created:**
  ADR-001 §2's invariant forbids any module but `stop-request.mjs` spelling `"requested"`/`"honoured"`,
  and lists `STOP_LEVELS` as the one level→word map — but named no state→word export, so story 04's
  declarations producer ("drops a loop whose request was honoured") would have had to spell the word
  or read `state` blind. Routed `fixed` (cheaper than a driver): an additive frozen `STOP_STATES =
  { requested, honoured }` export, used internally and pinned in the suite. ADR-001 §2 should name
  it when the ADRs graduate; 04's build reads `record.state === STOP_STATES.honoured`.

- **130/02 build (2026-09-21) — the declared read/write set was incomplete, by sequencing, not by
  omission:** the story was authored against the pre-129/04 shell (`:1580-1584`, `:1833`), and 129/04
  landed first, moving `settleDriven`/`drivenRow`/`retryUntilTerminal` into `src/loop/cycle.mjs` and
  the wave (with its interim `ctx.signalSource` seam) into `src/loop/wave.mjs`. ADR-001 §6 foresaw
  exactly this ("whichever lands second adapts"), so the build edited both, replaced the wave's seam
  with the shell's `stopSource`, re-pointed the lane fixture, and widened `files:` accordingly. Two
  schema pins outside the declared set moved by exactly `stop` (FF-12602 leg 4 and the L3-gated
  control) — the same succession `quiet` and `supervised` took. Lesson for refine: a story that
  edits a file another in-progress story also edits should declare the OTHER story's new homes too.
- **130/02 build — two contract readings, stated:** (1) task 02's "a spy on `createStopSource`"
  is read as observable effect + one structural check (the real source's listener on `process`,
  the request read from `loopStopsDir()` under the resolved id, and `pollMs: 2000` at the one
  composition site) rather than an injected factory seam the ADR does not name. (2) The CLI's
  human face prints a refusal's MESSAGE only, so the two messages `stop.mjs` composes name their
  code in parentheses (`throwRefusal`'s idiom) for "stderr names `loop-stop-no-declaration`".
- **130/02 review close (architect lens, 2026-09-21) — recorded, no item created:** the request's
  `cancelled` slot is ONE runId (ADR-001 §2), and a wave halted at level 2 cancels one lane child
  per lane. The shell marks a wave's request honoured with `cancelled: null` and names the
  cancelled lanes by ref in the halt's `Details` (the wave's own `cancelled: [refs]`). Story 04
  reads `state === STOP_STATES.honoured` and never `cancelled`, so nothing downstream is blind;
  if a face ever wants the lane runIds, the slot would need to admit an array — a contract
  amendment for a later item, not this one. Round 1: 0 Blockers; this Important and one nit
  (a request whose writer has no node renders `by=<pid>`) recorded here.
- **130/04 build (2026-09-21) — `aof test --scope impacted --story 130/04` is the FULL suite on
  this story, and it runs at once:** four of the seven declared files are outside the JS import
  graph (three `.rs` under `app/desktop/crates/`, plus `app/desktop/ui/app.js`), each a
  `not-in-graph` widening, so the selector widened to `all` and launched `scripts/test.mjs` with no
  selection — the run this machine's live `:4182` daemon forbids (the memory names new paths; a
  non-JS path widens the same way). Killed within a minute; the runner's per-test `~/.aof-test`
  homes kept the real home clean. The build ran the write set's suites through
  `scripts/test.mjs --only` (19 suites, 148 ok) plus `cargo test` (116) and `cargo check` of the
  shell. Lesson for the continue prompt / the selector: a story whose `files:` names Rust or the
  desktop UI has no impacted scope, and `--story` should say so before it widens.
- **130/04 build — two contract readings, stated:** (1) the shell's grace counts from the cancel
  spawn's exit 0 (the instant the level-2 request is on disk for the loop to read), which is at or
  after the press either way and is the one clock that measures the loop's own time to honour it;
  (2) a retire while a declaration's child is alive waits for the child's own exit rather than
  killing it — the row goes only for a halting loop (its honoured mark) or a terminal record, and
  the old `start_kill` on that path is what ADR-004 names as the orphaning defect.
- **130/04 review close (solo, 2026-09-21) — round 1: 0 Blockers; recorded, no item created:**
  (a) *architect, nit* — `supervise_child` is now ~230 lines (the ladder's wake handler inside the
  select arm); linear and commented, and the arch controls pin the one-spawner shape it must keep,
  so an extraction of the wake handler onto `StopLadder` is a later tidy, not this story's.
  (b) *QA, recorded (ADR-004's own shape)* — after the TREE KILL the desktop writes nothing: the
  request stays `requested` at level 2, the run record stays `running` (stale after the heartbeat
  threshold), the row persists `stopped` and HELD until `--resume` clears the request — the
  "leaked running row" ADR-004 accepts for the fallback. ADR-004 rejected the desktop touching the
  request file, so the fix is an ADR-level question (a `honoured` mark after a kill, or the
  verb's `--stop` re-run as `live: false`), for verify/retro to weigh, never this lane's.
  (c) *QA, nit* — `honouredStops` reads one mark per distinct `loopRunId` in the run records,
  supervised or not; one ENOENT read per unlisted id every 30 s. Filtering would re-derive the
  engine's supervision rule in the producer, which is the duplication the split forbids.
  (d) *designer, INCONCLUSIVE by the lane's rule, CONFORMS on the fixture render* — no
  `work.ui.baseUrl` and no `--url`, so the lane attempted no render; the developer's own headless
  render of the standalone fixture (`index.html?loops=<signal>`, chromium-1234, light and dark)
  matches Surface 2's binding checklist region by region (second `.controlbar`, `loop 129`, the
  daemons' pill, one `.toggle.subtle` stop, no play glyph, absent at `stopped`, absent with no
  rows). The live window is verify's. (e) *nit, outside the write set* — `app/desktop/ui/README.md`
  does not yet list the `?loops=` demo param.
- **130/03 build (2026-09-21) — two contract deviations, stated:** (1) the loop line's Stop rides
  `runAssign` (`assign-affordance.mjs`) through two ADDITIVE options, `refusalCopy` / `timedOut`,
  rather than a second copy of its deadline race — so `git diff -- ui/` is EIGHT fleet files, not the
  six task 04 and ADR-005 §6 name; FF-5307's re-pin comment states eight. (2) Task 03's ruling put the
  "held word" raise in the card; it lives in the pure modules instead — `fleetLoopLines(presence,
  memory)` and `nodeWorkRegion(node, localNodeId, memory)` take an OPTIONAL rung memory (wire-only
  without it) — because `Fleet.tsx` had eleven lines of headroom and the raise is headlessly testable
  there. Both are amendment candidates for the accepting item's contract (Q1), no item created.
- **130/03 build — item 44's hoist had a FOURTH detector requiring the copy:**
  `acd-fleet-assign-targets-item-workspace` looked for the resolution seam INSIDE the assign branch's
  pre-mint region. Re-aimed with the three (the seam is checked where it lives, the CALL's order still
  in the branch). `files:` widened by it and by five pins the change legitimately moved (FF-5301's sink
  reach 74 → 75 for `loop/stop-request.mjs`; the fed-by-route gate's projection call; the session index's
  top-level keys; 50/04's write set; the home-route row for Fleet.tsx 1550 → 1560). Lesson for refine:
  a story that hoists a copy should declare EVERY gate that measured the copy, not the three the ledger
  entry happened to name.
- **130/03 review close (architect + QA lenses, 2026-09-21) — round 1: 0 Blockers; recorded, no item
  created:** (a) `Fleet.tsx` is at 1560/1560 with ZERO headroom, met by compacting this story's own
  additions (one-line effect/handler, merged comments), never by trimming inherited rationale; the
  ratchet's escape (a sibling file) is refused by `ui/src/fleet/` at 20/20 — item 18(a)'s shared layer is
  the real remedy (item 33 stays open, as ADR-005 §5 foresaw). (b) The presence tick reads each item's
  runs TWICE (`readActiveRuns` + `readActiveLoops`, the contract's two signatures); a shared read is
  the fix if the 25 ms presence budget ever bites. (c) `LoopStopRow` derives its hold/message from
  `assignAffordanceView` with picker-shaped inputs (`hasOptions: true, selected`) — one derivation
  kept, at the cost of a shim. (d) The request file's `workspaceId` is `null` on an unpinned checkout
  (130/02 task 01 pins it so — the verb spells `config?.mesh?.workspaceId ?? null`, TECH_DEBT item 4's
  defect class) while the route has just resolved the id and the card carries it; a fix
  (`resolveWorkspaceId(workspace)`) was applied and REVERTED because it contradicts 130/02's delivered
  contract — an amendment candidate (Q1) for the PO. (e) The loop-stop route inherits the face's
  uncapped `readJsonBody` (a 1 MiB body is lifted like a 40-byte one); a cap is face-wide, reported for
  the register as task 02 asked. (f) Design conformance: INCONCLUSIVE — no `--url` and no
  `work.ui.baseUrl`, so no render was attempted; the 1280 render is task 04's `@uat` lane at verify.
- **130/03 build — the impacted run:** `aof test --scope impacted --story 130/03` widens to ALL here
  (the dispatch worktree carries no `graphify-out/graph.json`, so every declared file is `no-graph`),
  and the full suite binds `:4182`. Ran the 157 suites that import the changed modules through
  `scripts/test.mjs --only` instead: 1445 ok; 3 red are `mesh-worker-clone-credential-pull` reading the
  shell's own `GIT_ASKPASS` (0 red with it unset) — environmental, not this story's.

- **130/05 build (2026-09-21, solo) — three contract literals were stale by sequencing, the DELTAS held:**
  (1) the register and task 00 say the `test/arch/loop` row rises `55 -> 58`; 129/05 landed its four
  after the register was written (2026-09-13), so the row was 59/59 and rises `59 -> 62` by exactly the
  three files — the count is the invariant (FF-11904 asserts ceiling == count), the literal is not.
  (2) FF-13002's "in `src/commands/loop.mjs` … exactly three drive sites": since 129/04 two of the
  three (`drive(retried.record)`, the verify cross) live in `src/loop/cycle.mjs`, so the control sweeps
  the family FF-12602 sweeps (shell + ladder) and the count holds as cited. (3) task 00's "APPENDED after
  `...acdSiteIsProjectedNotCopiedTests`": the three spreads are appended after 129/05's block, which
  already follows it; nothing above is re-ordered. Amendment candidates for the accepting item's
  contract (Q1), no item created.
- **130/05 build — the impacted run widens to ALL here too:** every declared path is a NEW test file, the
  index or the budget table, so `aof test --scope impacted --story 130/05` widens each `not-in-graph`
  path to the full suite the live `:4182` daemon forbids. Ran instead through `scripts/test.mjs --only`:
  the three files (20 cases), the 16 standing controls the register cites plus the registration, purity
  and stripper class controls (143 ok), and every `test/arch/{loop,testing,audit}` file (475 ok), each
  under a fresh `AOF_GLOBAL_HOME`; cargo 116/116 for the cited half. `node --check` clean on the five
  touched files; the repo has no separate lint/typecheck script (`npm run check` is the full suite).
- **130/05 probes — one measurement against task 01's ruling 4:** the ruling expected
  `acd-mesh-ui-no-core-import` to red beside FF-13003's route probe (the read re-implemented in
  `ui-serve.mjs`); measured, it and `acd-mesh-ui-read-only` stay GREEN — the face still imports
  `../loop/stop.mjs` for `STOP_REFUSALS`, and `../work/loop.mjs` / `../run-store.mjs` /
  `../loop/stop-request.mjs` are all admitted by its allow-list. FF-13003's importer-set leg is therefore
  the ONE guard against a re-implemented route; recorded in the register cell, no change asked of the
  standing control (its subject is the command layer, not the core).
- **130/05 build — the declared `reads:` was incomplete for a register story:** the controls' own
  SUBJECTS were outside it — `src/loop/cycle.mjs` (two of FF-13002's three drive sites),
  `src/mesh/launcher.mjs` + `src/commands/mesh/heartbeat.mjs` (FF-13005's two callers),
  `app/desktop/crates/app/src/supervisor.rs`, `main.rs` and `app/desktop/ui/app.js` (FF-13007's node
  leg) — plus the suites whose recipes the fixture legs mirror (`test/loop/loop-command-stops`,
  `loop-command-resume`) and the class controls a new arch file must satisfy (`acd-purity-is-external`,
  `acd-test-suite-registration`, `acd-mesh-ui-read-only`). Each was read and is reported here. Lesson
  for refine: a register story's `reads:` should name every file a declared control SWEEPS, not only
  the modules the ADRs discuss.
- **130/05 review close (solo — architect, QA and craft lenses in turn, 2026-09-21) — round 1:
  0 Blockers; recorded, no item created:** (a) *architect, nit* — the four-line `resolved(fromRel,
  specifier)` helper now has three copies under `test/arch/loop/` (the two new files and
  `acd-loop-family-boundary`); `module-family.mjs` exports the extractor and the family classifier but
  no plain resolver, and that module is outside this story's `files:` — a lift is a later tidy.
  (b) *architect, nit* — FF-13003's launch-predicate leg cuts the arrow's text at its first `?`; a
  rewrite of `launch` using optional chaining before the ternary would red it with the predicate text
  printed, which is a legible false red on a shape ADR-002 §1 spells exactly. (c) *QA, recorded* — the
  standing mesh-ui controls do not red on FF-13003's route probe (measured above); the importer-set leg
  is the one guard. (d) *QA, recorded* — the cited-control checks (FF-13006's `fleetCurrentWorkLines`
  pin, FF-13007's cargo half) assert that the citation RESOLVES (the file exists, is registered, names
  the function/tests) and do not re-run it, as the register's "(cited)" asks; the cargo half was run
  once, for its probe. (e) *craft* — CRLF like the checkout, comment density like the neighbours,
  no `console.log`, no silent catch; `node --check` clean.

## Verification

<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
