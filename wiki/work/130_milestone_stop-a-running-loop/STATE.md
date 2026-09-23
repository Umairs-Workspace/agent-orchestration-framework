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
- [ ] 02 · the-verb-and-the-shell-honour-it — in-review (built + reviewed 2026-09-21, lane)
- [ ] 03 · the-fleet-sees-and-stops-it — in-review (built + reviewed 2026-09-21, lane)
- [ ] 04 · the-desktop-stops-what-it-supervises — in-review (built + reviewed 2026-09-21, lane)
- [ ] 05 · the-register — in-review (built + reviewed 2026-09-21, solo lane)
- [ ] 06 · the-live-stop — in-review (2026-09-23: legs 1–6 PASS at the source, leg 6 on ADR-007’s build; remote not exercised — see `## 130/06` below)

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

- **From 129's door (2026-09-22), two observations for 130's retro.** (1) Two whole-tree reds at
  HEAD came in with 130/02's lane commit `48ed32b`: `work:loop`'s `run` was no longer an
  `AsyncFunction` (`command-core/00`), and `loop/loop-command-stops` spelled the frozen `LOOP_STOPS`
  literal that `acd-loop-probe-contract` already pins — which `grade/01` forbids of that suite.
  Repaired at the owner in `16850c7` + `6a81d14` (`async` restored; the suite asserts the length and the twelfth
  member and cites the pin) — `m129/F-69`. (2) At the 22:14Z halt on 130/06, the wave run
  `20260921T215324370Z-0006` settled `failed / agent_error` and the run-failed rollback reactor
  (20/ADR-005) moved this milestone's `status:` from `in-progress` to `not-started` with five
  stories `in-review` — uncommitted in the primary; the remedy is `aof work status 130 in-progress`
  once 130/06's live lane is resumed or swept — `m129/F-68`.

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
- **130/06 build (2026-09-21 lane, then `aof:continue 130 --solo` on 2026-09-23) — a `@manual` story
  whose every leg is operator-gated cannot be closed by the session that builds it.** The contract names
  the OPERATOR for the restart, T1 and the clicks, and forbids an agent starting a daemon or a loop, so
  the build is the agent's half: the payload measured at the source, every leg's procedure and paste
  slots written into `## 130/06` below, then handed back with the story `in-progress` — never
  `in-review` on evidence nobody pasted. History: the 2026-09-21 lane (under `aof work loop 130`,
  `loopRunId 7661348f-073d-4884-8544-a63efb9e53ac`) did that half, then the milestone's wave run
  `20260921T215324370Z-0006` settled `failed` / `agent_error` and the loop halted. Its tree
  `.aof/mesh/dispatch-worktrees/dispatch-130-06` is left as it was: `dispatch --cleanup` refuses it
  `dispatch-lane-uncommitted-work` by design, and its one unique file is a dead `running` run record
  under the pre-132 hostname folder, which the private-terms guard would refuse to commit. Its
  procedure is ported below, re-measured on 2026-09-23. Four readings stated:
  (1) **the contract's `win-host-a` is this node's id, now `node-7297`.** Task 00 was written when the
  node's id was its hostname; f76c153 renamed that placeholder to `win-host-a`, and 132 re-identified
  the node as the opaque `node-7297`. Everywhere the contract prints the node's id — `by.node` in the
  request, the halt's `by=`, the status body's `localNodeId`, the `mesh serve running (node …)` line —
  the source now reads `node-7297` (`src/loop/stop.mjs` writes `by: { node: meshNodeIdOf(...) }`).
  Likewise `umamis-mac-mini` reads `node-9549` where an id is printed (the `loop-stop-not-local`
  message) and "the Mac's card" on the fleet. Flagged, not changed — amending task 00 is refine's.
  (2) **the test-bed scope is `01`**: `00` has no stories on disk on this machine. (3) **`<ref>` is read
  off each leg's own `Driving` line**, because the loop advances between legs. (4) **the payload is
  not reinstalled**: today's `292f5f0+dirty.20260923T152311` differs from the checkout in one file,
  `src/config-inspect.mjs` (133's diagram work). Every file the stop path runs is byte-identical, so
  a reinstall would only cost the operator a second relaunch. Two findings for the register, both
  recorded, neither this story's: (a) `aof work resume` lists `130/01 READY` for run
  `20260921T165009693Z-0000`, which run `…172423069Z-0001` (`retryOf` it, attempt 2) already closed
  `done` — the sweep offers a lineage that has finished; (b) the failed wave run's rollback moved the
  milestone `SPEC.md` from `in-progress` back to `not-started` while five of its six stories were
  `in-review`, left as an uncommitted working-copy edit until this continue's mint moved it forward
  again. Lesson for the loop (story shape, handed back): `aof work next` could hold a `@manual`-only,
  operator-gated story as `needs-operator` rather than put it in a wave — the 09-21 wave spent a
  mint and a lane to find out, and died doing so.

## 130/06 · The live stop — read at the source (for `aof:verify 130`)

Written by the 130/06 build (`aof:continue 130 --solo`, 2026-09-23), porting the 2026-09-21 lane's
procedure. Every observation is pasted from its source per task 00's RULING (1). The ONE substitution
is the repository's scrub: the home and repo paths carry the repo's spelling (`C:\Users\Umami`,
`C:\Source\umami\…`), because the pre-commit's private-terms guard refuses the machine's own. Where the
contract prints `win-host-a` the source prints this node's id `node-7297` — reading (1) in
`## Feedback (for retro)`. A leg marked **PENDING (operator)** has NOT run. It needs the operator to
launch the desktop app, run T1 on their own console (no agent starts a loop) and, for legs 5 and 6,
click on the fleet and on the desktop window.

### Readings (recorded once, reused by every leg — RULING 6)

- `<scope>` = `01` on the standing test-bed `C:\Source\umami\aof-test-repo` (workspace
  `52294b307214c27d`). Measured 2026-09-23 just before 16:00Z with the read-only probe (the test-bed's
  `git status --short` identical before and after): `aof work loop 01 --dry-run --json` →
  `{"state":"ready","act":{"act":"gate","ref":"01/00"},"scope":"01","level":"L2","cap":3}`. The first
  tick gates `01/00` (`in-review`), then drives `01/01` (`shout`, `in-progress`; its one run
  `20260923T001832160Z-0000` is `done`, so no open run walls the drive). The operator may name
  another scope; record it here.
- `<ref>` = the ref T1's current `Driving <ref> — …` line names at each leg. Each leg pastes that line.
  Its records land under that ref's folder, `runs\node-7297\`.
- `<L>` = `brief.loop.loopRunId` of the newest `runs\node-7297\*.json` under `<ref>` once T1 has
  started. The `--dry-run` probe mints a fresh id per call and is NOT `<L>`.
  `<path>` = `C:\Users\Umami\.aof\mesh\loop-stops\<L>.json`. The `loop-stops` directory does not exist
  yet (measured 2026-09-23T15:58Z): no request has ever been written on this machine.
- `<log>` = the path T1's stderr announces: `C:\Users\Umami\.aof\mesh\logs\loop-diag.01.<stamp>.log`.
- Which `aof` runs where: T1/T2's `aof` on PATH is the npm link into `C:\Source\umami\aof`
  (`(Get-Command aof).Source` → `C:\Program Files\nodejs\aof.ps1`). The desktop and the fleet route run
  the payload `C:\Users\Umami\.aof\bin\aof.exe`. `diff -rq` of the payload's `src\` against the
  checkout's names one file, `src/config-inspect.mjs` (133's diagram work). Every file the stop path
  runs is byte-identical in both: one code, two launchers.
