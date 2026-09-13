---
type: milestone
doc: retrospective
number: 78
slug: loop-execution-record
title: "Retrospective — the loop execution record"
created: 2026-09-04
updated: 2026-09-04
---
# 78 · Retrospective

Lessons from delivering and accepting the milestone. One `R<n>` per lesson, each carryable — a lesson
that only describes this diff is a note, not a lesson. Findings are **referenced**, never restated:
they live in `VERIFICATION.md`.

## R1 — A contract must be measured against its PRODUCER at refine, not at build

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product owner + architect · **Raised by:** the developer, twice, while building 78/00

Two instances, one root cause. `tasks/00_the-execution-model.feature` says a run joins a loop through
"a `loopRunId` and a loop id the registry resolves" — and the declaration milestone 53 mints carries no
loop id at all (`@finding-F-78-A`). The same feature's outline rows say `ceiling: 6`, a value the
registry loader rejects outright as a `loop-bad-value` (`@finding-F-78-B`). Both were authored from a
reading of what the producer *ought* to carry; neither survived one `grep` at build.

**Why.** At refine the producer is a paragraph in another milestone's document. Reading that paragraph
feels like measuring, and it is not — 53's SPEC genuinely promises a join key, and the seven-key
envelope it ships genuinely is that promise minus the one field that makes it a join.

**Lesson.** When a contract names a field, a key or a value shape that some other component produces,
**open the producer and read the literal** before the contract is locked. The cost of not doing so is
asymmetric: a wrong ceiling shape costs a fixture, but a join key with no producer costs the whole
milestone's capability — everything above it builds and goes green while reporting on nothing. This is
m20/R2 (a key frozen and classified with no producer) and m77/R8 (a fixture written against a belief
about the loader) recurring together in one feature file, which is the signal that reading-the-cited-
document is not a countermeasure and only reading the code is.

**Refs:** `@finding-F-78-A`, `@finding-F-78-B`, `78/OUTCOME.md` `## Gaps`, m20/R2, m77/R8.

## R2 — A story gate must triage against the SPEC's scope text, not against its own sense of the milestone's worth

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** the milestone gate, re-reading its own earlier triage

78/00's gate triaged F-78-A as *"a blocker for the milestone — it must be closed before 78 is
accepted"*. `SPEC.md` had already scoped the producer out in as many words: *"Instrumenting the loops.
The join key is `brief.loop` and it belongs to 53. This milestone reads it; if 53 has not populated it,
this milestone renders the absence honestly and says so."* The milestone gate had to dismantle a
blocker the SPEC never asked for, in the open, before it could accept.

**Why.** The story gate was reasoning from the SPEC's *Objective* — which is about observability being
worthless when nothing reads it — rather than from its *Scope*. The objective is the motivation and it
is deliberately larger than the deliverable; treating it as the acceptance criterion silently widens
every gate.

**Lesson.** A finding's triage is a question about the item's **Scope** section, not its Objective. If a
gap is named in "Out of scope", the honest triage is `non-blocker` plus a declared gap with a discharge
condition in `OUTCOME.md` — the artifact that exists for exactly this. Escalating it to `blocker`
creates a phantom the next gate must spend its credibility removing, and trains readers that "blocker"
is rhetorical.

**Refs:** `@finding-F-78-A` (triage and re-triage rows), `78/SPEC.md` `## Scope`, `78/OUTCOME.md`.

## R3 — A control's comment describes its ambition; only a red probe describes its reach

- **Kind:** near-miss · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** the red-probe sweep at the milestone gate

FF-7803's fourth arm is titled *"a changed input is the ONLY thing that moves the bytes"* and its
comment argues it is what stops a composer that "emitted a constant" from passing. Probed: the entire
document body was replaced by a constant and **all 4/4 stayed green** (`@finding-F-78-H`). The arm is
armed — a writer that never re-derives reds it — but the input it perturbs adds a *sign-off row*, so
the bytes move for a reason independent of the body. Two sibling findings have the same shape:
FF-7802's sweep reaches declared glyphs only, leaving one hand-copied literal uncompared
(`@finding-F-78-E`), and an assertion message names a heading while checking a body line
(`@finding-F-78-F`).

**Why.** A control's comment is written when the invariant is clearest in the author's head and the
assertion is written to make a specific bad case fail. Nothing forces the two to agree, and a green run
is evidence for neither.

**Lesson.** The red probe is not paperwork over an already-trusted assertion; it is the only measurement
of what the assertion **reaches**. Probe every arm separately and confirm the others stay green — that
is what proves N arms rather than one assertion wearing N names — and when a probe comes back green,
**record it as a finding rather than reaching for a probe that reds**. This gate's most useful single
result is a probe that failed to fail.

**Refs:** `@finding-F-78-H`, `@finding-F-78-E`, `@finding-F-78-F`, `78/VERIFICATION.md` `## Fitness functions`.

## R4 — An instrument that can see nothing must refuse, not report health

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** the framework (work-doctor) · **Raised by:** the milestone gate, cross-checking its own instrument

