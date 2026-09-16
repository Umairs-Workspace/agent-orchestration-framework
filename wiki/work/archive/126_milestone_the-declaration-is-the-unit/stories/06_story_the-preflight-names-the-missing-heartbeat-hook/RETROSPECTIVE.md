---
type: story
doc: retrospective
number: 06
parent: 126
slug: the-preflight-names-the-missing-heartbeat-hook
title: "Retrospective — the preflight names the missing heartbeat hook"
created: 2026-09-10
updated: 2026-09-10
---
# 126/06 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A measurement taken in an unrepresentative workspace is a measurement of the workspace

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** the verify session, correcting itself

**What happened.** The live `@manual` lane measured a supervised loop billing 8h34m against a 2h
ceiling and I reported it as milestone 126's own framing defect reproduced on the fixed code — a
blocker, with a fix routed into `126/00`'s clock. It was not. The drive target was a stale workspace
whose `.claude/settings.json` never registered `claude-run-heartbeat`, so no `heartbeatAt` was ever
written and the clock had no liveness evidence to use. `aof work update --dry-run` there answers
*"Would create .claude/hooks/aof/run-heartbeat-enqueue.mjs"*.

**Why.** I chose the test-bed to keep the real checkout clean for the regression gate — a good reason
— and never asked whether it was CURRENT. A workspace picked for isolation is by construction one
nobody has been maintaining, which is exactly the wrong place to measure a default-on mechanism.

**Lesson.** Before drawing a conclusion from a live measurement, establish that the environment
carries the thing being measured. The cheap version is one command: `aof work update --dry-run` in
the workspace under test says what it is missing. The expensive version is what happened here — a
blocker raised on a false premise, and a fix approved that would have been wrong. **Refs:**
`@finding-F-31`.

## R2 — Attempting the approved fix is what proved it wrong, and that is worth the ten minutes

- **Kind:** confirmed approach · **Area:** testing · **Stage:** verify · **Owner:** product-owner · **Raised by:** `FF-12601`'s own fixture

**What happened.** The approved fix was to make a reclaimed attempt with no heartbeat end at its
`createdAt` rather than at the `updatedAt` the reclaim wrote. Implemented, it reddened `FF-12601`
legs 2 and 5, whose fixture (`c=10:00 h=null u=11:00 r=11:00 → 3,600,000 ms`) deliberately asserts
the opposite. The control refused the change on the spot; it was reverted byte-identical and the lane
re-run green.

**Why.** The clock rule is right and its fixture is right — given a heartbeat exists. My reading
mistook "the fallback is wrong" for "the fallback has no evidence to fall back to". A delivered
control encoding the very behaviour you are about to change is the fastest possible review, and it is
free.

**Lesson.** When a fix touches a rule a shipped control asserts, WRITE IT AND RUN THE CONTROL before
arguing about it. The red tells you in seconds whether you are fixing a defect or breaking a
decision. Reverting costs nothing; a merged wrong fix costs a milestone.

## R3 — A default-seamed probe's blast radius is every existing test of the verb, and the fix belongs in the same diff

- **Kind:** confirmed approach · **Area:** testing · **Stage:** build · **Owner:** developer · **Raised by:** `126/04`'s own retrospective, applied

**What happened.** The fourth check added two seams (`settingsFn`, `hookFileFn`) whose defaults read
the real disk. `126/04`'s `R1` had recorded exactly this shape one story earlier — the preflight's
default probes silently widening what every existing test of `install` and `run` reached, green
throughout. So both fixtures gained inert defaults in the same diff that added the seams, before the
lane was run.

**Lesson.** A retrospective earns its keep when the next story reads it. The general rule is worth
restating: adding a default-seamed probe to an existing verb widens what every EXISTING test of that
verb touches, nothing goes red to say so, and the remedy is one line in each shared fixture — written
at the same time as the seam, not after somebody notices.

## R4 — A delivered contract that states a count is superseded by a new contract, never edited

- **Kind:** confirmed approach · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** the accept door

**What happened.** `126/04 task03` asserts "exactly three checks", "an ordered list of three" and
"the same three check lines". A fourth check falsifies all three. The shipped `.feature` was not
touched: this story's own `.feature` states the count of four and names the supersession, and the
SUITE implementing `126/04 task03` moved to the new count with the reason written into it.

**Lesson.** The split that makes this work is that a `.feature` is a criterion and a test is code.
The criterion stays as the true record of what its story shipped; the test follows the current
contract and cites which one. A story that changes a delivered count needs its own contract to say
so — the alternative is either a red accepted story or an edited criterion, and both are worse.
