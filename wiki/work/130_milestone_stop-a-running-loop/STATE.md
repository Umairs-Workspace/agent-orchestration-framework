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
- [ ] 05 · the-register — not-started (depends on 02, 03, 04)
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

## Verification

<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
