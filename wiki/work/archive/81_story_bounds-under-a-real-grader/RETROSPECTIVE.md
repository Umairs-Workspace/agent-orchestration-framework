---
doc: retrospective
item: 81
created: 2026-09-04
updated: 2026-09-04
---
# 81 · Retrospective

Distilled at the accept gate from the four review-found defects (`VERIFICATION.md` F-81-A … F-81-D)
and from two things the gate's own at-source probes turned up (F-81-H, and the re-measured margin).
No `observability/` lesson: `aof work observe 81 --write` matched **0 sessions and 0 run records**, so
there is no per-agent time, token or stall evidence for this story — that absence is itself R5.

## R1 · Naming the category of "what the old call gave for free" is not enumerating it

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** the
structural and behavioural review lanes.

**What happened.** All four review findings are the same defect class: a property `spawnSync` supplied
implicitly that the asynchronous spawn stopped supplying. The capture ceiling silently became UTF-16
code units instead of bytes (F-81-A); the overflow kill and the deadline kill both use `SIGKILL`, so an
over-talking runner was reported as a timed-out one (F-81-B) — under `spawnSync` they were
distinguishable for free because its buffer kill used `SIGTERM`.

**Why.** The contract *did* name the hazard. `tasks/00` carries a Scenario Outline titled "the guards
the blocking spawn used to give for free still hold on the async one", with six rows. Both defects
above fall squarely inside that title and neither is one of the six rows. The six the author listed
are all guarantees carried by a named **option** — `shell`, `stdio`, `maxBuffer`, `env`. The two
missed are guarantees carried by something with no name in the options object: the **unit** `maxBuffer`
counts in, and the **signal** `spawnSync` happened to choose for a buffer kill. An author enumerating
"what do I pass?" finds the first set and cannot see the second.

**Lesson.** When replacing a platform call with a different-shaped one, the enumeration must be driven
from the **old implementation's behaviour**, not from its options list — read what the synchronous form
*does* on each termination path (normal exit, buffer kill, timeout kill, spawn failure) and write one
case per path. A contract row named after a category is a prompt to enumerate, not evidence that
enumeration happened; the review is what closed the gap, and it should not have had to.

**Refs:** `@finding-F-81-A`, `@finding-F-81-B`; commit `f42b02c4`;
`tasks/00_the-grade-waits-without-blocking.feature` § "the guards the blocking spawn used to give for
free".

## R2 · A "refuses to exceed" bound is only as strong as the measure it reserves with

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** the
structural review lane.

**What happened.** `boundGradeFailures` reserves room for its own truncation statement before fitting
entries. It reserved using the **default** measure rather than the caller's, so the fix transport —
which renders indented JSON and therefore costs more per entry than the default assumes — reserved
less than its statement actually costs. It cleared the ceiling anyway, on whatever slack `fitEntries`
happened to leave (F-81-C). Separately, the measure did not include the `gate` key a statement entry
gains *after* the bound returns, so the payload was measured smaller than it would be written (F-81-D).

**Why.** The function takes a caller-supplied measure precisely because surfaces render differently,
and then used a different measure for the one computation whose whole job is to guarantee the result
fits. The `@executable` cases were green throughout: they assert the payload is within the ceiling, and
it was — by luck, which is exactly what a green assertion cannot distinguish from a guarantee.

**Lesson.** For any bound of the form "refuses to return an over-ceiling X", the reservation, the
fitting and the final measurement must all use **one** measure — the caller's — and the thing measured
must be the payload **as it will be written**, after every key later stages add. This is the same shape
as `82_spike_vacuous-control-detection`'s finding: an assertion that passes tells you nothing about
whether the fixture could have made it fail. Here the slack was the fixture's reach.

**Refs:** `@finding-F-81-C`, `@finding-F-81-D`; commit `f42b02c4`; `70/ADR-003` (the write-path
ceiling precedent this story follows).

## R3 · A project whose rubric is its own test suite has declared the grading machinery's gates as its rubric

**Kind:** blocker · **Area:** architecture · **Stage:** verify · **Owner:** the rubric declaration
(`69/06`, amended `54/03`) · **Raised by:** this gate's at-source probe.

