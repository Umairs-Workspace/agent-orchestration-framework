---
type: story
doc: retrospective
number: 04
parent: 119
slug: the-mesh-god-node-is-split
title: "Retrospective — the mesh god-node is split"
created: 2026-09-07
updated: 2026-09-07
---
# 119/04 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — A control that stores a NUMBER about a file is invisible to that file's write-set declaration

- **Kind:** blind spot · **Area:** contract · **Stage:** build · **Owner:** the amigos · **Raised by:** `m119/F-34`

The story's `files:` named four controls it did not know it would write, every one pinning a number
about the file this story shrinks: a sibling count of `src/mesh/`, a reach through it, a
`SINK_CEILING` measured from it, and a name-shape that admitted `FF-\d{4}` while milestone 119 numbers
five digits. The five that WERE declared were found by reading the subject; these four were found only
by running the tree.

**Lesson.** The class is specific and repeatable: the story declares `src/mesh/`, the control declares
a *measurement of* `src/mesh/`, and no path in either declaration overlaps. That matters most for
`--scope impacted`, which selects from the declaration — so a control the declaration cannot see is a
control the story's own test loop cannot run. Two of the four named `119/04` explicitly in their own
prose, so the information existed IN THE CONTROLS and the declaration was simply not derived from
them. The cheap fix at refine: grep the controls for the story's own ref and for the directories it
moves, not just for its filenames.

## R2 — A positive control leg is only loud if it is pinned to the thing it is about

- **Kind:** defect · **Area:** controls · **Stage:** build · **Owner:** architect · **Raised by:** `m119/F-36`

`acd-worker-clone-no-credential-persisted` was written up as HALF silent: `assertStructural` all
negatives (silent), `assertHelperResetControl` positive and therefore loud. It did not red when the
clone left. Its two tokens — `-c credential.helper=` and `GIT_TERMINAL_PROMPT` — are also spelled by
`pushWorktreeBranch`, which stayed in the parent and keeps the same discipline for its own reasons, so
the leg went on finding both in a file that had stopped cloning.

**Lesson.** ADR-003's loud/silent/unfixable trichotomy assumes a positive leg fails when its subject
changes. A SIBLING CONCERN in the same file spelling a control's signature tokens for unrelated reasons
defeats that assumption, and the repair is to pin the positive leg to the subject rather than to the
token: assert the reset and the clone are the SAME argv, and that the subject contains a clone at all.

## R3 — A move is the moment a coverage gap becomes load-bearing

- **Kind:** blind spot · **Area:** testing · **Stage:** review · **Owner:** QA · **Raised by:** `m119/F-38`

Task 01's admission-join Scenario Outline names SIX rows; the delivered suite had FOUR — all four
varying the presence of the two facts. The three it never had vary something else: a marker published
for a DIFFERENT workspaceId, a PRE-workspaceId marker with no key at all, and an unreadable membership
store. All three are real branches, and all three moved in this story.

**Lesson.** This story's whole claim is *"admission answers the same way it answers today"*, and a move
story verifies that claim by re-running the delivered suites over the moved code. Where the delivered
suite is thinner than the contract that cites it, the re-run proves only as much as the suite ever did
— **and it looks exactly as green as full coverage does.** The three rows cost fifteen lines and were
added rather than deferred, because they are the evidence the extraction preserved the join. Carry the
check itself: before trusting a move's green, diff the contract's rows against the suite's cases.

## R4 — A write-set entry that resolves to nothing narrows the test scope silently

- **Kind:** defect · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** `m119/F-35`

The story's `files:` cited five controls at flat `test/arch/acd-*.test.mjs` paths that `119/03` had
removed three commits earlier.

**Lesson.** This is ADR-004's own subject — a cited path resolves only at HEAD — reaching a story's
FRONTMATTER rather than a record document, and it compounds R1: a stale write-set entry and a missing
one narrow `--scope impacted` in the same direction, for different reasons, and neither is loud. The
`reads:`/`files:` axis wants the resolver `119/00` already exported (`m119/F-19`).