`aof work doctor <ref>` resolves `work.dir` against the process cwd rather than the project root, so
from any subdirectory it scans an empty stream and prints **`healthy — <ref> is coherent.`**
(`@finding-F-78-K`). This gate ran doctor from the repo root (8 findings), filled the fitness register,
then re-ran it from the item's own folder to confirm — and got a clean bill it would have accepted had
the earlier run not contradicted it. `aof work validate` from the same cwd answers correctly, which is
what makes the drift invisible. A second defect in the same instrument surfaced beside it: a top-level
parentless story is absent from doctor's driver index, so a met `depends:` edge reports
`error: depends-blocked-in-progress` (`@finding-F-78-I`).

**Why.** An empty result set and a clean result set are the same object, and every reporting instrument
renders them the same way unless it is built not to. `aof:verify` step 4 names `aof work doctor` as the
check that must be read before `status: done`, so the false green points *toward* acceptance.

**Lesson.** Two carryable rules. **(1)** Run gate instruments from the project root, and treat a
suspiciously clean answer as a reason to re-run from a known-good cwd before believing it — the tell
here was the shape of the output changing (`Loop-Ready 70% (7/10)` → `50% (2/4)`), not the findings
vanishing. **(2)** When building any check that reports over a scanned set, make an empty scan an
**error**, never a pass. This is TECH_DEBT item 4 ("workspace identity is still partly cwd-derived")
with a concrete victim, and it is the same family as the dispatch-worktree cwd drift already recorded.

**Refs:** `@finding-F-78-K`, `@finding-F-78-I`, TECH_DEBT item 4.

## R5 — A finding a regeneration cannot clear is a defect in the check, not a fact about the code

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer + reviewer · **Raised by:** 78/03's own review

78/03's staleness check first compared engagement **sets** symmetrically. But 78/02's writer
deliberately preserves an orphaned SIGNED row (ADR-002 — the signature is the one thing regeneration
never destroys, and `pruneRun` really can remove a run), so such a record reported `loop-record-stale`
**and running the fix did not clear it**. The rule is now asymmetric: every projected engagement must
have a row, a leftover UNSIGNED row is staleness, a leftover SIGNED row is a sanctioned orphan.

**Why.** The check was written against the document's ideal shape rather than against the writer's
actual contract, and the two differ precisely where the writer makes a deliberate exception. The
exception was documented in 78/02's STATE feedback — it was available and not consulted.

**Lesson.** For every new finding code, run the test the code's own remedy names and confirm the finding
**clears**. A permanent warning nobody can act on is the wall-of-inherited-red pathology 70/ADR-007
refuses by name, and it is created one well-intentioned check at a time. When two lanes share a
document, the reader's rules must be derived from the writer's exceptions, not from the format.

**Refs:** `78/STATE.md` `## Feedback (for retro)` (78/03), 78/ADR-002, 70/ADR-007.

## R6 — A comment predicting a later story's design is a prediction, and it will be wrong

- **Kind:** misunderstanding · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** the developer building 78/03

FF-7805's allowlist comment (written at 78/02) anticipated that 78/03 would **import** the writer's
exported sign-off constants. 52/FF-5202 forbids exactly that — it sweeps every `src/work-doctor*.mjs`
for the registry family's tokens, and importing the writer would drag `work-loops`, `run-store` and
`fs` into a lane whose contract is purity. 78/03 had to hold its own copy, and FF-7809 (three copies
held byte-equal) is what makes two copies safe rather than sloppy.

**Why.** The predicting comment was written by the story that had no reason to re-read 52/FF-5202; the
constraint lived in a gate two milestones away, and the prediction read as a decision to everyone who
came after.

**Lesson.** Write comments about what the code **does** and what a gate **forbids**; do not write them
about what a not-yet-built sibling will do. If a future story's shape genuinely needs deciding now, it
is an ADR, not a comment — an ADR gets re-read and revised, a comment gets believed. The upside here:
being forced into an independent copy produced a *better* instrument, because a checker that imported
its subject's opinion of the shape could never report the subject changing it.

**Refs:** `78/STATE.md` `## Feedback (for retro)` (78/03), 52/FF-5202, 78/FF-7809, 78/FF-7805.

## R7 — Observability's join is empty for the same reason the milestone's is

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** the framework · **Raised by:** the retrospective's own observability refresh

`aof work observe 78 --write` at the close reports **0 agent runs across 0 sessions** with **418
unattributed agent runs** — every transcript found, none joinable to a run record. So this milestone
produced no per-agent time, token or stall data, and no process lesson could be mined from spend.

**Why.** The same missing join the milestone itself is about, one layer over: a session matches a run
record only when the record carries the identity to match on, and this repository's run records carry
`sessionId: null` and `brief: {}`.

**Lesson.** Two instruments in this framework now measure nothing for the same reason, which makes the
producer change a **shared** dependency rather than 78's private gap — and raises what it is worth. When
a second consumer of a missing key appears, record that the key now has two customers; a gap with one
customer gets deferred indefinitely, a gap with two gets scheduled.

**Refs:** `78/observability/report.md`, `@finding-F-78-A`, `78/OUTCOME.md` `## Gaps`.
