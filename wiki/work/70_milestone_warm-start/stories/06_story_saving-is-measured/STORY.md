---
type: story
number: 06
slug: saving-is-measured
title: "The saving is a number, not a claim"
parent: 70
status: done
owner: product-owner
created: 2026-08-22
updated: 2026-08-24
depends: [70/01, 70/02, 70/05]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 06 · The saving is a number, not a claim

## User story

As the person deciding whether warm start worked,
I want one measured before-and-after from a real run under these flags,
so that this milestone's own dependency note stops describing it — *"the cache-hit ratio and the
per-phase ingest cost are the only way to prove any of this worked. Without 68 this milestone ships
on faith."*

It is shipping on faith. **Every run record in this stream reports `unmeasured`.**

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_a-real-phase-is-measured.feature` — a phase driven through the door that declares it leaves a run record carrying a `spend` envelope, and the report states a measured cache ratio instead of `unmeasured`
- [x] `tasks/01_the-before-and-after.feature` — the saving is stated as a delta against a re-read pre-70 baseline, through one instrument on both sides, with its sample size and its confounders
- [x] `tasks/02_the-target-is-set-from-what-was-measured.feature` — `work.observability.cacheRatioTarget` is set from the warm measurement, verified by the report stating it, and STATE stops calling it open

## Notes

**Read at the real door at the milestone gate (2026-08-22).** `aof work observe 66/00` reports
`cache ratio: unmeasured`, `unmeasured spend: 1`, verdict `—`. Every other run record in the stream
reports the same. 70/02's reporting is correct and honest, and it has nothing to report.

**The three pieces exist and have never been run together.** 70/01 passes the stable-prefix flag,
the chosen model/effort and the 1-hour TTL; 70/02 reads `cacheRead ÷ cacheCreate` per phase from
68's `spend` buckets; 70/05 makes the brief carry something. No loop has yet run under all of them.

**STATE § Still open already carries this** and it was deferred at refine on purpose: *"The target
value for `cacheRead ÷ cacheCreate` (70/02). The ratio ships with a target mechanism; the number
itself wants one measured run under 70/01's flags to be chosen honestly rather than guessed at
refine."* `work.observability.cacheRatioTarget` is unset, so every phase currently reports verdict
`—`.

**The claim this story has to make answerable.** The SPEC's own figures are the baseline: 927,588
cache-creation tokens per agent spawn, a 316:1 context-in-to-output ratio across six instrumented
milestones, and $5.79 per spawn as cache-creates against $0.46 as cache-reads. None of those has a
measured successor.

**Scope question — SETTLED at refine (2026-08-22). Reading (a): a recorded observation.** Two
readings were open, and they were different stories:
- **(a) A recorded observation.** One or more real runs under the flags, the figures recorded as
  verification evidence, and `work.observability.cacheRatioTarget` set from what was measured.
- **(b) The loop reports its own economics.** The ratio surfaces at the end of a run without anyone
  running a report.

**(a) is this story; (b) is forwarded to milestone 71.** The user story asks for exactly (a) — *one
measured before-and-after from a real run under these flags*. (b) is 70/02's own declared open Gap
(*"the report is read on demand and nothing watches it"*), and a loop that emits its economics at
end-of-round is round discipline — the same boundary ADR-008 draws when it keeps 70 from acting on
the verdict. And the milestone gate's own lesson was that this loop ships code instead of measuring;
growing (b)'s code here would repeat that error in a new costume.

**Consequence, stated plainly: this story authors no production module.** Its deliverables are
evidence — a committed `observability/` snapshot and a recorded before-and-after — plus one config
value. That is the correct shape for it, not an under-delivery.

## Measured at refine (2026-08-22), before the contract was written

Five figures taken on this tree. They changed what the contract says, and the first three change
what `unmeasured` means.

| measured | figure |
|---|---|
| run records under `wiki/work/**/runs/` | **61** |
| of those carrying the `spend` key | **0** — absent, not `null` |
| newest run record | `66/03`, **2026-08-16**, `"brief": {}`, `"sessionId": null` — predates 68's writer |
| run records for milestones 67, 68, 69, 70 | **0** |
| off-switch for `--exclude-dynamic-system-prompt-sections` | **none** — a bare literal at `src/agent-session-driver.mjs:665` |

**So `unmeasured` is not "the buckets came back empty".** It is *the loop has not minted a run since
the writer landed*. 68/01 populates `sessionId`, 68/02 stamps the envelope at settle, 70/02 reads
the ratio — the chain is complete and untried, because milestones 68–70 were built by hand in
interactive sessions, which mint nothing. Nothing is broken here; nothing has been exercised.

**The door matters, and only one of the two declares a phase.** A bare `aof work drive <phase>
<ref>` mints through `transitionRunStart(item, { now })` with **no brief**
(`src/commands/drive.mjs:154-156`), so its spend lands under *no declared phase* — a ratio that
answers nothing. `aof work loop` mints with `brief: { loop: declaration }`, rebuilt per act with
that act's phase (`src/commands/loop.mjs:683, 693`, handed to `transitionRunStart` at `:402`). The
measurement must be taken through the loop door. This is task 00's contract, not a note.

**The "before" is already on disk.** Six pre-70 milestones carry a committed
`observability/report.md` (45, 47, 48, 49, 50, 52), each holding the per-agent
`cache-create`/`cache-read` table that produced the SPEC's figures — so the baseline does not depend
on transcript retention (411 transcripts do also survive, back to 2026-07-19). With no flag
off-switch, that history **is** the before; there is no toggled control to run, and task 01 says so
rather than implying an A/B.

**The instrument must not change mid-comparison.** The per-agent table is transcript-derived
(`src/work-observe.mjs:152-153`) and exists for both eras. The per-phase table is run-record-derived
(70/02) and exists for **no** pre-70 milestone. Pairing a per-agent before with a per-phase after
would be an instrument change wearing the costume of an effect — refused in task 01.

**A green validate proves nothing about the target key.** `work.observability` is declared nowhere
in `schemas/aof.schema.json` (`work` is `additionalProperties: true`), nothing runs Ajv at validate
time, and `aof project doctor` reports `config-valid` regardless (F-07). Per F-09 a string or
negative target renders byte-identically to an absent one. The only evidence the target took is the
report stating it — which is why task 02 verifies the report rather than the config file.

**Sequenced behind 70/01, 70/02 and 70/05** — it measures what those three make true.
