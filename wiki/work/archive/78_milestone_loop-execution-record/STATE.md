---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). This is the running NARRATIVE.

  COMPACTED at accept, 2026-09-04 (`aof:verify 78`). The blow-by-blow, the refine decisions and the
  running retro feedback have all GRADUATED into the durable records named below and are archived
  here rather than duplicated: a second copy is a second thing to keep in step.
-->
# 78 · The loop execution record — State

## Progress

**CLOSED 2026-09-04 — `done`.** All four stories accepted (`00`, `01`, `02`, `03`), all ten declared
fitness functions landed, green and red-probed, `aof work validate 78` **PASS**, and `aof work doctor
78` reporting no `control-unresolved` finding at either severity.

The arc, in one line each:

- **Refined 2026-09-03** (`aof:refine 78 --autonomous --solo`) — ten ADRs, a ten-entry fitness
  register, four stories, nine task contracts. Doc-producing only.
- **78/00 and 78/01** — the pure projection and the pure renderer; FF-7801, FF-7802, FF-7806 green.
- **78/02** — `work:loop-record` registered and reachable as `aof work loop-record <ref>`; FF-7803,
  FF-7804, FF-7805, FF-7807, FF-7810 green. Two review Blockers fixed in round one; two findings in
  files this story does not own promoted to **chores 100 and 101**.
- **78/03** — the frozen sign-off block and a `warn`-only doctor lane; FF-7808, FF-7809 green. One
  review Blocker fixed in round one (an unclearable staleness finding — now R5).
- **Accepted 2026-09-04** (`aof:verify 78`) — 172/172 green over the milestone's own 17 files after
  every red probe was reverted; 24 probes in total, each restore confirmed byte-identical by sha256.

**Where everything went.** What the milestone now delivers, and the gaps it declared: `OUTCOME.md`.
The evidence, the ten red probes and the eleven findings: `VERIFICATION.md`. The seven carryable
lessons (R1–R7): `RETROSPECTIVE.md`. The design decisions: `ARCHITECTURE.md` ADR-001 … ADR-010.

## Decisions taken at refine

**Archived 2026-09-04 — graduated in full into `ARCHITECTURE.md`.** Every decision recorded here at
refine is now an ADR in the sibling document, which is the durable home and the one a later reader
should cite: the record's home and name (ADR-001, ADR-009), the read-modify-write and idempotence
discipline (ADR-002, ADR-010), the projection and its gap classes (ADR-003 … ADR-005), the additive
renderer (ADR-006), the no-gate ruling (ADR-007), and the withdrawal of the board-reachability scope
item in favour of chore 64's `BOARD_DEFERRED` carve-out (ADR-008).

The one measurement worth keeping in the narrative, because it is what the milestone was built
against and it has not moved: **of 61 run records under `wiki/work`, 0 carry `brief.loop`** — and the
sharper fact found at build, that the declaration 53 mints carries no loop id at all, so the number
would stay 0 even once the loop shell is driven. Carried forward as `OUTCOME.md`'s first gap and as
`@finding-F-78-A`.

## Notes & decisions in flight

**Archived 2026-09-04 — nothing is in flight.** Both open questions this section carried were
resolved at refine and are ADRs now: *"new document, or a section in `VERIFICATION.md`?"* → a new
`EXECUTION.md` (ADR-001); *"should an unsigned record block accept?"* → no, report at `warn` and gate
nothing (ADR-007). The inherited constraints it listed are asserted by FF-7802, FF-7807 and FF-7810
rather than remembered. The findings it routed became chores **100** and **101**.

## Feedback (for retro)

**Archived 2026-09-04 — graduated into `RETROSPECTIVE.md` as R1–R7.** The running notes taken while
building 78/00, 78/02 and 78/03 have been triaged and distilled; the lessons live there, referenced
by the findings they came from rather than restated. Nothing is dropped: each note is either a lesson
in `RETROSPECTIVE.md`, a finding in `VERIFICATION.md`, a gap in `OUTCOME.md`, or a chore (100, 101).

## Verification

- [x] `@executable` suite green — 172/172 over the milestone's 17 files, 0 failures, under
      `AOF_GLOBAL_HOME` isolation, on the restored tree. The repository-wide suite was **not** run
      here (`global-work-propagation` binds `:4182`, held by the live control daemon on this machine);
      that limit is stated in `VERIFICATION.md` rather than papered over.
- [x] Fitness functions green — all ten, each with a red probe recorded in `VERIFICATION.md`. One
      probe did not go red and is recorded as `@finding-F-78-H` rather than replaced.
- [x] `@manual` signed off — **not applicable, and that is a fact rather than an omission.** All nine
      task features across the four stories are `@executable`; no `@manual` and no `@uat` scenario
      exists anywhere in this milestone, so no agent-run lane and no human lane was opened and there
      is no `UAT.md`. The milestone carries no `DESIGN.md` and no `work.ui.baseUrl` is configured, so
      the design-conformance step's renderability precondition is not reached either.
