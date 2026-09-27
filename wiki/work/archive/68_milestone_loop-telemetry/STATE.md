---
doc: state
updated: 2026-08-22
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.

  COMPACTED 2026-08-22 at the milestone accept (fifth `aof:verify` pass). What was here has
  graduated rather than been deleted:
    - the nine durable decisions      → `ARCHITECTURE.md` ADR-001…ADR-009
    - the fourteen process lessons    → `RETROSPECTIVE.md` R1…R14
    - the per-story delivery detail   → each story's `OUTCOME.md`
    - the evidence, probes + findings → `VERIFICATION.md`
    - what the milestone now IS       → `OUTCOME.md`
  The blow-by-blow build narrative and the `## Feedback (for retro)` running notes are archived;
  their content lives in the four documents above. Only the closure record remains below.
-->
# 68 · Loop telemetry — State

## Progress

**CLOSED 2026-08-22 — milestone ACCEPTED** at the fifth `aof:verify` pass. Refined 2026-08-20 into
six stories; all six built, reviewed and accepted; three blockers raised and all three closed.

- [x] **68/00** `spend-bearing-run-record` — accepted 2026-08-21 (first pass).
- [x] **68/01** `attribution-at-spawn` — accepted 2026-08-21 (second pass, after F-04); its
      outstanding blocker F-09 closed 2026-08-22 (fifth pass, ADR-009).
- [x] **68/02** `spend-ingest-at-settle` — accepted 2026-08-21 (second pass).
- [x] **68/03** `attribution-by-join` — accepted 2026-08-21 (fourth pass, after F-07).
- [x] **68/04** `story-and-phase-scoped-observe` — accepted 2026-08-21 (first pass).
- [x] **68/05** `append-only-snapshots` — accepted 2026-08-21 (first pass).

**It took five verify passes, and the reason is the milestone's own lesson.** Every one of the three
blockers was found by leaving the suite — F-04 by re-running a foreign pin the story had edited,
F-05/F-06 by probing that fix, F-07 by driving the classifier over the real corpus, F-09 by the
full-repo gate sweep. None was found by the lanes the stories shipped green.

## Decisions

All nine graduated to [`ARCHITECTURE.md`](ARCHITECTURE.md) and are cited from there, not restated
here: the single appended `spend` key (ADR-001), `phase` read from `brief.loop` rather than minted
(ADR-002), mutually-exclusive writer-enforced token buckets (ADR-003), cost stamped once with
provenance (ADR-004), attribution at spawn with no OTLP receiver (ADR-005), the miner repaired-and-
demoted with its toolchain classifier retired (ADR-006), append-only snapshots (ADR-007), *68
records and does not act* (ADR-008), and the repair decision that closed F-09 — the run fact reached
through the transition seam, paid for in two amended milestone-53 declarations (ADR-009).

## Verification

- [x] `@executable` — milestone 68's complete lane set **252/252 green**, run with the box otherwise
      idle. Per-story scoped lanes all green at their accepts (see `VERIFICATION.md`).
- [x] Fitness functions — **eight of eight** (FF-6801…FF-6808), each resolving, registered, and
      carrying a recorded red probe.
- [x] Full-repo milestone gate sweep — 6,154 ran · 6,102 pass · 52 fail · 6 skipped; all 52 triaged
      against `main`: 50 pre-existing/environmental, 2 replica artifacts, **0 attributable to 68**.
- [x] `aof work validate 68` **PASS**; `aof work doctor 68` reports **no `control-unresolved` at
      either severity**.
- [ ] `@manual` / `@uat` — **none exists.** Every task feature in this milestone is tagged
      `@executable` alone and no story has a UI surface, so there is no `@manual`, no `@uat`, no
      design-conformance lane and no `UAT.md`. Their absence is the information.

## Carried follow-ups

Open non-blockers and questions that outlive this milestone. The findings themselves stay in
`VERIFICATION.md`; the delivered-state gaps stay in the `OUTCOME.md` files. Listed here so the next
refine has one place to look.

- **F-05 / F-06 / F-10** — residue in delivered code: a race guard that passes on defective code
  ~1 run in 4, a comment stating the fixed race as still live, and ~1.1% classifier false positives.
  All three sit in seams 68 delivered and should be swept together.
- **F-03** — no `work.controls.runners` in `.aof/aof.config.json`, so `aof work doctor`'s leg B never
  runs anywhere in this repo. Repo-wide config gap, not 68's.
- **F-01 / F-02** — a test label that lies about what its own guard guards; milestone 78's `depends`
  pointing at a top-level story. Both outside 68's span.
- **`done` has no reopen edge** (R7). The gate found rework against an accepted story and the
  lifecycle could not record it. Either cross-milestone controls run per story, or `done → in-review`
  becomes legal. Worth an item of its own.
- **Should a bare `work:drive-<phase>` mint a full run lifecycle at all?** 68/01 made it do so and
  ADR-009 settled *how* (through the transition seam). Whether a one-shot local drive *should* own a
  run record was never asked.
- **The canonical item ref is non-padded in attribution JSON.** `resolveMilestoneFolder` returns a
  story as `"68/3"`, not the `"68/03"` the folder and feature text use. Internally consistent; a
  reader of `agents.json` sees the unpadded form. Decide which is canonical for display.
- **A sessionId claimed by two run records resolves silently, order-dependent.**
  `buildSessionItemIndex` is last-write-wins over readdir order. Double-counting is impossible (the
  loser contributes nothing) but the producer-invariant violation goes undiagnosed. Count and report
  colliding session ids during index build.
- **Backfill or accept the empty corpus** (F-08, and `OUTCOME.md` `## Gaps`). Until run records carry
  a `sessionId`, `aof work observe` reports an empty agent table for every item whose runs predate
  68/01's producer.
