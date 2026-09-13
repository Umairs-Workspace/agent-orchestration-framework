---
type: story
number: 87
slug: test-isolation-stops-shipping
doc: retrospective
created: 2026-08-27
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
# 87 · Retrospective

The build itself was clean — three tasks, 61 cases, green first time at the gate, no rework and no
blocker in the deliverable. Every lesson below comes from the **gate**, not from the build, and all
three are about framework surfaces that reported something other than what they enforced.

## R1 — A concurrent lane minted a colliding item number mid-gate, and nothing refused it

This story was refined, built and verified as `85`. Part-way through its accept gate a concurrent lane
scaffolded a second `85` — `85_story_records-follow-the-story` — and then an `86` beside it. Nothing
in the stream refuses a duplicate number:

- `resolveItemExact` (`src/commands/resolve.mjs:57`) returns the **first** row whose ref matches. It
  answered the other lane's folder. `aof work status 85 done` would have addressed their story.
- `aof work validate 85` reported `PASS — 85 is well-formed.` **with two items on the number.**
- `aof work doctor 85` had no `duplicate-number` finding. The collision was visible only as two
  `cache-status-divergence` warns that happened to name two different folders on the same ref.

It failed safe by luck, not by design: the other story was `not-started`, which has no lifecycle edge
to `done`, so the misdirected accept would have been refused. Had it been `in-review`, the wrong story
would have been accepted and this one left open, with both records looking correct in isolation.

**Why the obvious countermeasure is unsound.** "Check the highest number before scaffolding" is the
same stale-read defence story 83's register already documents failing: the other lane's scaffold and
this gate overlapped in time, so *both* reads were fresh and *both* were right when taken. Serialising
the read does not help when the write happens after it.

**Carry:** the prevention is allocation that cannot collide (a scaffold that claims the number
atomically); the residue-catcher is a `duplicate-number` check in `aof work doctor`, plus an ambiguity
refusal in `resolveItemExact` instead of a silent first match. Until those exist, a `--solo` gate on a
machine with live concurrent lanes must **resolve the ref at the source before writing anything through
it**, not trust that the ref it was invoked with still means what it meant at refine time.

## R2 — The advisory severity is not the gate severity, and this register recorded the wrong prediction

`aof work doctor 87` prints `doc-over-budget` at **warn**. Reading that surface, this gate logged
F-87-D as a Nit and stated plainly that it "does not refuse acceptance". `aof work status 87 done`
then refused with `artifact-budget-exceeded` — because the accept-time preflight
(`src/commands/item-status.mjs:96-112`) re-runs the same check with the accepting ref injected, which
raises exactly this finding to **error**.

The mechanism is deliberate and documented in the code. What is not is that the only surface an author
consults before accepting prints the severity that does *not* apply at acceptance, so a careful reader
is actively misled by the tool they were told to read.

**Carry:** doctor should name the escalation where it prints the warn — "warn now; error at the accept
gate for this ref" — so the advisory surface predicts the gate. Until it does, treat every
`doc-over-budget` from doctor as a hard refusal in waiting, and trim before running the verb rather
than after being refused by it.

## R3 — A scaffold wrote items into the work dir joined onto itself

`wiki/work/wiki/work/85_story_records-follow-the-story/` and
`wiki/work/wiki/work/86_story_the-span-vocabulary-completed/` were created empty during the same
window — the work dir resolved relative to a cwd that was already the work dir. They sit inside a
tracked directory and are not ignored, so `git add -A` would commit them.

Recorded here because it is the **same defect species as this story's own subject**, at a different
altitude: an artefact left on disk that nothing invokes and nobody named. Task 00's contract makes a
point of naming its orphan out loud ("retracted, not erased") precisely so it cannot become this.

**Carry:** a path a scaffold derives should be resolved from the workspace root once, never from the
caller's cwd — and the doubled path is a cheap thing for `aof work doctor` to notice, since a work item
below another work dir is never legitimate.

## What went right, and is worth keeping

**The gate probed the live artefact, not only the suite.** The re-homed hook was driven end-to-end over
stdin for all ten of task 02's Examples rows, and every withdrawal claim was checked against the real
descriptors rather than through the tests that assert them. Two of this gate's four findings — the
number collision and the budget refusal — were invisible to the suite entirely; both surfaced because
the gate read the tools' actual output instead of their exit codes.

**The re-aim was chosen over inventing a member to keep an assertion company.** The tempting repair was
to promote one of the two remaining bundled hook bodies into the frozen set so `FF-5505` still had a
hook to trace. Story 82's vacuous-control class is exactly that failure, and the contract named it
before the code was written. The control now derives its expectation from the declaration and binds the
next hook member anyone declares — a stronger control than the one it replaced, reached by deleting an
over-specified literal rather than by adding enforcement.