- Run order that satisfies every `Given`: PRECONDITION → leg 1 → leg 2 → leg 4 (its three answers at
  0/30/60 s after leg 2's halt, then its `--resume`) → leg 3 (a gap stop, then `--resume`) → leg 5 →
  leg 6 → remote.

### PRECONDITION — agent half DONE (2026-09-23T16:01Z); operator half PENDING

*verifies →* `Scenario: PRECONDITION — the payload is installed and the OPERATOR restarted the desktop`
(the install, the `--version` line, the `[--stop]` usage). The two `daemon-started` lines are the
operator's, below.

**The wrong build, refused before any observation (2026-09-21, the earlier lane)** (*verifies →*
`Scenario Outline: a wrong build is refused before any observation`, rows 1 and 3). Measured from
`C:\Users\Umami\.aof\bin\aof.exe` between that lane's mint (21:59:54Z) and its install (22:04:50Z):
```
0.1.0 (payload 2ac6040+dirty.20260921T174032)
Usage: aof work loop <driver|NN-MM> [--level L1|L2|L3] [--cap N] [--review-claims JSON] [--resume] [--dry-run] [--quiet] [--supervised] [--json]
```
No `[--stop]`. `Test-Path` on the payload's `src\loop\stop-request.mjs` / `stop.mjs` → `False`, `False`:
the payload predated 130. No leg ran. Row 3's remedy was applied: the install, then the operator's
restart, then T1.

**The install.** `node scripts/install-local.mjs --desktop` has since run from `C:\Source\umami\aof`
(2026-09-23T14:23Z, stamped `292f5f0+dirty.20260923T152311`). `aof-mesh-desktop.exe` was placed at
15:29 local, after 292f5f0, which is the last commit touching `app/desktop/`. It is not re-run
(reading (4)). `C:\Users\Umami\.aof\bin\BUILD_ID.json`, whole:
```
{
  "buildId": "292f5f0+dirty.20260923T152311",
  "installedAt": "2026-09-23T14:23:11.533Z",
  "sourceRepo": "C:\\Source\\umami\\aof"
}
```
In one terminal, each answer preceded by `Get-Date -Format o`:
```
2026-09-23T17:01:21.2575716+01:00
PS> & "$HOME\.aof\bin\aof.exe" --version
0.1.0 (payload 292f5f0+dirty.20260923T152311)
2026-09-23T17:01:21.4839724+01:00
PS> & "$HOME\.aof\bin\aof.exe" work loop --help
Unknown flag "--help" for work:loop.

Usage: aof work loop <driver|NN-MM> [--level L1|L2|L3] [--cap N] [--review-claims JSON] [--resume] [--stop] [--dry-run] [--quiet] [--supervised] [--json]
2026-09-23T17:01:22.0268389+01:00
PS> Test-Path "$HOME\.aof\bin\src\loop\stop-request.mjs"; Test-Path "$HOME\.aof\bin\src\loop\stop.mjs"
True
True
```
The `buildId` matches `BUILD_ID.json`'s exactly, so row 1's signature is absent. The usage shows
`[--stop]`, so row 3's is absent.

**The daemons are NOT running now.** The newest `daemon-started` entry in each log carries the
payload's build:
```
{"at":"2026-09-23T14:39:32.499Z","proc":"mesh-serve","level":"info","code":"daemon-started","message":"mesh serve running (node node-7297, build payload 292f5f0+dirty.20260923T152311)","node":"node-7297"}
{"at":"2026-09-23T14:39:24.036Z","proc":"mesh-ui","level":"info","code":"daemon-started","message":"mesh ui running (build payload 292f5f0+dirty.20260923T152311)"}
```
But a startup line is not a running process. Measured at 2026-09-23T17:01:22.0485623+01:00:
`Invoke-WebRequest http://127.0.0.1:4181/api/mesh/status` → `No connection could be made because the
target machine actively refused it. (127.0.0.1:4181)`, and `Get-Process aof-mesh-desktop` → none.
Nothing was stopped, killed or started by this build.

**Operator half — PENDING.** Launch the desktop app with `aof mesh desktop run`. If it is running by
then, Quit it from its own UI first — never `Stop-Process -Force`, never `taskkill`. Then paste the
newest `daemon-started` entry from each log. Both must have `at` after the launch and
`build payload 292f5f0+dirty.20260923T152311`, or the `buildId` of any later install:
```
PS> Select-String -Path "$HOME\.aof\mesh\logs\mesh-serve.log" -Pattern daemon-started | Select-Object -Last 1
PS> Select-String -Path "$HOME\.aof\mesh\logs\mesh-ui.log" -Pattern daemon-started | Select-Object -Last 1
```
- [x] mesh-serve line (read by the agent at 2026-09-23T17:21:57.9943441+01:00; `aof-mesh-desktop`
  pid 42432 started 17:20:45 local = 16:20:45Z):
  `{"at":"2026-09-23T16:20:48.737Z","proc":"mesh-serve","level":"info","code":"daemon-started","message":"mesh serve running (node node-7297, build payload 292f5f0+dirty.20260923T152311)","node":"node-7297"}`
- [x] mesh-ui line:
  `{"at":"2026-09-23T16:20:46.633Z","proc":"mesh-ui","level":"info","code":"daemon-started","message":"mesh ui running (build payload 292f5f0+dirty.20260923T152311)"}`
  Both are after the launch and on `BUILD_ID.json`'s build: the PRECONDITION holds.
- A line whose `at` precedes the launch, or whose build is not `BUILD_ID.json`'s, is row 2's
  signature: restart again and re-check from the top. No leg runs on it.

### Terminals (Background)

- **T1**: `cd C:\Source\umami\aof-test-repo; aof work loop 01 --supervised`, kept visible. Paste its
  stderr announcement (`<log>`). Once its first `Driving …` line prints, in T2:
  `Get-ChildItem <ref folder>\runs\node-7297\*.json | Sort-Object LastWriteTime | Select-Object -Last 1`,
  read `brief.loop.loopRunId` → `<L>`, derive `<path>`.
- **T2**: a second PowerShell in the same checkout, with the fleet
  (`http://127.0.0.1:4181/?mode=fleet`) and the desktop window visible beside it. Every T2 command is
  preceded by `Get-Date -Format o` in T2.
- [x] `<log>` = `C:\Users\Umami\.aof\mesh\logs\loop-diag.01.2026-09-23T16-21-03-030Z.log` (T1 started
  17:20:57 local, the operator's console; pid 44300, `build=source 2078166+dirty`) · [x] `<L>` =
  `95597ec1-3d50-4eb7-88ef-b136aff8dad7` (from `01/00`'s `runs\node-7297\20260923T162103783Z-0009.json`,
  `state: running`) · [x] `<path>` = `C:\Users\Umami\.aof\mesh\loop-stops\95597ec1-3d50-4eb7-88ef-b136aff8dad7.json`

### Run 1 (2026-09-23T16:21Z) — leg 1 BLOCKED: `--stop` addressed a resurrected dead loop, not T1's

T1's first line: `2026-09-23T16:21:03.761Z stdout Driving 01/00 — continue, cycle 2 of 3, L2.` Leg 1 step 2
was run by the agent in T2 (cwd `C:\Source\umami\aof-test-repo`):
```
2026-09-23T17:22:14.6530985+01:00
01 — stop requested (drain) for loop d78bada9-9dd3-44bc-9ff6-0ca803a05f2d, live. C:\Users\Umami\.aof\mesh\loop-stops\d78bada9-9dd3-44bc-9ff6-0ca803a05f2d.json
exit=0
```
The request names `d78bada9…`, not `<L>`. `<path>` for `<L>` does not exist. The file that was written:
`{"loopRunId":"d78bada9-9dd3-44bc-9ff6-0ca803a05f2d","scope":"01","workspaceId":"52294b307214c27d","level":1,"state":"requested","requestedAt":"2026-09-23T16:22:15.101Z","escalatedAt":null,"honouredAt":null,"cancelled":null,"by":{"node":"node-7297","pid":38812}}`.
The fleet at 17:22:22 (`/api/mesh/status`, `node-7297`'s `presence.loops`) shows TWO loops on scope `01`:
`d78bada9…` (`phase refine, cycle 1, ref 01, runId 20260923T162136549Z-0001, stop "drain"`) and `<L>`
(`phase continue, cycle 2, ref 01/00, runId 20260923T162103783Z-0009, stop null`). T1's loop was not touched.

**Cause, read at the source.** `d78bada9…` is a DEAD loop from 2026-09-10: it is the `loopRunId` on
`01/00`'s runs `-0006/-0007/-0008` and on milestone `01`'s run `20260910T004445491Z-0000` (`failed`,
`runtime_offline`, filed under the pre-132 hostname folder). T1's driven session (claude session `114aef76…`,
`aof:continue 01/00`) ran `aof work resume` as the prompt's re-entry step. The sweep answered
`01  READY — runtime_offline (attempt 1/3, run 20260910T004445491Z-0000)`, and at 16:21:36 the session ran
`aof work resume 01` → `Resumed run 20260923T162136549Z-0001 for 01 — state running (attempt 2).` That
record, `runs\node-7297\20260923T162136549Z-0001.json`, is `state: running`, `retryOf` the 09-10 run, and
carries the dead loop's `brief.loop` verbatim. `stopLoop` (`src/loop/stop.mjs:98`) takes the NEWEST run in
scope carrying a declaration (`readLoopDeclaration`). 16:21:36 is newer than T1's 16:21:03, so the verb
resolved the resurrected loop, found its record `running` and not stale, and answered `live`. No process
will ever honour that request.

**Also observed, same minute — the desktop relaunches against a live foreground loop.** The payload spawned
`aof work loop 01 --level L2 --resume` three times while T1 ran: `loop-diag.01.2026-09-23T16-21-14-232Z.log`
(pid 34848: `Driving 01/00 — continue, cycle 3 of 3, L2.` → `stderr a non-terminal run already exists for this
item` → `exit code=1`), `…16-21-44-093Z.log` (pid 43892) and `…16-22-14-367Z.log` (pid 30712). The last two
halted `cap-exhausted at 01/00 (producer engine:cycle>=cap)` with `exit code=0`. ADR-004 §6 already names the
row; what is recorded here is that each relaunch reads and advances the SAME loop state T1 is driving.

- Result: **finding** — no leg ran. Per `Scenario Outline: a failure signature is a finding against the
  owning story, never a re-try`, the loop is left as it is. T1 still runs, the dead loop's request file
  and its `running` record are left in place, and nothing was stopped, settled or deleted by the agent.

**Fixed at the source (2026-09-23, operator: "do whatever you need").** The root is the retry carry, not
the verb: `retryRun` (`src/run-store.mjs`) minted an UNBRIEFED retry (`aof work resume`, `run-retry`, a
reclaiming `run-start`) with the prior's whole `brief`, `loop` included. It now carries the prior's brief
minus `loop` (`carriedBrief`). Every loop retry passes its own brief (`src/loop/cycle.mjs`,
`src/loop/wave.mjs`, `src/commands/loop.mjs`), so the loop's lineage is unchanged. The verb's
latest-declaration rule (ADR-002 §3c) is left alone: 130/02 task 01's outline pins it (a running L1 beside
a newer done L2 targets L2). Regression: `loop stop — an operator retry of a dead loop's run carries no
declaration, so the verb still addresses the live loop` in `test/loop/loop-command-probe.test.mjs`. It went
red with the carry reverted, and green restored. Focused run: `AOF_GLOBAL_HOME=$(mktemp -d) node
scripts/test.mjs --only` over the stop, loop-resume and run-retry suites (14 files) → exit 0. The payload is
NOT reinstalled: T1/T2 run the checkout (npm link), and no desktop or fleet path mints an unbriefed retry.
`src/run-store.mjs` is the one payload/checkout difference on a path the legs touch.

**How run 1 ended (read at the source).** The phantom `20260923T162136549Z-0001` was settled `cancelled`
at 16:26:41Z by T1's driven session. The desktop's relaunches stopped after `…16-27-44-594Z.log`. T1
walked the whole of `01`: `2026-09-23T16:46:19.441Z stdout Accepted milestone 01.` then `01 — halted on
session-needs-input at 01 (producer driver:needs-input)`, then `exit code=0` at 16:46:24.450Z. Its verify
run `20260923T164459644Z-0004` stays `running`: `settleDriven` leaves a `needs-input` drive open for
`--resume` (`src/loop/cycle.mjs:553`), by design. `aof work loop 01 --dry-run --json` now answers
`act: drive 01 verify` with `lastDeclaration.loopRunId` = `95597ec1…`, so the verb addresses T1's loop.
The `d78bada9…` request file (`level 1`, `requested`) is left as evidence. It is inert: no row reads a
`requested` mark, and no `--resume` is keyed to that id.

**The relaunch storm, read at the source (a finding for 126, not this milestone).** Twelve relaunches of
`aof work loop 01 --level L2 --resume` ran every ~30 s from 16:21:14 to 16:27:44. ~~The row they served was
the dead `d78bada9…` lineage …~~ **Corrected in run 2 (read at the source):** at 16:21:14 the phantom did not
exist yet (it was minted at 16:21:36), and the newest declaration in scope `01` was T1's own live `95597ec1…`.
`decideSupervisedDeclarations` lists a supervised declaration whose latest run is running and fresh "on
its own liveness" (126/02, branch (a)), and the desktop's controller for that row spawns its argv. That
relaunch walls on T1's open run, or halts on the cap it advanced. The storm was a foreground
`--supervised` loop's own row being relaunched against it until the controller's clean-exit hold stopped
it. Run 2 reproduced it once per T1 start (17:13:14, 18:48:44, 19:15:44), each walled at once on
`duplicate-run` and held. The same mechanism is leg 6's finding below.

### Run 2 attempt (2026-09-23T16:58:58Z) — scope `01` is spent; no leg ran

The operator ran `aof work loop 01 --resume --supervised` (`loop-diag.01.2026-09-23T16-58-58-657Z.log`,
`build=source 7a9ad6e+dirty`): the gates for `01/00` and `01/01` → `Driving 01 — refine, cycle 1 of 3, L2.` →
`stderr a non-terminal run already exists for this item` → `exit code=1`. Read at the source: `01`'s
verify ran three cycles under `95597ec1…` (`-0002`, `-0003`, `-0004`), the whole cap. Cycle-cap
exhaustion hands a milestone to its own plan's refine (`decideCycleCapExhaustion`,
`src/work/loop.mjs:1076`), and that mint walls on `-0004`, still `running` from the needs-input halt.
The `--dry-run` probe still answers `drive 01 verify` because it does not count the declaration's cycles.
A finding outside 130 (story shape, operator): after a `session-needs-input` halt, `--resume` should
resume the open session, not cap-hand-off into a mint that the same open run refuses.

