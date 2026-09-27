---
doc: retrospective
updated: 2026-09-13
---
<!--
  Story RETROSPECTIVE.md — the lessons from HOW this story was built and gated, not what it
  delivered (that is OUTCOME.md) and not what was found (that is VERIFICATION.md, referenced here
  and never restated). One `R<n>` per lesson, appended, never renumbered.
-->
# 128 · work memory joins the route table — Retrospective

<!--
  No STATE.md and no FEEDBACK.ndjson exist for this story: it was refined solo and built in one
  main session, and nothing raised an `aof:feedback` entry against it. The inputs here are the
  review round recorded in the shipped code's own headers, and the findings register in
  VERIFICATION.md. The one run record (`runs/node-7297/20260912T192629761Z-0000.json`) carries no
  session id, so `aof work observe` would attribute no agent rows to this ref — an absence of
  evidence, recorded as such rather than left to look like a clean run.
-->

## R1 — a guard that lives in one door does not reach the other

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** the migration
- **Raised by:** the review round, 2026-09-12 (`src/commands/work/memory.mjs` header, `src/work/memory.mjs` header)

**What happened.** The `--help`/`-h` guard lived in `runMemory` — the ladder's in-process entry —
above the verb dispatch. The routed door called the core *below* that entry, so `aof work memory
reindex -h` parsed `-h` as a positional (the spine treats a single-dash token as one), took it as
the REF of a rebuild, and wrote an EMPTY index at exit 0. Measured at review, before it shipped.
**Refs:** VERIFICATION `## Verification evidence` (the `-h` rows); task 00 scenario *a help-seeking
positional reaches no backend*.

**Why.** The migration moved the door and kept the seam — the right cut — but enumerated what the
seam DISPATCHES (five verbs) and not what the old face DID before dispatching (help, the verb
gate). Anything the ladder entry did on the way to the core was, by construction, on a path the
new door did not take.

**Lesson.** When a door is migrated onto a seam, list every act the old entry performed *before*
it reached the core — every guard, every early return — and give each exactly one new home that
BOTH doors traverse: the parse, or one core function. The refine-time test is *"which function
does each door call first, and is the guard above or below it?"* A guard above the shared call
site is a guard one door does not have. The fix here was that shape: help is a boolean the parse
answers, and `runMemoryVerb` answers it before resolving a backend, so neither door can reach a
write with a help request.

## R2 — a line citation pinned mid-story drifted before the story closed, and the control that says so was not in the build lane

- **Kind:** mistake · **Area:** records · **Stage:** review · **Owner:** the story
- **Raised by:** `aof:verify`, by hand and then by `m58/FF-5810` at the gate

**What happened.** The loop record `retrospective-memory-ingest.md` was rewritten at review to
say the surface is now a registered command, and re-pinned four seam line numbers. The same
review round then added the help-guard comments to the seam (R1), and three of the four numbers
moved by three or four lines. `FF-5810` reported the defining-export one (`runMemory` cited at
`:492`, export at `:496`); the two non-defining citations drifted below any control's reach.
**Refs:** VERIFICATION `F-128-A`.

**Why.** Two edits in one review round touched a record and the file it cites, in that order,
and the record was not re-read after the second. The story's build lane ran its own two suites
and the four controls whose lists it moved, but not the control whose SUBJECT its `files:` touch
— a loop record is FF-5810's subject, and FF-5810 was not in the set.

**Lesson.** Re-pin a `file:line` citation as the LAST act before hand-back, never mid-round, and
derive the story's build lane from its `files:` in both directions: the suites that test what it
changed AND the controls whose subject is a file it changed. A loop record in `files:` puts
`FF-5810` in the lane; a bundle member puts the manifest census in it. The cheaper prevention is
the one the record's own actuator already uses — a symbol (`#runMemory`), which cannot drift — but
the record's convention is lines throughout, and changing that convention is a loop-record
decision, not this story's.

## R3 — a story's own scenario asserted a fact about the shared tree, and went red on another lane's file

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** task 01's contract
- **Raised by:** `aof:verify`, on the first run of the story's arch suite

**What happened.** Task 01's scenario *the command module founds the work family, budgeted* pins
"`src/commands/` holds no more direct-child files than its ceiling". At the gate, `src/commands/`
held 68: 128's module was in `src/commands/work/` exactly as declared, and the 68th flat sibling
was `promote.mjs` from the concurrent 127/02 lane. 128's own suite reported 128's placement as
wrong for a file 128 never wrote. **Refs:** VERIFICATION `F-128-B`.

**Why.** The scenario states the whole-tree consequence of the placement decision, which is
right as a description of why the module went where it went, but wrong as a story-scoped
assertion: the tree-wide count already has one owner, `acd-source-directory-budget`, and a second
reader of the same fact inside a story suite bills whichever lane lands a sibling next. Four lanes
were sharing this checkout at the gate; that is the normal case now, not the unlucky one.

**Lesson.** A story-scoped control asserts the story's OWN contribution — "the module is not a
direct child of `src/commands/`; the family row exists with a stated `why`" — and cites the
standing control for the tree-wide bound instead of restating it. At refine, the question is
*"if a concurrent lane adds a file anywhere in this directory, does this scenario go red?"* If
yes, it is asserting the tree, not the story.

## R4 — the memory ingest step promises a story's lessons back, and does not deliver them

- **Kind:** misunderstanding · **Area:** process · **Stage:** verify · **Owner:** the `aof:verify` ritual
- **Raised by:** `aof:verify`, reading the store after `aof work memory ingest` at this gate

**What happened.** Step 5 of the accept ritual runs `aof work memory ingest` "so this item's `R<n>`
entries become recallable". The store went 2369 → 2385 records; the sixteen new ones for 128 are
its `OUTCOME.md` capabilities and gap. None of R1–R3 above is in it, and over the whole live store
**452** lesson records exist with **zero** from a `*_story_*` folder. **Refs:** VERIFICATION
`F-128-G`.

**Why.** Story 85 made a `RETROSPECTIVE.md` mandatory for every story and story 80 widened
`OUTCOME.md` indexing to any item, but the indexer's retrospective predicate stayed
`type === "milestone" && parent == null` — its own comment says *unchanged, still top-level
milestones only*. Two stories moved two halves of the same promise and the ritual's prose
describes the union.

**Lesson.** When a ritual says an artifact becomes recallable, the gate reads the store back by
`--item <ref>` and checks the KIND it expected, not the count going up — sixteen new records looked
like the fold worked, and the kind column is what said which half. Until the indexer is widened,
a story's lessons are folded in when its parent milestone's are, and a parentless story's not at
all; the ritual should say so, and the widening is a story with 80's shape (F-128-G).
