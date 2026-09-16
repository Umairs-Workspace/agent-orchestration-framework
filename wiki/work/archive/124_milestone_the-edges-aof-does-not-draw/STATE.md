---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 124 · The edges aof does not draw — State

## Progress

- [x] Framed 2026-09-07.
- [x] Refined 2026-09-07 — premises grounded, seven ADRs recorded, **three** stories drawn (the
      framing anticipated four). Contracts authored per story.
- [x] Build — `aof:continue 124 --solo` 2026-09-08. All three stories built, gated and reviewed.
- [x] Verify — `aof:verify 124` 2026-09-08. **`124/00`, `124/01`, `124/02` accepted** on their own
      lanes (114/0, 217/0, 23/0), validate PASS, every declared control resolving, all five red probes
      observed (`VERIFICATION.md`). `OUTCOME.md` and `RETROSPECTIVE.md` authored for the milestone and
      each story; lessons folded into memory (`aof work memory ingest`, 2,243 records).
- [x] **Accepted 2026-09-08** on a green whole-tree regression gate at `cb3c2cdf`, run in a detached
      worktree (this checkout carries another lane's untracked 126 folder). The gate took two runs:
      the first was red on two real defects the story lanes could not see (`F-15`, `F-16`) plus 31
      contention cases (`F-17`); both defects repaired, the second run green. Five reds outside every
      124 lane were repaired on the way to the door (`F-01`, `F-03`, `F-04`, `F-15`, `F-16`) — all in
      `VERIFICATION.md`. Branch `milestone-124-the-edges-aof-does-not-draw`, not yet pushed.

## Notes & decisions in flight

**Compacted at accept (2026-09-08).** The framing and refine narratives that lived here have
graduated: every durable decision is an ADR in `ARCHITECTURE.md` (ADR-001 the denominator, ADR-002
the class ratchet, ADR-003 the one home, ADR-004 the dropped SCOPE line with its reopening command,
ADR-005 the plan hand-off, ADR-006 the dead engine cap ledgered as `TECH_DEBT.md` item 91, ADR-007
the shatter recall), and every measurement carries its command there. Nothing remains in flight.

**Framing candidates rejected, kept so they are not re-proposed:** an alias/canonicalisation table
(aof's items carry canonical ids already); land-nodes-before-edges (aof materialises no node set);
frequency×reversibility task selection (aof does not choose its own tasks); an always-loaded
`CONSTRAINTS.md` (aof's memory is queried recall keyed by domain — a real difference, but `CLAUDE.md`
and the bundle briefs already occupy the always-loaded tier). The two candidates deferred at framing
are recorded with their reasons in `SPEC.md` `## Scope`.

**What the accept changed outside this milestone's write set, on the record:** FF-11903's citation
sweep now skips an item's `runs/` and `observability/` subtrees and its ceiling fell 65 → 47
(`F-01` — the sweep was reading its own persisted failure text and could never fall); the ledger's
stale citation of the moved debt module was repaired. Both are in `VERIFICATION.md` with the
measurement, and both are the operator's to revert if the ruling goes the other way.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — per story, on its own lane; see `VERIFICATION.md` `## Verification evidence`
- [x] Fitness functions green — FF-12401..FF-12405, five of five, red probes recorded in
      `VERIFICATION.md` `## Fitness functions`
- [x] `@manual` — none exists in this milestone (every scenario is `@executable`); no `UAT.md`, no
      human lane
- [x] Whole-tree regression gate — GREEN at `cb3c2cdf` (`REGRESSION.md`, second row; the first row is
      the red run whose two real defects are `F-15`/`F-16`)

## Feedback (for retro)

<!-- The twelve raw notes captured here during refine and build have GRADUATED and were archived at
     accept: their lessons are R1–R7 in this folder's `RETROSPECTIVE.md` and R1–R4 in each story's,
     and every defect or gap they named is a numbered finding (`F-01`..`F-14`) in `VERIFICATION.md`.
     The two QA notes raised at refine are `F-08` and `F-09`. -->
