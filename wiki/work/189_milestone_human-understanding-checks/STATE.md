---
doc: state
---
# 189 · The human can check understanding separately from shipping success — State

## Progress

- 2026-10-23 — Framed by Hyperagent from wiki/planning/PRD-human-led-learning.md; unnumbered and not started.
- 2026-11-01 — Refined (`aof:refine 189 --autonomous`, solo, run 20261101T024307331Z-0000):
  ARCHITECTURE ADR-001–006, FF-18901–18902 declared `pending`, five stories with example maps, task
  contracts and build briefs.

## Notes & decisions in flight

- Operator review, promotion and refinement remain pending. See SPEC.md for dependencies and the PRD for open questions.
- 2026-10-28 — Operator: the learning module is a new package, created by 179 (see 179 SPEC
  Objective and STATE). 180's understanding checks are built in that package, not in core.
  Inherited from spike 178: the line between assisted and unaided work is an instruction-level
  boundary within one session, not an enforced one, so the pilot states it as a limitation.

- 2026-11-01 — Answered at refine (operator): 189/00 Q1, the command is `aof:grill-me` (offered
  `aof:check`, `aof:reflect`, `aof:practice`); "a check" stays the SPEC's word for the exercise.
  189/03 Q1 (the PRD's Q4), the first audience is experienced developers learning an unfamiliar
  codebase. 189/04 Q1 (the PRD's Q5), n = 1, the operator, at about $10 of model spend.
  189/04 Q2, yes, a delayed unaided item about a week after each pack's session.
- 2026-11-01 — Default decisions taken (technical, documented): a check is its own Claude-only
  command in `@aof/learning`, not a region of `teach.md` (ADR-001); it writes, mints and moves
  nothing, with prose refusals and no door (ADR-002); one item per kind, offered explain, predict,
  diagnose, adapt, each skippable (ADR-003, 189/01 Q1–Q2); help reuses `HELP_LADDER` (ADR-003 §1);
  the pilot's instrument is fixed held-out items given without AI, never `aof:grill-me` (ADR-005 §1);
  the kit lives in `packages/learning/pilot/` with `*.spec.mjs` specs (ADR-005 §2); the kit's
  reproducibility is an executable suite, not a declared control (ADR-005 §6).
- 2026-11-01 — Consequence of n = 1: the participant is the operator, so held-out items sit in each
  pack's `FACILITATOR.md`, judged by the agent review lanes at 03 and not opened by the operator
  before that pack's sessions (ADR-005 §5). The order effect cannot be separated, and the report says so.
- 2026-11-01 — Controls placed by the audit's rule, not by taste: only `*.test.mjs`/`*.spec.mjs`
  resolve as control paths, so a `packages/learning/test/*.suite.mjs` file cannot carry a declared
  control. FF-18901 is a new file in `test/arch/command` (ceiling 32 → 33, stated in 00), and
  FF-18902 is a second leg in FF-17903's file (no new file). 188's lesson about named arch-test
  directories was checked before the paths were written.
- 2026-11-01 — Working ahead: the run mint moved 189 to `in-progress` while 188 is not `done`
  (188's verify declined it on 2026-11-01). `aof work doctor 189` reports `depends-blocked-in-progress`
  as an error until 188 is accepted. Nothing in 189's build depends on 188's open findings except
  02 and 04, which run teaching sessions and inherit 188 F-02 (a stranded teach run); their PLANs say
  how to work around it.
- 2026-11-01 — Graph: `aof graph build .` at 2026-11-01T02:45:32Z, code-only, 21,327 nodes, egress
  none. `bundle.json` and the command prompts are not in the graph; their coupling was taken from
  188/02's declared and found write sets.
- 2026-11-01 — diagram: none briefed. No ADR here has moving parts that a picture would clarify.

## Verification

- Planning checklist pre-flight only. No implementation, tests, live experiments or AOF CLI commands have been run for this item.
- The operator's aof work validate on the branch remains the authoritative gate.
