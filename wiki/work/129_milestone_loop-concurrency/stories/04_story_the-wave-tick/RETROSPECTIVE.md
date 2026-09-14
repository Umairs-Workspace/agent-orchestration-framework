---
type: story
doc: retrospective
number: 04
parent: 129
slug: the-wave-tick
title: "Retrospective — the wave tick"
created: 2026-09-14
updated: 2026-09-14
---
# 129/04 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`. The run was not clean
— the 2026-09-13 attempt died before writing anything (the host's sleep, the same species as 03's
loop death #4; attempt 2 resumed the next day as a SOLO build), the review close found 0 Blockers
and fixed two Importants inline, and the accept found two more defects the lane could not see
(`F-48`, `F-49`), both fixed in item with a probe. 03/R3 recurred as written: the family's net is
+1,243 against ADR-008 §3's +750–900, and the number is now a measurement (shell −625, `cycle.mjs`
963, `wave.mjs` 910).

## R1 — A story lane proves the scenarios; only the tier proves the tree, and a stale baseline turns every red into a question

- **Kind:** near-miss · **Area:** process / tooling · **Stage:** build → accept · **Owner:** developer / product-owner · **Raised by:** the accept (`F-48`, `F-50`)

**What happened.** The build was solo, outside the cascade's `work:grade` step, so its run carried
the 2026-09-13 baseline (11 failures, measured in the pre-move tree) and no grade. The review close
ran "the whole `test/loop` index plus every suite importing the changed modules" — 1,671 green — and
called the reds inherited. `69/FF-6907` was red whole-tree the entire time: it is a text scan over
`src/**` that imports nothing, so no import-based selection can reach it. The accept ran
`scripts/test-rubric.mjs` by hand, met 14 reds against a baseline of 11 with only 6 in common, and
had to attribute eight one by one at the source — six to the public-repo move's empty rename map and
130's committed `PLAN.md`, two to this story.

**Why.** "Suites importing the changed modules" is the right selector for behavioural suites and
the wrong one for controls, which reach a module by walking the tree. And a baseline carried from a
dead attempt in another checkout is not a baseline for this tree; it is a list of things that were
once red.

**Lesson.** Every build's terminator runs the tier (`node scripts/test-rubric.mjs` under an
isolated home — four minutes, port-free) beside the story lane, and a solo build runs it itself
since no cascade will. The baseline is re-measured on the accepting tree when the recorded one was
taken elsewhere; a red the baseline does not hold is attributed at the source (`git rev-list`,
`git ls-files`, the failing assertion's own message), never by the date it appeared. Refs: `F-48`,
`F-50`; the `aof-mesh-verify-deploy-loop` rule ("green tests ≠ running system") has a sibling: a
green lane ≠ a green tree.

## R2 — A consumer note routed from the producing story is a contract row in the consuming story, or it is nothing

- **Kind:** mistake · **Area:** contract · **Stage:** refine → build · **Owner:** Three Amigos · **Raised by:** the accept (`F-49`)

**What happened.** `129/03`'s `F-44` named `mergeDispatchLaneHome`'s three THROWN codes and wrote
"consumer notes for the wave: a throw from the merge step is a halt, never a silent skip, and the
two `null`s are a shape the narration must tolerate". Task 02's MERGE rows carried the RETURNED
`refused` and `conflict` shapes only. The build honoured the nulls and let the throws escape: a
`commit-failed` from the primary's own-writes commit would have killed the loop with the wave run
stranded `running`, recoverable only by the next `--resume`'s reclaim. `mergeHome` now reads the
throw as the refusal it is, one row holds it, and the bare verb fails the row.

**Why.** A finding's `routed-to` column is a reminder, not a contract; the row that would have held
the claim was never written, and a build that satisfies every row has no reason to read the
producer's register.

**Lesson.** At refine, every finding routed to a story from its producer becomes an Examples row in
the consuming task — the thrown shapes of a verb the story calls are rows in the outline that names
that verb's step — and the refine session reads the producer's `## Findings` for the story's ref
before the contract is locked. Refs: `F-44`, `F-49`, task 02's outline.

## R3 — Binding a test seam in production opens a door, and the standing control on that door goes into `files:` with the story

- **Kind:** mistake · **Area:** contract / architecture · **Stage:** refine → build · **Owner:** architect / Three Amigos · **Raised by:** the accept (`F-48`)

**What happened.** `ctx.runDispatchLane` was a TEST seam in `dispatch.mjs` (ADR-005 §6 names it as
the one `spawnLaneDrive` mirrors). The wave needed an opener the door's default does not carry
(`advanceTo` per ADR-002 §7, reclaim-first per the 129/04 ruling), so it bound `openLane` onto the
seam in production. That is an admission-path decision under `69/ADR-006`, and `FF-6907` — the
control that guards exactly that path — was neither in `files:` nor in anyone's lane. The Notes had
already named four shell-text controls the story would red "unavoidably" and re-pointed each; this
was the fifth, found only by the tier at the accept. The re-point admits a declared supplier whose
every call sits inside its seam-bound function behind a `work:dispatch` ask, with a self-check row
per leg.

**Why.** The four controls in the Notes were found by asking "which controls read the shell's
text?" — the file being cut. Nobody asked "which controls guard the seam the wave is about to bind?"
— the door being opened.

**Lesson.** When a story binds a `ctx.*` seam that was test-only, or adds a production caller to a
verb another milestone's ADR governs, the refine session greps `test/arch/**` for the verb's name
and declares every control that scans for it in `files:`, with the re-point designed in the Notes
beside the shell-text ones. A control that must admit a new caller admits it by name and reason
(`SUPPLIED_DISPATCH_OPENERS`), so the next supplier is a decision the table records. Refs: `F-48`,
`69/FF-6907`, `129/ADR-005` §6.
