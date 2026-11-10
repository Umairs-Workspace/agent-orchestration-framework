---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 135 · Key examples in the contract — State

## Progress

- [x] refined 2026-10-03 (solo, `--autonomous`): RESEARCH, ARCHITECTURE (ADR-001 to ADR-007,
  FF-13501 and FF-13502 pending), DESIGN, five stories
- [x] 01 the practice is its own package. Accepted 2026-10-03.
- [x] 02 the parser reads `Rule:` as a group. Accepted 2026-10-03.
- [x] 03 the board groups scenarios by rule. Accepted 2026-10-03, after F-135-01 was repaired at verify.
- [x] 04 an agreed example cannot fall out. Accepted 2026-10-03.
- [x] 05 the contract is formulated from the map. Accepted 2026-10-03, after F-135-02 was repaired at verify.
- Verified 2026-10-03 (`aof:verify 135`): the five stories accepted, F-135-01/02 repaired in `3eb38e39`,
  the `@manual` live trace run on 135/04. Evidence, the gate and the findings are in `VERIFICATION.md`.

## Notes & decisions in flight

- **Refine 2026-10-03: the operator added the package.** Mid-refine, the operator asked for
  specification by example to be an add-on or a new package. Answered: there is no runtime plugin
  mechanism, and the config gate is already the switch. The operator chose to move the practice
  into its own package and named it `@aof/specification-by-example` (ADR-001, story 01).
- **Business questions asked at the end review (2026-10-03):**
  - 135/04 Q1: if an agreed example is missing from a contract, is the build refused or only
    reported? **Refused.** This became `[stated Q1]` E8 and task 04/02.
  - Designer, mock elicitation for the board: **no mock**, so DESIGN.md's binding checklist is the
    source of truth.
- **Default decisions taken (technical only):**
  - The trace lives in the example-map lane, not the advisory rubric lane. This follows the
    SPEC's intent and departs from its wording (ADR-004 §3).
  - The trace fires only on a contract formulated from the map, so 144 and every pre-135 contract
    lint as today (ADR-004 §4, SPEC out of scope).
  - Rule tags take rule scope, and `Example:` is admitted (ADR-003, RESEARCH R2 and R3).
  - The board puts scenarios outside any rule first, as Gherkin orders them (135/03 Q1).
  - A scenario citing an id missing from the map is not reported (135/04 Q2).
- **Runner check (SPEC scope):** aof's own binding was measured and needs no change. No governed
  project here uses a third-party Gherkin runner. The fallback is one feature per rule (RESEARCH R6,
  ADR-002 §3).
- **Graph:** built 2026-10-03T10:31:53Z, code only, no egress. The first build timed out at 120 s
  and succeeded with `AOF_GRAPHIFY_TIMEOUT_MS=900000`. Impact is cited in ADR-007.
- **Dogfooding:** 03 and 05 are formulated in 135's own form (`Rule: R<n> · …`, `E<n> · …`), so
  once 04 lands, their contracts are the trace's first real subjects.

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the second of three drivers.
- **No spike for the runner check.** Whether the governed projects' BDD runners bind `Rule:` is a
  refine-time measurement inside this milestone's own scope (researcher + developer feasibility), not
  a top-level unknown.
- **What the ARCHITECTURE must settle:** (1) `Rule:` blocks versus a feature per rule; (2) how the
  traceability reader matches an example to a scenario or an Examples row, whether by id or by value;
  (3) the fallback for a runner that does not bind `Rule:`.

## Verification

- [x] `@executable` suite green (story-scoped, at `3eb38e39`)
- [x] Whole-tree gate: two runs, red only on inherited cases at `aa9fd84c`, accepted by override with its reason
- [x] Fitness functions green, red probes recorded
- [x] `@manual`: one mapped story formulated and linted end to end (135/04, E8)

## Feedback (for retro) — archived 2026-10-03

Graduated into `RETROSPECTIVE.md` (milestone R1-R2) and the stories' own `RETROSPECTIVE.md` (01 R1,
03 R1-R2, 04 R1-R2, 05 R1; 02 surfaced nothing worth a lesson). The blow-by-blow is in git history
(`a7f6316c`).