### Run 2 — readings (scope `02`, authored on the test-bed for this story)

- `<scope>` = `02` (`02_milestone_stop-target`, authored 2026-09-23 on the test-bed: three independent
  one-function stories, `whisper` / `farewell` / `initials`, each refined with `@executable` tasks and
  `reads:`/`files:`). `aof work validate 02` → PASS. `aof work loop 02 --dry-run --json` →
  `act: drive 02/00 continue`, `next` answered from disk, `lastDeclaration: null`. Each story is at
  least one build drive, with gate ticks between drives: enough drives in flight and gaps for every leg.
  `01` is spent (above), and `00`'s stories exist only in a stale projection.
- T1 = `cd C:\Source\umami\aof-test-repo; aof work loop 02 --supervised` (fresh: a new `<L>`).
- `<L>` = `brief.loop.loopRunId` of the newest run under the ref T1's first `Driving` line names.
  `<path>` = `C:\Users\Umami\.aof\mesh\loop-stops\<L>.json`.

### Run 2 (2026-09-23T17:13Z) — the legs, read at the source

T1 (the operator's console, 18:13:06 local): `aof work loop 02 --supervised`.
- [x] `<log>` = `C:\Users\Umami\.aof\mesh\logs\loop-diag.02.2026-09-23T17-13-07-400Z.log`
  (`start pid=9848 … build=source 7a9ad6e+dirty argv=["work","loop","02","--supervised"]`)
- [x] `<L>` = `6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11`, from `02/00`'s
  `runs\node-7297\20260923T171308093Z-0000.json` (`state: running`)
- [x] `<path>` = `C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json`
- The fleet at 18:13:24 (`/api/mesh/status`, `localNodeId: "node-7297"`) carries exactly one loop on scope
  `02`: `{"loopRunId":"6015c8d5-…","workspaceId":"52294b307214c27d","scope":"02","level":"L2","cap":3,"phase":"continue","cycle":1,"ref":"02/00","runId":"20260923T171308093Z-0000","supervised":true,"stop":null}`.
  (Beside it, `01`'s needs-input verify `95597ec1…` and a `131` refine loop in the aof workspace, another session's.)

**leg 1 — the verb drains**
1. `2026-09-23T17:13:08.079Z stdout Driving 02/00 — continue, cycle 1 of 3, L2.` with no `Driven` after it.
2. T2 (the agent, cwd the test-bed):
   ```
   2026-09-23T18:13:30.0329003+01:00
   02 — stop requested (drain) for loop 6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11, live. C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json
   exit=0
   ```
   `<path>`, whole: `{"loopRunId":"6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11","scope":"02","workspaceId":"52294b307214c27d","level":1,"state":"requested","requestedAt":"2026-09-23T17:13:30.491Z","escalatedAt":null,"honouredAt":null,"cancelled":null,"by":{"node":"node-7297","pid":57384}}`
3. The drive ran to its own end, then the halt (`<log>`):
   ```
   2026-09-23T17:17:01.599Z driver {"phase":"stop-requested","pid":57440,"outcome":"done","failureReason":null}
   2026-09-23T17:17:02.310Z driver {"phase":"tree-terminated","pid":57440,"ok":true,"detail":"SUCCESS: The process with PID 57440 (child process of PID 9848) has been terminated."}
   2026-09-23T17:17:02.325Z driver {"phase":"pty-released","pid":57440}
   2026-09-23T17:17:02.396Z driver {"phase":"exit-confirmed","pid":57440,"outcome":"done","sessionId":"aebe1008-5bf4-4900-89ea-4c0e31bb7e8f"}
   2026-09-23T17:17:02.519Z stdout Driven 02/00 — continue (done).
   2026-09-23T17:17:02.520Z stdout 02 — halted on operator-interrupt at 02/00 (producer stop-request). Resume with: aof work loop 02 --resume Details: signal=stop-request; level=1; request=C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json; by=node-7297:57384.
   2026-09-23T17:17:07.403Z exit code=0
   ```
   The bracket here is the driver closing a session that had already ended `done` (its `outcome` is
   `done`, not `failed`/`cancelled`). A drain does not cancel: the build finished (`02/00` went `in-review`).
4. `02/00`'s `runs\node-7297\20260923T171308093Z-0000.json`: `"state": "done"`, `"outcome": "done"`,
   `"failureReason": null`, `"sessionId": "aebe1008-5bf4-4900-89ea-4c0e31bb7e8f"`, `brief.loop.loopRunId` `<L>`,
   `updatedAt 2026-09-23T17:17:02.433Z`, a `spend` envelope (`exitReason: "final_output"`) — never
   `running`. `<path>` at 18:17:15: `"state": "honoured"`, `"honouredAt": "2026-09-23T17:17:02.516Z"`,
   `"cancelled": null`, `level 1`, the rest unchanged.
5. T1 (18:17:07 local): `aof work loop 02 --resume` → `loop-diag.02.2026-09-23T17-24-00-076Z.log`:
   `2026-09-23T17:24:00.256Z stdout Cleared stop request for 6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11 (honoured, level 1) — resumed.`
   (exactly once), then `2026-09-23T17:24:00.669Z stdout Driving 02/00 — verify, cycle 1 of 3, L2.` The
   `Test-Path <path>` → `False` read was not taken: leg 2's first stop re-created the file 6 s later. The
   `Cleared` line is the clear, read from the loop's own log.
- [x] 1 · [x] 2 · [x] 3 · [x] 4 · [x] 5 — result: **pass**

**leg 2 — the verb cancels** (T2 = the agent's watcher, firing 5 s after the resumed `Driving` line)
1. `2026-09-23T17:24:00.669Z stdout Driving 02/00 — verify, cycle 1 of 3, L2.`, no `Driven` after it.
2. ```
   STOP1 2026-09-23T18:24:06,130930800+01:00
   02 — stop requested (drain) for loop 6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11, live. C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json
   exit=0
   STOP2 2026-09-23T18:24:09,826995000+01:00
   02 — stop requested (cancel) for loop 6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11, live. C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json
   exit=0
   ```
   `<path>` at 18:24:10.51: `{"loopRunId":"6015c8d5-…","scope":"02","workspaceId":"52294b307214c27d","level":2,"state":"requested","requestedAt":"2026-09-23T17:24:06.751Z","escalatedAt":"2026-09-23T17:24:10.455Z","honouredAt":null,"cancelled":null,"by":{"node":"node-7297","pid":3996}}`
3. From `<log>`, 10 ms after the escalation and ~1.4 s after the second answer:
   ```
   2026-09-23T17:24:10.465Z driver {"phase":"stop-requested","pid":56384,"outcome":"failed","failureReason":"cancelled"}
   2026-09-23T17:24:11.061Z driver {"phase":"tree-terminated","pid":56384,"ok":true,"detail":"SUCCESS: The process with PID 56384 (child process of PID 50900) has been terminated."}
   2026-09-23T17:24:11.071Z driver {"phase":"pty-released","pid":56384}
   2026-09-23T17:24:11.136Z driver {"phase":"exit-confirmed","pid":56384,"outcome":"failed","sessionId":"7a14d1eb-ae5e-4b29-81ab-a616633a4765"}
   2026-09-23T17:24:11.216Z stdout Driven 02/00 — verify (cancelled).
   2026-09-23T17:24:11.217Z stdout 02 — halted on operator-interrupt at 02/00 (producer stop-request). Resume with: aof work loop 02 --resume Details: signal=stop-request; level=2; request=C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json; by=node-7297:3996; cancelled=20260923T172400683Z-0001.
   2026-09-23T17:24:16.151Z exit code=0
   ```
4. `02/00`'s `runs\node-7297\20260923T172400683Z-0001.json`: `"state": "cancelled"`, `"outcome": "cancelled"`,
   `"failureReason": null`, `"sessionId": "7a14d1eb-ae5e-4b29-81ab-a616633a4765"` (the bracket's),
   `brief.loop.loopRunId` `<L>`, `phase verify`, `updatedAt 2026-09-23T17:24:11.145Z`.
5. `aof work run-status 02/00 --json` (18:24:27): `20260923T171308093Z-0000 done`, `20260923T172400683Z-0001
   cancelled`, no `running`. `<path>` after the halt: `"state": "honoured"`, `"honouredAt": "2026-09-23T17:24:11.213Z"`,
   `"cancelled": "20260923T172400683Z-0001"`, `level 2`.
- [x] 1 · [x] 2 · [x] 3 · [x] 4 · [x] 5 — result: **pass**

**leg 4 — no relaunch of a stopped loop** (straight after leg 2's halt at 17:24:11.217Z)
1. `aof mesh status --json --declarations` → `declarations.rows`, at +17 s (18:24:28.62), +30 s
   (18:24:41.65) and +60 s (18:25:11.90), each exactly:
   `[{"id":"95597ec1-3d50-4eb7-88ef-b136aff8dad7","label":"loop 01","argv":["work","loop","01","--level","L2","--resume"],"cwd":"C:\\Source\\umami\\aof-test-repo","scope":"01","level":"L2","cap":3}]`
   — no row with `id: "<L>"`. (The one row is `01`'s needs-input lineage, run 1's; not this leg's.)
2. PENDING (operator): the desktop's loop bar — `loop 02` pill `stopped` with no control, then gone.
3. `runs\node-7297\` for `02/00` at +60 s: `20260923T171308093Z-0000.json` (18:17:02) and
   `20260923T172400683Z-0001.json` (18:24:11) — nothing newer than the cancel. And no
   `loop-diag.02.*` log after `…17-24-00-076Z`: no relaunch.
4. T1 (18:24:16 local): `aof work loop 02 --resume` → `loop-diag.02.2026-09-23T17-31-09-317Z.log`:
   `2026-09-23T17:31:09.543Z stdout Cleared stop request for 6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11 (honoured, level 2) — resumed.`
   6.6 s later (`2026-09-23T18:31:16,178601500+01:00`) the declarations rows carry
   `{"id":"6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11","label":"loop 02","argv":["work","loop","02","--level","L2","--resume"],"cwd":"C:\\Source\\umami\\aof-test-repo","scope":"02","level":"L2","cap":3}`.
- [x] 1 · [ ] 2 (operator's visual, not reported) · [x] 3 · [x] 4 — result: **pass** on every leg read at the source

**leg 3 — first arming missed, and why (read at the source).** Leg 3's step 1 (and this procedure)
watch for `Driven <ref> — …` between drives. A running loop does not print that line there. Its
`Driven` lines come out together at the halt (run 1: all seven at 16:46:19.437–.441), so a watcher
keyed on it never fired. The loop drove on: `02/00` verify → `02/01` continue → `02/01` verify → `02/02`
continue. The gap's real signature in `<log>` is the driver's `exit-confirmed` line followed by the next
`Driving` line: 17:32:49.871 → 17:32:50.376 (0.505 s), 17:36:09.673 → 17:36:09.982 (0.309 s),
17:37:34.585 → 17:37:35.066 (0.481 s). A spawned `aof work loop 02 --stop` took ~0.62 s to land in leg 2
(STOP1 18:24:06.13 → `requestedAt` 17:24:06.751Z), longer than every gap. So leg 3's T2 is the CLI's own
entry, `run(argv)` from `src/cli.mjs` (what `bin/aof.mjs` calls), pre-loaded in a node process in the
test-bed with argv `["work","loop","02","--stop"]`: the same verb, minus the process start. It is
re-armed on the next `exit-confirmed`.

**leg 3 — second arming: the stop landed a hair early and answered `live`.** It fired 8 ms after
`2026-09-23T17:44:17.347Z driver {"phase":"exit-confirmed","pid":56912,"outcome":"done",…}` (`02/02` verify):
`STOP 2026-09-23T17:44:17.355Z` → `02 — stop requested (drain) for loop 6015c8d5-…, live. <path>` (exit 0),
`requestedAt 2026-09-23T17:44:17.368Z`. `02/02`'s `20260923T174155198Z-0001.json` was written `done` at
17:44:17.368Z, the same instant: the driver logs `exit-confirmed` BEFORE the store settles the run, so
the verb still read it `running`. The loop then halted at its next tick head with no further drive:
`2026-09-23T17:44:17.500Z stdout 02 — halted on operator-interrupt at 02/02 (producer stop-request). … level=1;
request=<path>; by=node-7297:53320.` → `exit code=0` (17:44:22.350Z), `<path>` `honoured` at 17:44:17.492Z,
`cancelled: null`, and no record newer than `-0001`. That is leg 3's step 2 signature, but not its
step 1 (`not live`, honoured at once). Per the leg's own rule the gap was missed and is re-run. The
third arming fires on the run record turning terminal. Scope `02` gained `03`/`04`/`05` (title case,
reverse name, word count) because its first three stories were spent.

**leg 3 — third arming: no gap to hit.** T1's `--resume` (`loop-diag.02.2026-09-23T18-24-25-169Z.log`, `Cleared
… (honoured, level 1)`) drove `02/03` continue, and the session ended `needs-input` at 18:25:41.943Z: it
refused to build a fourth copy of the name guard, which the test-bed's own `TD-03` forbids. The loop
halted on `session-needs-input`. That is a fixture problem, not a stop finding. The agent settled the
abandoned run `20260923T182426529Z-0000` `cancelled` (`aof work run-complete`) and rewrote `03`–`05` as
name-free helpers (`sum`, `isEven`, `clamp`), outside TD-03. `aof work validate 02` → PASS. Re-armed.

**leg 3 — a stop in the gap answers not live and still stops the next tick** (fourth arming, landed)
T1 (19:48:40 local): `aof work loop 02 --resume` → `loop-diag.02.2026-09-23T18-48-41-653Z.log` →
`2026-09-23T18:48:43.065Z stdout Driving 02/03 — continue, cycle 2 of 3, L2.` (No `Cleared` line: no request
stood; the previous halt was the needs-input one. The desktop's one ADR-004 §6 relaunch is
`…18-48-44-172Z.log`.)
1. `02/03`'s `20260923T184843083Z-0001.json` turned `done` (`updatedAt 2026-09-23T18:52:41.821Z`), after
   `2026-09-23T18:52:41.795Z driver {"phase":"exit-confirmed","pid":63420,"outcome":"done",…}`. T2 (the CLI's
   `run(["work","loop","02","--stop"])`, fired at `18:52:41.834Z`):
   ```
   02 — stop requested (drain) for loop 6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11, not live. C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json
   effects: drained 1 pending step(s) from the journal
   ```
   (exit 0, answered 18:52:41.944Z). `<path>` at once: `{"loopRunId":"6015c8d5-…","scope":"02","workspaceId":"52294b307214c27d","level":1,"state":"honoured","requestedAt":"2026-09-23T18:52:41.843Z","escalatedAt":null,"honouredAt":"2026-09-23T18:52:41.854Z","cancelled":null,"by":{"node":"node-7297","pid":61692}}`
   — `honoured` 11 ms after the request, `cancelled: null`.
2. No further `Driving`. The next tick head, 0.12 s after the settle:
   `2026-09-23T18:52:41.916Z stdout Driven 02/03 — continue (done).` ·
   `2026-09-23T18:52:41.917Z stdout 02 — halted on operator-interrupt at 02/03 (producer stop-request). Resume with: aof work loop 02 --resume Details: signal=stop-request; level=1; request=C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json; by=node-7297:61692.` ·
   `2026-09-23T18:52:46.811Z exit code=0`. The run records in scope `02` after the halt, against the listing
   taken while `-0001` ran: no new file (`NEW-RECORDS []`).
3. `2026-09-23T19:52:59.5315167+01:00` → `declarations.rows`:
   `[{"id":"95597ec1-3d50-4eb7-88ef-b136aff8dad7","label":"loop 01",…}]` — no `id: "<L>"`.
4. T1 (19:52:47 local): `aof work loop 02 --resume` → `loop-diag.02.2026-09-23T18-55-18-616Z.log`:
   `2026-09-23T18:55:18.872Z stdout Cleared stop request for 6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11 (honoured, level 1) — resumed.`
   then `2026-09-23T18:55:19.828Z stdout Driving 02/03 — verify, cycle 1 of 3, L2.` The recorder read `<path>` absent at 18:55:20.121Z.
- [x] 1 · [x] 2 · [x] 3 · [x] 4 — result: **pass**

**leg 5 — the fleet's button, first attempt (rung 1 pass; rung 2 not reached)** (T2 = a read-only recorder
polling `<path>` and `/api/mesh/status` every second; the clicks and the screen are the operator's)
1. The status body throughout: `"localNodeId":"node-7297"`, and that node's `presence.loops` carries
   `{"loopRunId":"6015c8d5-…","workspaceId":"52294b307214c27d","scope":"02","level":"L2","cap":3,"phase":"continue","cycle":1,"ref":"02/04","runId":"20260923T185704591Z-0000","supervised":true,"stop":null}`
   (18:57:09.703Z; the drive before it was `verify 02/03`). The operator's screenshot of this node's card
   (this machine's name, `node-7297`, "running 5 runs") shows three loop lines, each with a muted `Stop`:
   `loop 01 · verify 01 · cycle 3 of 3`, `loop 02 · continue 02/04 · cycle 1 …` and `loop 131 · refine 131/03 ·
   cycle 1 of 3`. The Mac's card (`node-9549`, "never seen", "idle") has no loop line.
2. The operator clicked `Stop` on `loop 02` during `02/04` verify (`Driving 02/04 — verify, cycle 1 of 3, L2.`
   at 19:02:04.496Z). `<path>` at 19:03:48.170Z:
   `{"loopRunId":"6015c8d5-…","scope":"02","workspaceId":"52294b307214c27d","level":1,"state":"requested","requestedAt":"2026-09-23T19:03:47.905Z","escalatedAt":null,"honouredAt":null,"cancelled":null,"by":{"node":"node-7297","pid":23508}}`.
   `by.pid 23508` is `"C:\Users\Umami\.aof\bin\aof.exe" mesh ui` (parent 42432, `aof-mesh-desktop`): the
   fleet route's own write. Within 2.4 s (19:03:50.286Z) the entry reads `"stop":"drain"`. The operator's
   second screenshot: `loop 02 · stopping · verify 02/…` with a red `Stop now`.
3. NOT REACHED: the drive finished on its own 18 s after the click, before `Stop now` was pressed:
   `2026-09-23T19:04:06.272Z driver {"phase":"stop-requested",…,"outcome":"done","failureReason":null}` … `exit-confirmed`
   → `stdout 02 — halted on operator-interrupt at 02/04 (producer stop-request). … level=1; request=<path>; by=node-7297:23508.`
   (19:04:07.353Z) → `exit code=0`. `<path>` `honoured` 19:04:07.349Z, `cancelled: null`. The fleet entry was
   gone at 19:04:10.091Z, 2.7 s after the halt, and the line left the card ("Ok it's gone now"). That is
   rung 1 read end to end. Rung 2 is re-run.
- [x] 1 · [x] 2 · [ ] 3 — result so far: rung 1 **pass**

**leg 5 — second attempt: both rungs** (T1 20:09:21 local, `aof work loop 02 --resume` →
`loop-diag.02.2026-09-23T19-09-22-981Z.log`: `Cleared … (honoured, level 1)` at 19:09:23.243Z, `Driving 02/05 —
continue, cycle 1 of 3, L2.` at 19:09:24.577Z. The fleet entry `phase continue, ref 02/05, runId
20260923T190924595Z-0000, stop null` was up at 19:09:25.948Z.)
2. `Stop` → `<path>` `level 1`, `requested`, `requestedAt 2026-09-23T19:09:49.322Z`, `by {node-7297, pid 23508}`
   (the fleet route, `aof.exe mesh ui`). Entry `"stop":"drain"` at 19:09:51.019Z. The operator: after the
   click, `Stop now` showed disabled (grey), then enabled.
3. `Stop now` → `<path>` at 19:11:16.589Z: `level 2`, `escalatedAt 2026-09-23T19:11:15.876Z`, same `by`. The bracket
   began 0.56 s later:
   ```
   2026-09-23T19:11:16.436Z driver {"phase":"stop-requested","pid":53404,"outcome":"failed","failureReason":"cancelled"}
   2026-09-23T19:11:17.239Z driver {"phase":"tree-terminated","pid":53404,"ok":true,"detail":"SUCCESS: The process with PID 53404 (child process of PID 57876) has been terminated."}
   2026-09-23T19:11:17.249Z driver {"phase":"pty-released","pid":53404}
   2026-09-23T19:11:17.311Z driver {"phase":"exit-confirmed","pid":53404,"outcome":"failed","sessionId":"91e323f5-d950-47e9-b385-b47d9ee9d4fc"}
   2026-09-23T19:11:17.436Z stdout Driven 02/05 — continue (cancelled).
   2026-09-23T19:11:17.437Z stdout 02 — halted on operator-interrupt at 02/05 (producer stop-request). Resume with: aof work loop 02 --resume Details: signal=stop-request; level=2; request=C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json; by=node-7297:23508; cancelled=20260923T190924595Z-0000.
   2026-09-23T19:11:22.321Z exit code=0
   ```
   `02/05`'s `runs\node-7297\20260923T190924595Z-0000.json`: `state cancelled`, `outcome cancelled`,
   `failureReason null`, `sessionId 91e323f5-d950-47e9-b385-b47d9ee9d4fc` (the bracket's), `updatedAt 19:11:17`.
   `<path>` `honoured` 19:11:17.434Z, `cancelled "20260923T190924595Z-0000"`. The fleet entry was gone at
   19:11:20.767Z, 3.3 s after the halt (inside 20 s), and the operator reported the line gone.
- [x] 1 · [x] 2 · [x] 3 — result: **pass**, with one reading: the status body never carried
  `"stop":"cancel"`. The loop halted 1.56 s after the escalation, inside the presence refresh (the
  recorder polls every 1 s and saw `drain` → absent). The `· cancelling ·` word is the fleet's own rung
  memory (130/03, keyed to the drive), and the operator did not report seeing it. Not a finding: the
  line's end state and every source read are the contract's. Also for the retro: the operator's first
  `Stop now` report (the button "went grey, then back to enabled") was the designed one-poll disable
  after `Stop`, and read as a failed click. The disabled state gives no cue that it is transient.

**leg 6 — the desktop's row: FINDING against 04 (ADR-004 §6); not passable as written.** T1 (20:15:15 local):
`aof work loop 02 --resume` → `loop-diag.02.2026-09-23T19-15-16-335Z.log` (`start pid=30820 … build=source
a297159+dirty`), `Cleared … (honoured, level 2)` at 19:15:16.603Z, `Driving 02/05 — continue, cycle 2 of 3, L2.`
at 19:15:17.930Z. The fleet entry was up at 19:15:21 (`runId 20260923T191517946Z-0001`, `stop null`). The desktop
window (operator's screenshot, ~19:16Z) shows the loop bar with `loop 02` pill `stopped` and **no control**,
`loop 01` pill `stopped`, and the footer notice `loop 02: duplicate-run`. Read at the source: the desktop's
controller for the row spawned its own relaunch, `loop-diag.02.2026-09-23T19-15-44-211Z.log` (`start pid=47688
… build=payload 292f5f0+dirty.20260923T152311 argv=["work","loop","02","--level","L2","--resume"]`) →
`Driving 02/05 — continue, cycle 3 of 3, L2.` → `stderr a non-terminal run already exists for this item` →
`exit code=1` (19:15:45.659Z). The row reports THAT child, which is dead, so it reads `stopped` and
(DESIGN §Surface 2) carries no control. The desktop never holds a `running` row for a loop started on a
console, and it cannot stop one. Leg 6's Given ("a drive in flight and the desktop's row `loop 01` at
`running`") is unreachable with a foreground loop, which is the only way the contract starts one. ADR-004 §6
reads "a foreground `--supervised` loop already yields a row the desktop starts a controller for — 126's
design, not a regression". Measured, that controller is a relaunch which walls on the foreground loop's
own run every time: here, at 17:13:14, 18:48:44 and 19:15:44, and in run 1's twelve-relaunch storm. Neither
step 1 nor step 2 was pressed. The agent drained the loop through the verb afterwards
(`2026-09-23T20:16:40.8172253+01:00` → `02 — stop requested (drain) for loop 6015c8d5-…, live.`, exit 0) so it
spends no further drives.
- [ ] 1 · [ ] 2 — result: **finding → 04** (and the 126 relaunch it rides). The remedy is a design call
  for the operator, story shape: either the desktop's controller ATTACHES to a live foreground declaration
  (adopts its row, spawns nothing, and its control writes the request through `aof work loop <scope> --stop`,
  so rung 1/2 work on a loop it did not spawn), or the leg is re-scoped to a desktop-launched loop. The
  second needs a way for the desktop to launch one, which does not exist today.
- **Routed: amendment, ratified by the operator (2026-09-23) as 130/ADR-007, "attach on duplicate-run".**
  Fixed in `app/desktop`. Core: a pure `attaches(id, presses, reason)` beside the unchanged
  `classify_exit`, plus cargo test `only_an_unpressed_declarations_duplicate_run_attaches` (core suite
  118/118). Shell (`supervisor.rs`): an unpressed declaration whose relaunch is refused `DuplicateRun`
  attaches. It reads `running`, its notice is cleared and the hold stays. Each press runs the `--stop`
  verb, with no grace and no kill rung. `cargo check` of the app crate is clean. The same pass re-pins
  FF-5307 for the run-store fix already committed in `51cfa6a`, which moved `src/run-store.mjs`'s digest
  (ADR-007 §5): `acd-loop-state-rides-the-run-record` and 130/03's `fleet-scope` leg now read the pin as
  moved only by 130/06's stated reason. Leg 6 is re-run after `install-local --desktop` and the operator's
  restart.

**leg 6 — re-run on ADR-007's build (2026-09-23T21:14Z)**
- Install, at the source: `node scripts/install-local.mjs --desktop` → `stamped BUILD_ID.json
  (874eef6+dirty.20260923T220812)`, `cargo build --release … Finished`, `placed aof-mesh-desktop.exe`.
  `aof.exe --version` → `0.1.0 (payload 874eef6+dirty.20260923T220812)`. The operator quit the app from
  its own UI and relaunched it: `aof-mesh-desktop` pid 20888 started 22:13:53 local, and the daemons'
  newest `daemon-started`: mesh-serve `2026-09-23T21:13:56.819Z … build payload 874eef6+dirty.20260923T220812`,
  mesh-ui `2026-09-23T21:13:55.483Z … build payload 874eef6+dirty.20260923T220812`.
- T1 (22:14:04 local): `aof work loop 02 --resume` → `loop-diag.02.2026-09-23T21-14-05-088Z.log`
  (`start pid=19656 … build=source 874eef6+dirty`), `Cleared … (honoured, level 1)`, then
  `2026-09-23T21:14:06.899Z stdout Driving 02/05 — verify, cycle 1 of 3, L2.`
- The attach, at the source: the desktop's one relaunch `loop-diag.02.2026-09-23T21-14-23-075Z.log`
  (`start pid=46176 … build=payload 874eef6+dirty.20260923T220812 argv [...,"--resume"]`) →
  `stderr a non-terminal run already exists for this item` → `exit code=1` (21:14:24.514Z). No further
  relaunch log was written for `02` (listing after 22:14:30 local: T1's log only). The operator saw the row
  reach the pressable state and pressed.
1. **Press 1** → `<path>` `level 1`, `state requested`, `requestedAt 2026-09-23T21:15:06.226Z`,
   `by {node-7297, pid 11912}`: NOT T1's pid 19656, the desktop's own `--stop` spawn. The fleet entry read
   `"stop":"drain"` at 21:15:07.305Z. The operator: the pill read `stopping` ("It's stopping…",
   "graceful stop is still in progress"). The drain was not waited out: the operator pressed again
   (below), so part 1's end, "the drive finishes, the halt reads `level=1`", was not observed from the
   desktop. That end state is the loop's alone, the same code whoever wrote the request, and is read at
   the source in leg 1 (verb) and leg 5's first attempt (fleet).
2. **Press 2** → `<path>` `level 2`, `escalatedAt 2026-09-23T21:17:36.714Z`, same `by` (pid 11912). The bracket
   and the halt, 0.6 s after the escalation, far inside 30 s:
   ```
   2026-09-23T21:17:37.301Z driver {"phase":"stop-requested","pid":65160,"outcome":"failed","failureReason":"cancelled"}
   2026-09-23T21:17:38.145Z driver {"phase":"tree-terminated","pid":65160,"ok":true,"detail":"SUCCESS: The process with PID 65160 (child process of PID 19656) has been terminated."}
   2026-09-23T21:17:38.155Z driver {"phase":"pty-released","pid":65160}
   2026-09-23T21:17:38.230Z driver {"phase":"exit-confirmed","pid":65160,"outcome":"failed","sessionId":"04805cfa-64fa-4a17-a504-260ce6adbf8c"}
   2026-09-23T21:17:38.372Z stdout Driven 02/05 — verify (cancelled).
   2026-09-23T21:17:38.373Z stdout 02 — halted on operator-interrupt at 02/05 (producer stop-request). Resume with: aof work loop 02 --resume Details: signal=stop-request; level=2; request=C:\Users\Umami\.aof\mesh\loop-stops\6015c8d5-d28d-4bd4-ab0e-ce12fb5eba11.json; by=node-7297:11912; cancelled=20260923T211406919Z-0002.
   2026-09-23T21:17:43.245Z exit code=0
   ```
   `02/05`'s `runs\node-7297\20260923T211406919Z-0002.json`: `state cancelled`, `outcome cancelled`,
   `failureReason null`, `sessionId 04805cfa-64fa-4a17-a504-260ce6adbf8c` (the bracket's). `<path>`
   `honoured` 21:17:38.369Z, `cancelled "20260923T211406919Z-0002"`. The fleet entry read `"stop":"cancel"` at
   21:17:38.411Z and was gone at 21:17:43.604Z. `<log>` ends with the halt line and `exit code=0`, so the
   `taskkill` fallback was NOT used (an attached row has no kill rung, ADR-007 §2).
- [~] 1 (rung 1 landed from the desktop; its drain end read in legs 1 and 5, not here) · [x] 2 — result:
  **pass** on ADR-007's build.

### Run 2 — result, final

Legs 1–5 pass at the source (above). Leg 6 passes on ADR-007's build: the desktop attached to a
console-started loop, its presses wrote the request through its own `--stop` spawn (drain, then cancel),
the loop's own bracket cancelled the session, and no fallback kill ran. The remote leg is not exercised
(no Mac loop). The findings routed: ADR-007 (fixed, ratified); the retry carry (fixed, `51cfa6a`);
handed back as story shapes, outside 130: `--resume` after a `session-needs-input` halt walls on the open
run it left, the operator-gated story put in a wave, the resume sweep offering a finished lineage, and the
rollback that moved `130/SPEC.md` back to `not-started`.

**a remote loop is refused by name — not exercised.** No loop was started on the Mac's console (its card:
`node-9549`, "never seen", "idle"). Nothing was asked of the Mac.

### Run 2 — result

Every leg driven from the verb and the fleet PASSES at the source: leg 1 (drain), leg 2 (cancel: the bracket
10 ms after escalation, record `cancelled` + `failureReason null` + the bracket's `sessionId`), leg 3 (a gap
stop answers `not live`, honoured at once, halts the next tick with no new record), leg 4 (no relaunch
across 60 s and more; the row returns within 7 s of `--resume`), leg 5 (both fleet rungs through the `mesh ui`
route). **Leg 6 is a finding against 04**, so the SPEC outcome's desktop clause is not met. The remote leg
is not exercised. 130/06 stays `in-progress`: the milestone cannot be accepted on leg 6 until 04's row can
reach a foreground loop, or the operator re-scopes the leg.
- Two readings for the register, both routed (story shape, operator), neither a leg's pass condition:
  (a) the card renders `loop 01 · verify 01 · cycle 3 of 3` with a live `Stop` although that loop ended at
  16:46:24Z. Its needs-input verify run `20260923T164459644Z-0004` is still `running`, and presence reads
  a loop as live off its latest running record. (b) the `loop 02` line truncates at `cycle 1 …` on the
  card's width. DESIGN §Surface 1 gives the line no overflow rule, the same class as 130/04's desktop-bar
  note in `## Notes`.
- Note, not a finding: the `effects: drained 1 pending step(s) from the journal` line is the verb's process
  retrying an effect a prior command had journalled. It is the effects journal's own output, not the stop's.

For the retro (story shape, operator): a stop in the gap cannot
be aimed by a human at a sub-second window, and the loop gives no visible signal of one. The contract's
leg 3 is an agent-timed observation, not an operator one.

*Beside leg 1, read at the source.* The desktop ran ONE relaunch of `02` while T1 was live:
`loop-diag.02.2026-09-23T17-13-14-425Z.log` (pid 43352, `build=payload 292f5f0+dirty.20260923T152311`,
`argv ["work","loop","02","--level","L2","--resume"]`) → `Driving 02/00 — continue, cycle 2 of 3, L2.` →
`stderr a non-terminal run already exists for this item` → `exit code=1`, 7 s after T1's start, writing
nothing. That is ADR-004 §6's row for a foreground `--supervised` loop. After the drain's halt
(17:17:02Z), no `loop-diag.02.*` log was written through 18:18 local, i.e. two declarations ticks and
more. The honoured mark kept the stopped loop from being relaunched (leg 4's signature, here on a drain).

### leg 1 — the verb drains, the run settles as it ended, and resume clears — PENDING (operator)

*verifies →* `Scenario: leg 1 — the verb drains, the run settles as it ended, and resume clears`
(ADR-002 §3f–§6; ADR-003 §3, §5, §6).

1. T1 shows `Driving <ref> — <phase>, cycle <n> of <cap>, L2.` with no `Driven` after it. Paste the line.
2. T2: `Get-Date -Format o; aof work loop 01 --stop; $LASTEXITCODE` → `01 — stop requested (drain) for
   loop <L>, live. <path>` and `0`. Paste both. `Get-Content <path>` → `level: 1`, `state: "requested"`,
   `escalatedAt: null`, `honouredAt: null`, `cancelled: null`, `by: { node: "node-7297", pid: <T2's aof pid> }`.
   Paste whole.
3. After the in-flight drive finishes, paste from `<log>` with their stamps: `stdout Driven <ref> — <phase>
   (<outcome>).` · `stdout 01 — halted on operator-interrupt at <ref> (producer stop-request). Resume with:
   aof work loop 01 --resume Details: signal=stop-request; level=1; request=<path>; by=node-7297:<pid>.` ·
   `exit code=0`. (`Select-String -Path <log> -Pattern "Driven |halted on|exit code" | Select-Object -Last 3`)
4. Paste whole the newest `runs\node-7297\*.json` under `<ref>`: `state` `done` or `failed`, never
   `running`. A `running` record after the halt is a finding against 02, not a re-try. Paste `<path>`
   again: `state: "honoured"`, `honouredAt` set, `cancelled: null`.
5. T1: `aof work loop 01 --resume` → paste `Cleared stop request for <L> (honoured, level 1) — resumed.`
   (exactly once). T2: `Get-Date -Format o; Test-Path <path>` → `False`. Then paste T1's new `Driving …` line.
- [ ] 1 · [ ] 2 · [ ] 3 · [ ] 4 · [ ] 5 — result: _(pass / finding → story NN)_

### leg 2 — the verb cancels, the bracket closes the session, and the record reads cancelled — PENDING (operator)

*verifies →* `Scenario: leg 2 — the verb cancels, the bracket closes the session, and the record reads
cancelled` (ADR-001 §3; ADR-003 §1, §4, §5).

1. T1 in a drive (`Driving <ref> — …`, no `Driven` after it). Paste the line.
2. T2, twice: `Get-Date -Format o; aof work loop 01 --stop`. The first answer reads `(drain) … live`,
   the second `01 — stop requested (cancel) for loop <L>, live. <path>`. Paste both with their instants.
   `Get-Content <path>` → `level: 2`, `escalatedAt` set. Paste whole.
3. Within 10 s of the second answer, paste from `<log>` in order with their stamps:
   `driver {"phase":"stop-requested","pid":<pid>,"outcome":"failed","failureReason":"cancelled"}` ·
   `driver {"phase":"tree-terminated","pid":<pid>,"ok":true,…}` · `driver {"phase":"pty-released","pid":<pid>}` ·
   `driver {"phase":"exit-confirmed","pid":<pid>,…,"sessionId":"<sessionId>"}` ·
   `stdout Driven <ref> — <phase> (cancelled).` · the halt line with `level=2; request=<path>;
   by=node-7297:<pid>; cancelled=<runId>.` · `exit code=0`.
   (`Select-String -Path <log> -Pattern "driver |Driven |halted on|exit code" | Select-Object -Last 7`)
4. `Get-Content <ref folder>\runs\node-7297\<runId>.json` (the halt's `cancelled=<runId>`) →
   `"state": "cancelled"`, `"failureReason": null`, `"sessionId": "<sessionId>"`, the bracket's. Paste whole.
5. T2: `aof work run-status <ref> --json` → no run with `"state": "running"`. `Get-Content <path>` →
   `state: "honoured"`, `cancelled: "<runId>"`. Paste both.
- [ ] 1 · [ ] 2 · [ ] 3 · [ ] 4 · [ ] 5 — result: _(…)_

### leg 4 — the desktop does not relaunch a stopped loop, and shows the row's end — PENDING (operator)

*verifies →* `Scenario: leg 4 — the desktop does not relaunch a stopped loop, and shows the row's end`
(ADR-004 §4a–§4b, §5; ADR-003 §6). Runs straight after leg 2's halt, before any resume.

1. T2 at 0 s, 30 s and 60 s after the halt line's stamp: `Get-Date -Format o;
   (aof mesh status --json --declarations | ConvertFrom-Json).declarations.rows | ConvertTo-Json -Depth 5`.
   No array carries a row with `id: "<L>"`. Paste the three arrays with their instants.
2. The desktop's loop bar shows `loop 01` with the pill `stopped` and no control, then the row and the
   bar are gone. Note the instant of each state.
3. T2: `Get-ChildItem <ref folder>\runs\node-7297\`. Paste it: no file newer than the cancel's `<runId>`.
   A newer file inside the two ticks is a finding against 04 (the desktop relaunched it).
4. T1: `aof work loop 01 --resume` → paste `Cleared stop request for <L> (honoured, level 2) — resumed.`
   Within 30 s, the same `--declarations` command in T2 → a row with `id: "<L>"`, `label: "loop 01"`. Paste it.
- [ ] 1 · [ ] 2 · [ ] 3 · [ ] 4 — result: _(…)_

### leg 3 — a stop in the between-drives gap answers not live and still stops the next tick — PENDING (operator)

*verifies →* `Scenario: leg 3 — a stop in the between-drives gap answers not live and still stops the
next tick` (ADR-002 §3f, §6; ADR-004 §4b).

1. After leg 4's resume, watch T1 for `Driven <ref> — <phase> (<outcome>).` with no `Driving …` after it
   (a gate step, or the tick between drives). In that gap, T2: `Get-Date -Format o; aof work loop 01 --stop`
   → `01 — stop requested (drain) for loop <L>, not live. <path>`. `Get-Content <path>` → `state: "honoured"`
   at once, `honouredAt` set, `cancelled: null`. Paste the answer and the file. If the answer read `live.`
   the gap was missed: paste T1's `Driving …` instant beside it and re-run at the next gap. Never a hand kill.
2. Within 2 s of the next tick head, T1 prints no further `Driving …`. `<log>` shows the halt line with
   `level=1; request=<path>; by=node-7297:<pid>.` then `exit code=0`. Paste both, and the listing of
   `runs\node-7297\` showing no new record.
3. T2: `Get-Date -Format o;` then the `--declarations` command → `declarations.rows` with no `id: "<L>"`. Paste.
4. T1: `aof work loop 01 --resume` (leg 5's Given) → paste the `Cleared stop request …` line.
- [ ] 1 · [ ] 2 · [ ] 3 · [ ] 4 — result: _(…)_

### leg 5 — the fleet's button walks the two rungs — PENDING (operator)

*verifies →* `Scenario: leg 5 — the fleet's button walks the two rungs` (ADR-005 §1–§5; DESIGN §Surface 1).

1. T1 in a drive. T2: `Get-Date -Format o; curl.exe -s http://127.0.0.1:4181/api/mesh/status`. Paste the
   body: `localNodeId` `"node-7297"`, and that node's `presence.loops[0]` is the eleven-key entry with
   `loopRunId: "<L>"`, `stop: null`. Describe the cards: this node's current-work region shows
   `loop 01 · <phase> <ref> · cycle <n> of <cap>` with a `Stop` button. The Mac's card (`node-9549`)
   shows any loop line of its own with no button.
2. Click `Stop` (note the instant). The line reads `loop 01 · stopping · …` and the button `Stop now`
   (destructive), disabled for one poll then enabled. `Get-Content <path>` → `level: 1`. Within 20 s the
   status body's `loops[0].stop` reads `"drain"`. Paste the file and the entry.
3. Click `Stop now` (note the instant). The line reads `· cancelling ·` with no button. `<log>` shows leg
   2's bracket and halt with `level=2` and `cancelled=<runId>`. `runs\node-7297\<runId>.json` reads
   `"state": "cancelled"`. Within 20 s the line is gone, the body's `presence` carries no `loops`, and
   `running N runs` decrements. Paste the record and the body.
- [ ] 1 · [ ] 2 · [ ] 3 — result: _(…)_

### leg 6 — the desktop's row walks the ladder without the fallback — PENDING (operator)

*verifies →* `Scenario: leg 6 — the desktop's row walks the ladder without the fallback` (ADR-004 §2–§3;
RULING 3).

1. T1: `aof work loop 01 --resume`, with a drive in flight and the desktop's row `loop 01` at `running`.
   Press the row's stop control once (note the instant). The pill reads `stopping`. `Get-Content <path>`
   → `level: 1`, with `by.pid` NOT T1's pid (it is the desktop's spawned `aof`). After the drive, `<log>`
   shows leg 1's halt with `level=1` then `exit code=0`. The pill reads `stopped` with no control, and
   the row is gone after the next declarations tick. Paste the file, the halt and the instants.
2. T1: `aof work loop 01 --resume`, with a drive in flight. Press the control twice (note both instants).
   `Get-Content <path>` → `level: 2`. `<log>` shows the bracket, `stdout Driven <ref> — <phase> (cancelled).`,
   the halt with `level=2; … cancelled=<runId>` and `exit code=0`, stamped inside 30 s of the second
   press. `runs\node-7297\<runId>.json` reads `"state": "cancelled"`. A `<log>` ending with no halt line
   and no `exit code=` line is the `taskkill` fallback: a finding against 04.
- [ ] 1 · [ ] 2 — result: _(…)_

### a remote loop is refused by name — PENDING (operator; recorded as not exercised when no Mac loop runs)

*verifies →* `Scenario: a remote loop is refused by name` (ADR-006 §1; ADR-005 §5).

1. A loop the OPERATOR started on the Mac's own console, in a workspace this checkout is a member of.
2. T2: `Get-Date -Format o; aof work loop <its scope> --stop; $LASTEXITCODE` against that workspace →
   non-zero. Stderr names `loop-stop-not-local`, `node-9549`, `node-7297` and "stop it on node-9549's
   own console", and `Get-ChildItem ~\.aof\mesh\loop-stops\` gains no file. Paste stderr and the listing.
3. The fleet renders that loop's line on the Mac's card with no button and a `title` ending
   `· remote — stop from node-9549's own console` (`ui/src/fleet/scope.mjs` titles it by `nodeId`). Paste the title as rendered.
- [ ] not exercised (no Mac loop) · [ ] 1 · [ ] 2 · [ ] 3 — result: _(…)_

### every observation is in STATE.md — PENDING until the legs above are filled

*verifies →* `Scenario: every observation is in STATE.md`. Each leg above carries its `verifies →`
pointer and its paste slots. A leg's result line names pass, or the finding: unnumbered, routed to the
owning story per `Scenario Outline: a failure signature is a finding against the owning story, never a
re-try`, with the loop left as it is until the fix lands.

## Verification

<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
