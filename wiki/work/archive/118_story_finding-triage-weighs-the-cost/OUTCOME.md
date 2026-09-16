# 118 · Finding triage weighs what a driver costs — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the main-session govern command that accepted the
  item (ADR-004, reconciled at 85). States product STATE, never motive — the reasoning lives in
  RETROSPECTIVE.md. This is an ADDITIONAL artifact: it carries no identity frontmatter and is never
  this item's record doc, which stays STORY.md.
-->

## Delivered

### The triage router has a fifth routing, appended last
`FINDING_ROUTINGS` reads `["amendment", "chore", "story", "recorded", "fixed"]` — the four prior
members unmoved in their prior order and with their prior meanings, `fixed` fifth and final, and no
sixth member.

### A remedy cheaper than the driver that would carry it is fixed at the close
A finding carrying `cheaperThanDriver: true` routes to `fixed` with vehicle `fixed-at-close`,
`creates: null` and `owner: loop`; the close's `creates` subset holds no entry for it, so it mints no
item and grants no review round.

### The cost question decides ahead of the checklist question and behind the two that already decided
`routeFinding` asks the cost question after the locked-contract question and after the Nit skip, and
before the checklist question: a finding that is both cheap and checklist-dischargeable is `fixed`, a
finding that is cheap and requires a delivered `.feature` or ADR change is `amendment`, and a Nit that
is cheap is `recorded` and can still never be promoted.

### The router takes the reviewed item's type as an additive second argument
`routeFinding(finding, { reviewedType })` and `routeFindings(findings, context)` accept the type of
the item under review as the pass's context rather than as a field on the finding; with no context
supplied the decider returns exactly what it returned before this story, so no existing caller changes
and no existing row moves.

### Reviewing a chore, a checklist-dischargeable finding folds instead of promoting
With `reviewedType` equal to `chore`, that finding routes to `amendment` with vehicle
`reviewed-chore-definition-of-done`, creating nothing; with any other type — `story`, `milestone`,
`spike`, `uat`, or none — it still routes to `chore`/`top-level-chore` and still creates a top-level
chore. The bound is read from `LOOP_CREATED_ITEM_TYPE`, so the one type the loop may create is the one
type it may not be promoted from.

### The verb refuses the same case, before it can write anything
`aof work promote-finding <chore-ref> …` exits 1 with `promote-finding-reviewing-a-chore` (400),
naming the reviewed item as a chore and naming both destinations open to the remedy. The refusal sits
after ref resolution and **before** the idempotence scan, so a finding already promoted once cannot
cross the bound by having crossed it; nothing is created, nothing is renumbered and no `CHORE.md` is
written or amended.

### The operator's own promotion face is unbound
`work:promote-gap` is byte-unchanged: it still declares `at` in its input schema and still advertises
`[--at <P>]`, so a person who wants the chore anyway types the gap face.

### The shipped rule says five questions, and every rendered copy says the same
The `<finding_triage>` region of `src/bundle/commands/continue.md` states five ordered questions, puts
the cost question second, weighs it against a driver's ceremony rather than a line count or a
duration, and states the depth bound with both of its destinations. The three tracked renders —
`.claude/commands/aof/continue.md`, `.codex/skills/aof-continue/SKILL.md`,
`.opencode/commands/aof/continue.md` — carry that region identically to the source, and every
`src/bundle/manifest.json` entry hashes to its re-rendered member. No occurrence of "four ordered
questions" survives in the tree.

### FF-7103 asserts the two new bounds, with a probe for each
`test/arch/acd-promotion-creates-one-type.test.mjs` gains three legs: leg (b) reports a block that
drops the cost question, asks it after the chore question, or prices it in lines; leg (b) reports a
block that drops the depth bound or either of its destinations; leg (c) reports the verb's type check
removed, and reports it moved to after the idempotence scan. Its routing set is derived from the
exported `FINDING_ROUTINGS` rather than hand-listed, so a routing added to the export is asserted
against the block with no edit to the control.

## Assumptions

- **The reviewer supplies the cost judgement, the decider supplies the routing** — `cheaperThanDriver`
  is a declared input on the finding exactly as `checklistDischargeable` is; nothing measures cost,
  and the routing is drivable precisely because the judgement arrives as data.
- **Termination is by construction, so no numeric bound is homed** — every surviving finding is routed
  exactly once, so N findings admit at most N fixes; nothing was added to `src/loop-bounds.mjs`, and
  71/00's "a stated bound names its home" is satisfied by there being no stated bound to home.
- **The reviewed type is a property of the pass** — it is the same for every finding of one close,
  which is why it is context and not a field, and why `routeFindings` hands one value to all of them.
- **The bound is on type, not on provenance** — keying it to the `Promotion key` would have caught only
  four of the six measured recursions, because two of the reviewed chores were raised by a person.
- **71/ADR-003 is narrowed, not contradicted** — the loop still creates exactly one type in exactly one
  place and simply creates fewer of them, so no superseding ADR is owed and FF-7103 was widened in
  place rather than retired.

## Gaps

### The decider has no production caller
- **Status:** open
- **Discharge condition:** a review-close path under `src/` that calls `routeFindings` and acts on what
  it returns, rather than an agent restating the questions from the prose.

`routeFinding` and `routeFindings` are imported by `test/promote-finding-to-chore.test.mjs` and
`test/arch/acd-promotion-creates-one-type.test.mjs` and by nothing under `src/`. At run time the cost
test and the depth bound bind through the `<finding_triage>` prose the agent reads and through
`aof work promote-finding`'s refusal; the decider is the drivable statement of the rule, which is what
71/ADR-009 §B asked for and is not a runtime gate. The module's determinism contract
(`work-loop-determinism`) requires it to import nothing, so the caller cannot be added by reaching
downward from it.

### The depth bound reaches the loop's face and the decider, never the operator's
- **Status:** open by decision
- **Discharge condition:** none is sought — 71/ADR-009 §1 separates the two seams, and closing this
  would remove the escape the refusal message itself names.

`aof work promote-gap` will still create a chore-shaped top-level item while a chore is under review.
That is the sanctioned route for a person who has weighed the ceremony and wants the driver anyway,
and the refusal on the finding face points at it by name.
