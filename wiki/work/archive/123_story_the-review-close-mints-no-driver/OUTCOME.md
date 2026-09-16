# 123 · The review close mints no driver — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### The review close's creation authority
`routeFinding` returns `creates: null` for every combination of its declared inputs, and
`routeFindings`' `creates` subset is empty by construction — a review close deposits no item in the
work stream.

### The destination of a checklist-shaped remedy
A `checklistDischargeable` finding that is not `cheaperThanDriver` routes to
`story` / `operator-refines` / `creates: null` / `owner: operator` under every reviewed-item type
the stream admits and with no reviewed-item context at all; the one exception is a reviewed `chore`,
which still routes to `amendment` / `reviewed-chore-definition-of-done` / `owner: loop`.

### The cost question's bar
The only driver question 2 weighs a remedy against is a story the operator must refine, so the
threshold below which a remedy is fixed at the close is the cost of a story rather than the cost of
a chore.

### The `<finding_triage>` instruction
The block states *"The loop creates NO item."*, contains no `aof work <verb>` invocation, and is
carried byte-identically by all four tracked renders —
`src/bundle/commands/continue.md`, `.claude/commands/aof/continue.md`,
`.codex/skills/aof-continue/SKILL.md` and `.opencode/commands/aof/continue.md`.

### `m71/FF-7103`'s enforcement
The control asserts the no-creation bound over the decider's whole declared input space — 9235
combinations — rather than over an enumerated set of rows, and its prose leg reports any `aof work`
verb the block names rather than checking which one it names.

### The two promotion faces
`work:promote-finding` and `work:promote-gap` are both registered and reachable by a person;
`work:promote-finding` still refuses a finding raised while reviewing a chore, and
`work:promote-gap` still honours `--at`. No routing the decider can reach leads to either.

### `FINDING_ROUTINGS`
The export carries `["amendment", "chore", "story", "recorded", "fixed"]` in its delivered order.
`chore` is a member the decider cannot reach.

## Assumptions

- **the operator picks the hand-back up** — a `story (operator)` routing is a report at the close,
  not a queue entry; nothing in aof schedules the story it names or tracks that it went unscheduled.
- **membership is not reachability** — `chore` stays in `FINDING_ROUTINGS` for the operator's own
  `work:promote-gap`, so a reader who infers what the loop can do from the exported set will read it
  wrong; the decider is the only authority on which routings are reachable.
- **the rule binds through two layers, not three** — over a real close the bound is carried by the
  `<finding_triage>` prose the agent reads and by `work:promote-finding`'s refusal; the decider is
  the drivable statement of the rule, not a runtime gate on the close.

## Gaps

### the decider has no production caller
- **Status:** open
- **Discharge condition:** a close path under `src/` that calls `routeFinding`/`routeFindings`
  instead of restating the rule in prose.

`routeFinding` and `routeFindings` are imported by `test/promote-finding-to-chore.test.mjs` and
`test/arch/acd-promotion-creates-one-type.test.mjs` and by nothing under `src/` — the two `src/`
occurrences are comments. A green decider suite is therefore evidence about the rule, never evidence
that a close consulted it. This is `118/VERIFICATION.md`'s F-118-B, unchanged by this story, which
narrowed the decider's answer rather than giving it a caller.

### a hand-back has no pickup surface
- **Status:** open
- **Discharge condition:** something that surfaces `story (operator)` routings as pending operator
  decisions, so a finding handed back is visible until it is scheduled or dismissed.

The `story` routing is now the destination of every remedy the close is too expensive to fix, which
makes it the busiest routing rather than the rarest. Nothing records that a hand-back happened
outside the accepting item's `VERIFICATION.md` `## Findings` table, and nothing reads those tables
across items: `arch/FF-6603`'s floor has been handed back at three consecutive gates
(`m102/F-102-B`, `m118/F-118-A`, `m123/F-123-E`) and is unscheduled at each.
