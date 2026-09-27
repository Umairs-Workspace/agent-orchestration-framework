---
type: story
doc: retrospective
number: 02
parent: 124
slug: the-learning-edge-reaches-every-cut
title: "Retrospective — the learning edge reaches every cut"
created: 2026-09-08
updated: 2026-09-08
---
# 124/02 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — The lock was already lying about four shipped files, and nothing compared a recorded hash with disk

- **Kind:** blind spot · **Area:** code · **Stage:** build · **Owner:** the bundle's controls · **Raised by:** developer, regenerating the lock for a six-file change

**What happened.** Regenerating `.aof/aof.lock.json` moved seven hashes; three were shatter's. The
other four — the three pay-debt renders and a loop record — carried hashes that did not match the
bytes on disk, while `aof work update` reported every one "up-to-date": it compares disk against a
fresh render, never against the lock. `acd-bundle-manifest-hashes` hashes its own re-render, and the
lock is not its subject.

**Why.** Two controls look at hashes and neither compares a recorded hash with a file.

**Lesson.** This is the QA finding from refine — the opencode mirror is hashed by nothing — measured
one level wider. Repaired here for the lock's whole path set and asserted by FF-12405 leg 9; the
general control is still owed. Refs: `m124/F-08`.

## R2 — The write set omitted the budget table, for the third time in one milestone

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** the amigos · **Raised by:** developer

**What happened.** The new control under `test/arch/memory/` lands in a layer whose budget row is
at the delivered count; `acd-source-directory-budget` was not in `files:`.

**Why.** See `124/R5`.

**Lesson.** Written as a finding rather than fixed, because the check belongs to whoever owns
FF-11904. Refs: `m124/F-06`.

## R3 — A fixed-line-window slice is a stored fact about a file, and the review caught two

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** the milestone's review

**What happened.** FF-12405's first draft cut the recall block out of `shatter.md` by line window.
The review named it as the species milestone 47's structural review of `47/04` had already
recorded — a control pinned to a line window — and the slices were re-cut structurally: by the
block's own lead sentence and the step heading that ends it.

**Why.** A window is the cheapest slice to write and the first to drift.

**Lesson.** Slice a document by its own landmarks; a line number in a control is a citation that
nobody's sweep will repair. Refs: `m124/F-07`.

## R4 — An invented flag rewrites the question instead of erroring, which is why the control checks flags at test time

- **Kind:** blind spot · **Area:** code · **Stage:** refine · **Owner:** the memory face · **Raised by:** QA at refine

**What happened.** `parseMemoryArgv` skips an unknown flag without consuming its value, so the value
falls into the query; `recall "seam" --scope architecture --block` exits 0 with the question
silently changed. `--block` is real and absent from the help.

**Why.** Out of this story's scope; recorded so the reason FF-12405 asserts every flag against the
parse surface is carried with the control.

**Lesson.** A parser that tolerates unknown flags moves the failure to the reader; until it refuses,
the bundle's recall forms are checked at test time, never at an agent's runtime. Refs: `m124/F-09`.
