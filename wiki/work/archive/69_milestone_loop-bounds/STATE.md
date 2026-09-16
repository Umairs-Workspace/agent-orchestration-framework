---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.

  COMPACTED AT THE CLOSE, 2026-08-24 (`aof:verify 69`). The blow-by-blow of seven verify passes,
  twenty-two findings and two fix waves is archived rather than carried: the durable decisions
  graduated into `ARCHITECTURE.md`'s ADRs, the delivered state into `OUTCOME.md`, the open
  conditions into `OUTCOME.md` `## Gaps`, the evidence into `VERIFICATION.md`, and the lessons into
  `RETROSPECTIVE.md` R1-R12 and thence into memory via `aof work memory ingest`. What remains here
  is the shape of the milestone and the pointers to where each thing now lives.
-->
# 69 · Loop bounds — State

## Progress

**Accepted 2026-08-24.** All seven stories `done`; milestone `done`.

Scheduled 2026-08-16 from `PRD-acd-loop-performance.md` and `RESEARCH-agent-loop-economics.md`.
Refined 2026-08-21 into six stories — 16 task features, 104 `@executable` and 4 `@manual`
scenarios, seven ADRs, eleven declared fitness functions. A seventh story, **69/06**, was added at
verify when F-69-V7 found 69/03's progress ledger delivered as a leaf with zero production
importers — the milestone's own objective (*"the heartbeat is a producer nobody calls"*) reproduced
in a story written to end it.

**The close took seven `aof:verify` passes and one withdrawn acceptance.** The milestone was
accepted once prematurely, on 2026-08-23, because the production-consumer audit ran AFTER the
status transitions rather than before them; it was returned to `in-progress` by a deliberate hand
edit, there being no reopen door (R9). Two further milestone-gate passes declined on blockers the
scoped story lanes structurally could not see, and the final pass accepted on a clean committed
tree with the full suite carrying nothing of 69's.

**The accept evidence** — `PASS=6777 FAIL=45` over the whole registered array, zero of the 45
attributable to this milestone; validate `[]`; doctor healthy with no `control-unresolved` at
either severity; eleven fitness controls plus their planted-defect self-checks green; the one
`@manual` lane executed rather than inspected. It is recorded in full in `VERIFICATION.md`.

## What this milestone decided

The durable decisions live in `ARCHITECTURE.md` (ADR-001..ADR-007, plus the 2026-08-24 amendment
raising the session-driver reach ADR-015 §5 governs). Four are worth keeping visible here because
each overturned a premise the SPEC was written on, and each was settled by measurement:

- **The in-process caps do not exist on this path.** Measured on `claude 2.1.233`: `--max-turns` is
  absent from `--help` entirely, and `--max-budget-usd` works only with `--print`, which a shipped
  fitness function forbids in the worker launch on evidence that a `-p` turn cannot pause to ask a
  human. The out-of-process wall-clock kill is therefore the whole enforcement story, not a
  fallback — ADR-004, FF-6905.
- **There was no lease surface to extend.** The SPEC asked for "a mesh-wide lease keyed in the
  store"; `src/mesh-lease.mjs` does not exist, m26's leasing having been deleted in m34's
  "global mesh only" correction. The bound is a COUNT over rows and lanes that already exist —
  ADR-006, and FF-6908 freezes `src/run-store.mjs` by SHA-256 to keep it that way.
- **The local slot is the git LANE**, counted before one is materialised, with no occupancy fact
  persisted outside git's own worktree list — ADR-006's 2026-08-22 amendment, FF-6910/FF-6911,
  landed after independent review rejected the first answer.
- **The park rides the durable outbox**, published once after a confirmed exit — ADR-007's
  2026-08-22 amendment, FF-6909. This is the change that surfaced F-69-V20 in milestone 38's
  terminal-view contract, which asserted the fire-once mechanism the amendment replaced.

## Still open

Carried forward as `OUTCOME.md` `## Gaps`, each with its discharge condition, rather than
duplicated here: `scheduleToStart`'s 10-minute value has no measurement behind it; escalation is
surfaced-and-preserved rather than delivered to anyone, the notification ladder being explicitly out
of scope; the start-to-close value wants one measured milestone under 68's telemetry before it is
treated as settled; and a declared ceiling's reader is proved to exist but not proved reachable from
a production entry point.

One conflict is ledgered rather than resolved, and is **not** this milestone's to close: FF-6904
requires every bundled hook body to derive nothing and exit 0 on every path, while m42's
`acd-no-new-silent-catch` requires every catch to emit a coded event through a `src/` sink the hook
is forbidden to import. One of the two must admit the other's case in its own words — m42's, on the
evidence, since FF-6904 encodes the harder constraint (R12).

## Verification

- [x] `@executable` suite green
- [x] Fitness functions green — eleven declared, eleven landed, every red probe recorded
- [x] `@manual` signed off — 69/01 task 02, executed rather than inspected, 4/4

No `@uat` scenario and no `DESIGN.md` exist anywhere in this milestone, so no human acceptance step
and no design-conformance step applied. That is a measured absence, not a skipped gate.

## Feedback (for retro)

**Archived 2026-08-24 at the close.** Every note here graduated into `RETROSPECTIVE.md` as R1-R12
and is now recallable through `aof work memory ingest` — the headline being **R1**, that a control
which freezes a SET is making a claim about the future and nothing dates it, which is what five of
this milestone's seven blockers turned out to be. The raw notes are recoverable from this file's
git history; they are not carried here, because a lesson that has graduated and is still restated in
its source is a second home for one fact.
