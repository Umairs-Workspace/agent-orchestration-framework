---
doc: state
---
# 143 · The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose — State

## Progress

- Captured 2026-10-02 from the operator.
- Refined 2026-10-02 (`aof:refine 143 --autonomous`, solo): ADR-001…005 in `ARCHITECTURE.md`, four
  stories, every contract authored. Next: `aof:continue 143`.

## Notes & decisions in flight

- Operator, 2026-10-02: "I want this done via the cli `aof work loop <> --`; we can discuss how to best lay
  this out as command line arguments." Agreed the same day: one repeatable `--model [<phase>=][<model>][:<effort>]` flag, e.g. `--model refine=opus:xhigh --model verify=fable:high`, with `--thinking` kept as the effort-only form (SPEC § Scope).

- **Default decisions taken at refine (autonomous; review them):**
  - Subagent role models stay out of scope: `--model` sets the spawned session only (ADR-003 §7).
  - `work.loop.refine`, not `work.autonomous.refine`, because FF-6901 makes `work.loop.*` the one home (ADR-002 §1).
  - Whole-item applies to the break-down drive (a milestone with no stories). A cascade that dies
    part-way is finished by the ordinary per-story refine drives (ADR-002 §4).
  - Session flags layer by specificity: a phased value beats an unphased one. Two values at the
    same specificity for the same part of the same phase refuse, even when they are equal (ADR-003 §4).
  - On resume, recorded FLAG choices are re-applied and config/default entries re-resolve. Any new
    session flag drops the recorded flag set as a whole (ADR-004 §3).
  - A backlog slug with `--stop`, `--hand-off` or `--resume` refuses, because it cannot have a
    running loop. `--dry-run` reports `wouldPromote` and writes nothing (ADR-001 §4).
- Graph: the first `aof graph build .` timed out at 120 s (`graphify-timeout`). A retry with
  `AOF_GRAPHIFY_TIMEOUT_MS` raised built it (17,935 nodes, egress none). Boundaries cite its impact
  answers (ADR-005).
- No diagram: no ADR here has enough moving parts to need one.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
