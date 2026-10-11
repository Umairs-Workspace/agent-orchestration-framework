---
doc: state
---
# 157 · Episodic memory is recallable — State

## Progress

- [ ] `01_story_episodic-records-resolve-to-their-sources` — not-started, contract authored
- [ ] `02_story_every-consumer-accounts-for-the-episodic-pool` — not-started, contract authored (depends 01)
- [ ] `03_story_retry-triage-and-retrospective-recall-episodes` — not-started, contract authored (depends 02)

## Notes & decisions in flight

- 2026-10-11, refine attempt 2 (`aof:refine 157 --autonomous`, solo). Attempt 1 was a loop-driven
  Codex refine that wrote the four ADRs and failed with `operator_action_required` before any
  story existed. This attempt verified those ADRs against the code and kept them. It also fixed
  their evidence section: the recall observation ids it cited were never submitted, and the
  RESEARCH it pointed at did not exist. The architect and PO recalls were re-run, both returned the
  same results, and both were submitted (ARCHITECTURE, Recall and source evidence).
- Graph unavailable: attempt 1 hit `EPERM`, attempt 2 hit `graphify-timeout`. Boundaries were drawn
  from source imports and are cited in the ARCHITECTURE Breakdown.
- The breakdown went from two stories to three. The doctor flagged 01's map at five rules, and the
  consumer rule became 02.
- Discovery ran for all three stories. No business question remained after striking what the SPEC
  and ADRs answer, so nothing was asked, and every example stays `proposed`. Technical questions
  took defaults from the ADRs, recorded in each map: cancelled runs are terminal (ADR-001), JSON
  sources extend the locator string and not the record (ADR-002), tune keeps its own readers
  (ADR-003), `--all` overrides `--limit` on recall (ADR-003), and a matched prior finding is cited,
  never auto-closed (ADR-004).

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-15701, FF-15702 — both `pending` at refine)
- [ ] `@manual` evidence recorded in VERIFICATION