**What happened.** `aof work grade 81 --run` returned `fail` with 12 failing cases. Three of them —
two `FF-5405` spawn assertions and one `FF-5409` producer-code assertion — are red **only** when the
tier is run as a grade. The grade stamps `AOF_GRADE_RUNNING=1` into the child's environment, and its
own re-entrancy guard refuses any grade whose ambient environment already carries it, returning
`launched: 0, outcome: "spawn-failed"`. The tier contains the grade's own gates, so grading the tier
makes them refuse.

**Why.** `scripts/test-rubric.mjs` enumerates the fitness tier **from disk** — deliberately, so it
cannot drift as arch tests are added. That property is right and is why the collision was invisible:
nobody chose to put the grade's gates in the rubric; they arrived by being fitness functions. The
re-entrancy guard is also right, and story 81 was required by its own contract to preserve it. Two
correct decisions compose into a self-poisoning gate, and neither owner could see it alone.

**Lesson.** A rubric enumerated from disk will eventually enumerate the gates of the machinery that
runs it. Verify a declared rubric by running it **through the grade**, not only directly — the two
runs disagreeing is the only signal this class of defect emits, and here they disagreed on exactly
three cases. More generally: when a tool grades a repository that contains the tool, ask what the
tool's own guards do to their own tests.

**Refs:** `@finding-F-81-H`; `src/commands/grade.mjs:165` (the stamp), `:314-324` (the guard);
`scripts/test-rubric.mjs`.

## R4 · A latency margin cited as "latent, not absent" is a decaying fact, and this one halved in two weeks

**Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** product-owner ·
**Raised by:** this gate's live probe.

**What happened.** The story's premise, its task-00 preamble and `F-54-VERIFY-3` all rest on one
measurement taken at 54's accept on 2026-08-23: the declared rubric runs in **116 s / 118 s** against a
900,000 ms window, *"a 7.8× margin, ~13% of the window"*, so the fault is *"latent here, not absent"*.
Re-measured at this accept on 2026-09-04: **234 s**. The margin is **3.8×**, not 7.8×. Half the
headroom the contract reasons from was gone before the contract shipped.

**Why.** The number was recorded with its date — correctly — and then reasoned about as a standing
fact across refine, build and review. Nothing in the story's own machinery re-takes it, and the suite
cannot: every timeout case is driven through an injected spawn seam, which is the right way to test
the code and structurally incapable of noticing that the real runner got slower.

**Lesson.** When a contract's justification is a measured ratio against a bound, re-take the
measurement at the accept gate and write both numbers down. The story's conclusion survives — the fix
is more warranted now, not less — but it survived unexamined, and a contract whose premise silently
decays is one whose next reader inherits a stale reason. Prefer, where possible, a check that measures
the ratio rather than a prose sentence that quotes it.

**Refs:** `VERIFICATION.md` § "Live exercise"; `F-54-VERIFY-3`;
`tasks/00_the-grade-waits-without-blocking.feature` preamble.

## R5 · This story produced no observability record, so its build cost is unknown

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** the observability lane ·
**Raised by:** the retro step.

**What happened.** `aof work observe 81 --write --if-enabled` wrote a snapshot containing **0 run
records across 0 declared phases** and an empty agent table — `_Sessions: none_`. The story was built
across two commits with a review round in between, so there was real agent work to record; none of it
was matched to the item.

**Why.** Not diagnosed here, and that is the point — the candidates (the story was driven outside the
transcript window the miner reads, or its sessions were not attributed to ref 81) are distinguishable
only with evidence this gate does not have. A standalone story carries no `STATE.md`, so there is also
no `## Feedback (for retro)` running record to fall back on: for story 81 the *only* surviving process
evidence is what this document and `VERIFICATION.md` were written from.

**Lesson.** An empty observability snapshot should be treated as a finding about the pipeline rather
than as "this story was cheap". Worth checking at the next standalone story's accept whether the miner
attributes parentless-story work at all — if it does not, every standalone story is invisible to the
self-improvement loop, which is a systematic blind spot rather than a gap in one record.

**Refs:** `observability/snapshots/2026-09-04T01-49-12-727Z/report.md`;
`aof-work-observe-transcript-observability`.
