# 55/05 · L3 unlocked — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### An L3 rung that executes
`LOOP_LEVELS` is `["L1","L2","L3"]` and `LOCKED_LOOP_LEVELS` is empty; milestone 53's L3 lock is
removed rather than narrowed, and the arch-test proxy that asserted no module could branch on L3 is
deleted rather than left passing on a premise that is now false.

### Admission computed from earned facts alone
`resolveLoopLevelGate` admits L3 only on a Loop-Ready score equal to `L3_SCORE_THRESHOLD = 100`
together with a groundedness report carrying no `self-referential` and no `stale` component. No config
key, environment variable or flag anywhere in `src/**` admits it.

### Both halves gathered through the command boundary
`resolveInvocation` invokes `work:doctor` and `work:loops-groundedness` through the registry before the
gate is consulted, so the loop reads the registry the way every other consumer does, and a refused
request spawns nothing and records nothing.

### A refusal that names the failing half and its parts
A refused L3 request carries `loop-level-gate` with `failingHalves`, the score against its threshold
with every blocking check named, and the groundedness half's components verbatim — machine-readable,
and a refusal rather than a crash.

### The anchor check inside the readiness score
`COMPOSED_CHECK_IDS` carries `anchor-grounding` beside milestone 52's five, composed from the same
report rather than re-derived, and an unreadable registry yields not-applicable — which does not admit
L3 — rather than a pass.

## Assumptions

- **The threshold is every composed check, not a majority** — `L3_SCORE_THRESHOLD = 100` means an
  unattended rung does not open while any composed instrument is failing or not-applicable.
- **This workspace has not earned L3** — aof's own stream scores 40% with six blocking checks and four
  self-referential components, so the rung is open in the ladder and closed for this repository until
  both halves clear.
